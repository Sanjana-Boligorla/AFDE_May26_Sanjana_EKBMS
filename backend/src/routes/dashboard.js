const express = require('express');
const router  = express.Router();
const { getStats, getPopularArticles, getRecentArticles, getPendingApprovals, getCategoryStats } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

router.get('/stats',          protect, getStats);
router.get('/popular',        protect, getPopularArticles);
router.get('/recent',         protect, getRecentArticles);
router.get('/pending',        protect, authorize('admin','reviewer'), getPendingApprovals);
router.get('/category-stats', protect, getCategoryStats);

module.exports = router;
