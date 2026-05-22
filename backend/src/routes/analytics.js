const express  = require('express');
const router   = express.Router();
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const {
  getOverview, getViewsOverTime, getTopArticles, getCategoryStats,
  getSearchKeywords, getAuthorActivity, getEvents, trackEvent, trackSearch,
} = require('../controllers/analyticsController');

// --- Public tracking (optionalAuth so we capture user_id if logged in) ---
router.post('/track',        optionalAuth, trackEvent);
router.post('/search-track', optionalAuth, trackSearch);

// --- Admin/Reviewer analytics ---
router.get('/overview',         protect, authorize('admin','reviewer'), getOverview);
router.get('/views',            protect, authorize('admin','reviewer'), getViewsOverTime);
router.get('/top-articles',     protect, authorize('admin','reviewer'), getTopArticles);
router.get('/categories',       protect, authorize('admin','reviewer'), getCategoryStats);
router.get('/search-keywords',  protect, authorize('admin','reviewer'), getSearchKeywords);
router.get('/authors',          protect, authorize('admin','reviewer'), getAuthorActivity);
router.get('/events',           protect, authorize('admin'),            getEvents);

module.exports = router;
