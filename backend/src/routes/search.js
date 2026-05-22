const express = require('express');
const router  = express.Router();
const { search, suggestions } = require('../controllers/searchController');
const { optionalAuth } = require('../middleware/auth');

router.get('/',            optionalAuth, search);
router.get('/suggestions', suggestions);

module.exports = router;
