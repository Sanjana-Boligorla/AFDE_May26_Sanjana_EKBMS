/**
 * ETL Controller
 * Provides HTTP endpoints to trigger and monitor ETL jobs.
 *
 * POST  /api/etl/run          — trigger a job (CSV or JSON upload)
 * GET   /api/etl/jobs         — list all jobs (paginated)
 * GET   /api/etl/jobs/:id     — single job details + logs
 * DELETE /api/etl/jobs/:id    — soft-cancel a pending job
 * POST  /api/etl/rollup       — trigger analytics daily rollup
 */
const path     = require('path');
const pool     = require('../config/db');
const multer   = require('multer');
const { runETLJob } = require('../etl/etlRunner');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// --- Multer for ETL uploads ---
const etlStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ts  = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `etl_${ts}${ext}`);
  },
});
const etlUpload = multer({
  storage: etlStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.json'].includes(ext)) return cb(null, true);
    cb(new Error('Only .csv and .json files are allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ----------------------------------------------------------------
// POST /api/etl/run
// Body: multipart/form-data — field "file" + optional "job_name"
// OR: { "use_default": true } to run the built-in dataset
// ----------------------------------------------------------------
const triggerJob = [
  etlUpload.single('file'),
  async (req, res, next) => {
    try {
      let filePath, jobType;

      if (req.file) {
        filePath = req.file.path;
        jobType  = path.extname(req.file.originalname).toLowerCase() === '.json'
          ? 'json_import'
          : 'csv_import';
      } else if (req.body?.use_default === 'true' || req.body?.use_default === true) {
        filePath = path.resolve(__dirname, '../../../etl-data/articles_dataset.csv');
        jobType  = 'csv_import';
      } else {
        return sendError(res, 'Provide a file upload or set use_default=true', 400);
      }

      const jobName = req.body?.job_name || null;
      const userId  = req.user?.id || null;

      // Run async — respond immediately with jobId
      const jobResult = await pool.query(
        `INSERT INTO etl_jobs (job_name, job_type, status, source_file, triggered_by)
         VALUES (?, ?, 'pending', ?, ?)`,
        [
          jobName || `${jobType} — ${path.basename(filePath)} — ${new Date().toISOString()}`,
          jobType,
          path.basename(filePath),
          userId,
        ]
      );
      const jobId = jobResult[0].insertId;

      // Fire-and-forget (don't await — let it run in background)
      runETLJob({ jobType, filePath, userId, jobName, _existingJobId: jobId })
        .catch(err => console.error(`ETL job ${jobId} failed:`, err.message));

      return sendSuccess(res, { job_id: jobId, status: 'running' },
        'ETL job started. Poll /api/etl/jobs/:id for progress.');
    } catch (err) { next(err); }
  }
];

// ----------------------------------------------------------------
// GET /api/etl/jobs
// ----------------------------------------------------------------
const listJobs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, job_type } = req.query;
    const offset     = (page - 1) * limit;
    const conditions = [];
    const params     = [];

    if (status)   { conditions.push('j.status = ?');   params.push(status); }
    if (job_type) { conditions.push('j.job_type = ?'); params.push(job_type); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM etl_jobs j ${where}`, params
    );
    const [rows] = await pool.query(`
      SELECT
        j.id, j.job_name, j.job_type, j.status,
        j.source_file, j.records_total, j.records_processed,
        j.records_failed, j.records_skipped,
        j.started_at, j.completed_at, j.created_at,
        CONCAT(u.first_name,' ',u.last_name) AS triggered_by_name
      FROM etl_jobs j
      LEFT JOIN users u ON j.triggered_by = u.id
      ${where}
      ORDER BY j.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), Number(offset)]);

    return sendPaginated(res, rows, { page: Number(page), limit: Number(limit), total });
  } catch (err) { next(err); }
};

// ----------------------------------------------------------------
// GET /api/etl/jobs/:id
// ----------------------------------------------------------------
const getJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [jobs] = await pool.query(`
      SELECT j.*,
        CONCAT(u.first_name,' ',u.last_name) AS triggered_by_name
      FROM etl_jobs j
      LEFT JOIN users u ON j.triggered_by = u.id
      WHERE j.id = ?
    `, [id]);

    if (!jobs.length) return sendError(res, 'Job not found', 404);

    const [logs] = await pool.query(
      `SELECT id, level, message, row_number, created_at
       FROM etl_job_logs
       WHERE job_id = ?
       ORDER BY id ASC
       LIMIT 500`,
      [id]
    );

    return sendSuccess(res, { job: jobs[0], logs });
  } catch (err) { next(err); }
};

// ----------------------------------------------------------------
// DELETE /api/etl/jobs/:id  (cancel pending job)
// ----------------------------------------------------------------
const cancelJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [jobs] = await pool.query(
      "SELECT id, status FROM etl_jobs WHERE id = ?", [id]
    );
    if (!jobs.length) return sendError(res, 'Job not found', 404);
    if (jobs[0].status !== 'pending') {
      return sendError(res, 'Only pending jobs can be cancelled', 400);
    }
    await pool.query(
      "UPDATE etl_jobs SET status='cancelled', completed_at=NOW() WHERE id=?", [id]
    );
    return sendSuccess(res, null, 'Job cancelled');
  } catch (err) { next(err); }
};

// ----------------------------------------------------------------
// POST /api/etl/rollup  — compute daily content_analytics
// ----------------------------------------------------------------
const triggerRollup = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Upsert daily rollup from analytics_events
    await pool.query(`
      INSERT INTO content_analytics
        (article_id, date, views, unique_views, avg_time_spent_sec,
         bookmark_adds, comment_adds, rating_submits)
      SELECT
        ae.article_id,
        DATE(ae.created_at)                                       AS date,
        SUM(ae.event_type = 'view')                               AS views,
        COUNT(DISTINCT CASE WHEN ae.event_type='view' THEN ae.user_id END) AS unique_views,
        ROUND(AVG(CASE WHEN ae.event_type='time_on_page' THEN ae.time_spent_sec END),2) AS avg_time,
        SUM(ae.event_type = 'bookmark_add')                       AS bookmark_adds,
        SUM(ae.event_type = 'comment_add')                        AS comment_adds,
        SUM(ae.event_type = 'rating_submit')                      AS rating_submits
      FROM analytics_events ae
      WHERE ae.article_id IS NOT NULL
        AND DATE(ae.created_at) = ?
      GROUP BY ae.article_id, DATE(ae.created_at)
      ON DUPLICATE KEY UPDATE
        views          = VALUES(views),
        unique_views   = VALUES(unique_views),
        avg_time_spent_sec = VALUES(avg_time_spent_sec),
        bookmark_adds  = VALUES(bookmark_adds),
        comment_adds   = VALUES(comment_adds),
        rating_submits = VALUES(rating_submits)
    `, [today]);

    return sendSuccess(res, { date: today }, 'Analytics rollup completed');
  } catch (err) { next(err); }
};

module.exports = { triggerJob, listJobs, getJob, cancelJob, triggerRollup };
