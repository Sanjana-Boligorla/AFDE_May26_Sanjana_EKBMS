const express = require('express');
const router  = express.Router();
const { getBookmarks, addBookmark, removeBookmark, checkBookmark } = require('../controllers/bookmarkController');
const { protect } = require('../middleware/auth');

router.get('/',                    protect, getBookmarks);
router.get('/check/:articleId',    protect, checkBookmark);
router.post('/:articleId',         protect, addBookmark);
router.delete('/:articleId',       protect, removeBookmark);

module.exports = router;
