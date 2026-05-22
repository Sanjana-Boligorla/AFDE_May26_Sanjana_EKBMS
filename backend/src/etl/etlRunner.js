/**
 * ETL Runner
 * Orchestrates a full import job:
 *   1. Create etl_job record
 *   2. Extract (CSV or JSON)
 *   3. Transform each row
 *   4. Load each article into DB
 *   5. Update etl_job with final stats
 *
 * Usage (direct):
 *   node etlRunner.js --type csv --file ./etl-data/articles_dataset.csv
 *
 * Usage (programmatic):
 *   const { runETLJob } = require('./etlRunner');
 *   await runETLJob({ jobType: 'csv_import', filePath, userId });
 */
const pool                 = require('../config/db');
const { extractCSV }       = require('./extractors/csvExtractor');
const { extractJSON }      = require('./extractors/jsonExtractor');
const { transformArticle } = require('./transformers/articleTransformer');
const { loadArticle, clearCaches } = require('./loaders/dbLoader');
const { clearCache: clearCategoryCache } = require('./transformers/categoryMapper');
const path                 = require('path');

// ----------------------------------------------------------------
// In-DB logger — writes rows to etl_job_logs
// ----------------------------------------------------------------
function createLogger(jobId) {
  const buffer = [];

  async function flush() {
    if (!buffer.length) return;
    const rows = buffer.splice(0);
    await pool.query(
      'INSERT INTO etl_job_logs (job_id, level, message, `row_number`, metadata) VALUES ?',
      [rows.map(r => [jobId, r.level, r.message, r.rowNum || null, r.meta ? JSON.stringify(r.meta) : null])]
    );
  }

  return {
    log(level, message, meta, rowNum) {
      buffer.push({ level, message, meta, rowNum });
      // Auto-flush every 50 entries
      if (buffer.length >= 50) flush().catch(() => {});
    },
    flush,
  };
}

// ----------------------------------------------------------------
// Main runner
// ----------------------------------------------------------------
async function runETLJob({ jobType, filePath, userId = null, jobName = null }) {
  // 1. Create job record
  const name = jobName || `${jobType} — ${path.basename(filePath || '')} — ${new Date().toISOString()}`;
  const [jobResult] = await pool.query(
    `INSERT INTO etl_jobs
       (job_name, job_type, status, source_file, triggered_by, started_at)
     VALUES (?, ?, 'running', ?, ?, NOW())`,
    [name, jobType, filePath ? path.basename(filePath) : null, userId]
  );
  const jobId  = jobResult.insertId;
  const logger = createLogger(jobId);

  logger.log('info', `Job ${jobId} started: ${name}`);

  let total = 0, processed = 0, failed = 0, skipped = 0;

  try {
    // 2. Extract
    let rows = [];
    if (jobType === 'csv_import') {
      rows = extractCSV(filePath, logger);
    } else if (jobType === 'json_import') {
      rows = extractJSON(filePath, logger);
    } else {
      throw new Error(`Unknown jobType: ${jobType}`);
    }
    total = rows.length;

    await pool.query(
      'UPDATE etl_jobs SET records_total = ? WHERE id = ?',
      [total, jobId]
    );

    // 3+4. Transform + Load each row
    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const result = transformArticle(rows[i], logger, rowNum);

      if (!result.ok) {
        logger.log('error', `Row ${rowNum}: transform failed — ${result.error}`, null, rowNum);
        failed++;
        continue;
      }

      const loadResult = await loadArticle(result.data, logger);

      if (loadResult.error) {
        logger.log('error', `Row ${rowNum}: load failed — ${loadResult.error}`, null, rowNum);
        failed++;
      } else if (!loadResult.inserted) {
        logger.log('info', `Row ${rowNum}: skipped (duplicate slug)`, null, rowNum);
        skipped++;
      } else {
        processed++;
      }
    }

    // 5. Finalise
    await logger.flush();
    await pool.query(
      `UPDATE etl_jobs
       SET status = 'completed', records_total = ?, records_processed = ?,
           records_failed = ?, records_skipped = ?, completed_at = NOW()
       WHERE id = ?`,
      [total, processed, failed, skipped, jobId]
    );

    logger.log('info', `Job ${jobId} completed. Processed:${processed} Failed:${failed} Skipped:${skipped}`);
    await logger.flush();

    return { jobId, total, processed, failed, skipped };

  } catch (err) {
    await logger.flush();
    await pool.query(
      `UPDATE etl_jobs
       SET status = 'failed', error_message = ?, completed_at = NOW()
       WHERE id = ?`,
      [err.message, jobId]
    );
    logger.log('error', `Job ${jobId} failed: ${err.message}`);
    await logger.flush();
    throw err;
  } finally {
    clearCaches();
    clearCategoryCache();
  }
}

// ----------------------------------------------------------------
// CLI entry point
// ----------------------------------------------------------------
if (require.main === module) {
  const args   = process.argv.slice(2);
  const typeIdx = args.indexOf('--type');
  const fileIdx = args.indexOf('--file');
  const jobType = typeIdx !== -1 ? args[typeIdx + 1] : 'csv_import';
  const filePath = fileIdx !== -1 ? path.resolve(args[fileIdx + 1])
    : path.resolve(__dirname, '../../../etl-data/articles_dataset.csv');

  console.log(`Running ETL: type=${jobType} file=${filePath}`);

  runETLJob({ jobType, filePath })
    .then(r => { console.log('Done:', r); process.exit(0); })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}

module.exports = { runETLJob };
