const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const { listTags, createTag, updateTag, deleteTag } = require('../controllers/tagController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/',       listTags);
router.post('/',      protect, authorize('admin','author','hr','support'),
            [body('name').trim().notEmpty().withMessage('Tag name required')], validate, createTag);
router.put('/:id',    protect, authorize('admin'), updateTag);
router.delete('/:id', protect, authorize('admin'), deleteTag);

module.exports = router;
