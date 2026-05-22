const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const { listUsers, getUser, createUser, updateUser, updateUserRole, toggleUserStatus, listRoles } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const createUserRules = [
  body('first_name').trim().notEmpty(),
  body('last_name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role_id').isInt({ min: 1 }),
];

router.get('/roles',          protect, listRoles);
router.get('/',               protect, authorize('admin'), listUsers);
router.get('/:id',            protect, authorize('admin'), getUser);
router.post('/',              protect, authorize('admin'), createUserRules, validate, createUser);
router.put('/:id',            protect, authorize('admin'), updateUser);
router.put('/:id/role',       protect, authorize('admin'), updateUserRole);
router.put('/:id/toggle',     protect, authorize('admin'), toggleUserStatus);

module.exports = router;
