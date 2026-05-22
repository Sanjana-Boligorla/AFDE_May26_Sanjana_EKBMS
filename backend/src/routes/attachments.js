const express = require('express');
const router  = express.Router();
const upload  = require('../config/multer');
const { uploadAttachment, downloadAttachment, deleteAttachment, listAttachments } = require('../controllers/attachmentController');
const { protect, authorize } = require('../middleware/auth');

router.get('/article/:articleId',    protect, listAttachments);
router.post('/article/:articleId',   protect, authorize('admin','author','hr','support'), upload.single('file'), uploadAttachment);
router.get('/:id/download',          downloadAttachment);
router.delete('/:id',                protect, deleteAttachment);

module.exports = router;
