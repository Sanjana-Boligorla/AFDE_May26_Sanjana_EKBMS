const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const { listCategories, getCategory, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const rules = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
];

router.get('/',     listCategories);
router.get('/:id',  getCategory);
router.post('/',    protect, authorize('admin'), rules, validate, createCategory);
router.put('/:id',  protect, authorize('admin'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;
