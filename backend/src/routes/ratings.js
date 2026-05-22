const express = require('express');
const router  = express.Router();
const { rateArticle, getArticleRatings } = require('../controllers/ratingController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/article/:articleId',  optionalAuth, getArticleRatings);
router.post('/article/:articleId', protect, rateArticle);

module.exports = router;
