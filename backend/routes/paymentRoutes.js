const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const PaymentController = require('../controllers/paymentController');

// Deposit routes
router.post('/deposit', authenticateUser, PaymentController.createDepositOrder);
router.post('/deposit/verify', authenticateUser, PaymentController.verifyDeposit);

// Contest entry routes
router.post('/contest-entry/:contestId', authenticateUser, PaymentController.createContestEntryOrder);
router.post('/contest-entry/verify', authenticateUser, PaymentController.verifyContestEntry);

// Withdrawal routes
router.post('/withdraw', authenticateUser, PaymentController.requestWithdrawal);
router.get('/withdraw/methods', authenticateUser, PaymentController.getWithdrawalMethods);

// Payment history
router.get('/history', authenticateUser, PaymentController.getPaymentHistory);

// Razorpay webhook for payment notifications
router.post('/razorpay-webhook', PaymentController.handleRazorpayWebhook);

module.exports = router; 