const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { triggerJob, listJobs, getJob, cancelJob, triggerRollup } = require('../controllers/etlController');

router.post('/run',            protect, authorize('admin'), triggerJob);
router.post('/rollup',         protect, authorize('admin'), triggerRollup);
router.get('/jobs',            protect, authorize('admin'), listJobs);
router.get('/jobs/:id',        protect, authorize('admin'), getJob);
router.delete('/jobs/:id',     protect, authorize('admin'), cancelJob);

module.exports = router;
