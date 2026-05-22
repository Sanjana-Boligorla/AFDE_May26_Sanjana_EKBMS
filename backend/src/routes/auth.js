const express  = require('express');
const { body } = require('express-validator');
const router   = express.Router();

const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate    = require('../middleware/validate');

const registerRules = [
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Z])(?=.*[0-9])/)
    .withMessage('Password must include at least one uppercase letter and one number'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordRules = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[A-Z])(?=.*[0-9])/)
    .withMessage('Password must include at least one uppercase letter and one number'),
];

router.post('/register',        registerRules,       validate, register);
router.post('/login',           loginRules,          validate, login);
router.get('/me',               protect,                       getMe);
router.put('/me',               protect,                       updateProfile);
router.put('/change-password',  protect, changePasswordRules,  validate, changePassword);

module.exports = router;
