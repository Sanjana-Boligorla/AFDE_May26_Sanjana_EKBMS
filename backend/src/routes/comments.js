const express = require('express');
const router  = express.Router();
const { listComments, addComment, updateComment, deleteComment } = require('../controllers/commentController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/article/:articleId',  optionalAuth, listComments);
router.post('/article/:articleId', protect, addComment);
router.put('/:id',                 protect, updateComment);
router.delete('/:id',              protect, deleteComment);

module.exports = router;
