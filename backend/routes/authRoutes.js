const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', protect, authController.getProfile);

// Temporary routes until full implementation
router.post('/verify-email', (req, res) => {
  // Temporary implementation until fully created
  res.status(200).json({ success: true, message: 'Email verification endpoint' });
});

router.post('/forgot-password', (req, res) => {
  // Temporary implementation until fully created
  res.status(200).json({ success: true, message: 'Forgot password endpoint' });
});

router.post('/reset-password', (req, res) => {
  // Temporary implementation until fully created
  res.status(200).json({ success: true, message: 'Reset password endpoint' });
});

module.exports = router; 