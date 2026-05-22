const express = require('express');
const router  = express.Router();
const { listApprovals, assignReviewer, approveArticle, rejectArticle, requestRevision } = require('../controllers/approvalController');
const { protect, authorize } = require('../middleware/auth');

router.get('/',              protect, authorize('admin','reviewer'), listApprovals);
router.put('/:id/assign',    protect, authorize('admin'),            assignReviewer);
router.put('/:id/approve',   protect, authorize('admin','reviewer'), approveArticle);
router.put('/:id/reject',    protect, authorize('admin','reviewer'), rejectArticle);
router.put('/:id/revision',  protect, authorize('admin','reviewer'), requestRevision);

module.exports = router;
