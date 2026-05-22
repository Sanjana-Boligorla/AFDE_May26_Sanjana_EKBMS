const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');

const {
  listArticles, myArticles, getArticle, createArticle,
  updateArticle, deleteArticle, submitForReview,
  publishArticle, archiveArticle, getVersions,
} = require('../controllers/articleController');

const { protect, authorize, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const articleRules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 500 }),
  body('content').notEmpty().withMessage('Content is required'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category is required'),
  body('visibility').optional().isIn(['public','internal','private']),
  body('tag_ids').optional().isArray(),
];

// Public / optional-auth
router.get('/',      optionalAuth, listArticles);
router.get('/my',    protect, myArticles);
router.get('/:id',   optionalAuth, getArticle);
router.get('/:id/versions', protect, getVersions);

// Author / admin
router.post('/',           protect, authorize('admin','author','hr','support'), articleRules, validate, createArticle);
router.put('/:id',         protect, authorize('admin','author','hr','support'), updateArticle);
router.delete('/:id',      protect, authorize('admin','author','hr','support'), deleteArticle);

// Workflow actions
router.post('/:id/submit',  protect, authorize('admin','author','hr','support'), submitForReview);
router.post('/:id/publish', protect, authorize('admin','reviewer','support'),    publishArticle);
router.post('/:id/archive', protect, authorize('admin','reviewer'),              archiveArticle);

module.exports = router;
