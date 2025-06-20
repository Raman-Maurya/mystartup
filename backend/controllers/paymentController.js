const paymentService = require('../services/paymentService');
const { PaymentError } = require('../utils/customErrors');
const User = require('../models/User');

/**
 * Payment Controller
 * Handles all payment-related API endpoints
 */

/**
 * Create a deposit order
 * @route POST /api/payments/deposit
 */
const createDepositOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;
    
    if (!amount) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }
    
    const order = await paymentService.createDepositOrder(userId, amount);
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Deposit order creation error:', error);
    const statusCode = error instanceof PaymentError ? 400 : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

/**
 * Verify a deposit payment
 * @route POST /api/payments/deposit/verify
 */
const verifyDeposit = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    
    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'All payment verification fields are required' });
    }
    
    const result = await paymentService.verifyAndCompletePayment({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      payload: req.body
    });
    
    res.status(200).json({ success: true, payment: result });
  } catch (error) {
    console.error('Payment verification error:', error);
    const statusCode = error instanceof PaymentError ? 400 : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

/**
 * Create a contest entry order
 * @route POST /api/payments/contest-entry/:contestId
 */
const createContestEntryOrder = async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user.id;
    
    if (!contestId) {
      return res.status(400).json({ success: false, message: 'Contest ID is required' });
    }
    
    const order = await paymentService.createContestEntryOrder(userId, contestId);
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Contest entry order creation error:', error);
    const statusCode = error instanceof PaymentError ? 400 : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

/**
 * Verify a contest entry payment
 * @route POST /api/payments/contest-entry/verify
 */
const verifyContestEntry = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    
    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'All payment verification fields are required' });
    }
    
    const result = await paymentService.verifyAndCompletePayment({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      payload: req.body
    });
    
    res.status(200).json({ success: true, payment: result });
  } catch (error) {
    console.error('Payment verification error:', error);
    const statusCode = error instanceof PaymentError ? 400 : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

/**
 * Request a withdrawal
 * @route POST /api/payments/withdraw
 */
const requestWithdrawal = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const userId = req.user.id;
    
    if (!amount || !paymentMethod) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount and payment method are required' 
      });
    }
    
    const withdrawal = await paymentService.processWithdrawal(userId, amount, paymentMethod);
    res.status(200).json({ success: true, withdrawal });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    const statusCode = error instanceof PaymentError ? 400 : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

/**
 * Get user's saved payment methods for withdrawals
 * @route GET /api/payments/withdraw/methods
 */
const getWithdrawalMethods = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's payment methods from database
    const user = await User.findById(userId).select('paymentMethods');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      paymentMethods: user.paymentMethods || [] 
    });
  } catch (error) {
    console.error('Error getting withdrawal methods:', error);
    res.status(500).json({ success: false, message: 'Failed to get withdrawal methods' });
  }
};

/**
 * Get user's payment history
 * @route GET /api/payments/history
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, type, status, dateFrom, dateTo } = req.query;
    
    const filters = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    
    const history = await paymentService.getUserPaymentHistory(
      userId,
      filters,
      parseInt(page),
      parseInt(limit)
    );
    
    res.status(200).json(history);
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({ success: false, message: 'Failed to get payment history' });
  }
};

/**
 * Handle Razorpay webhook notifications
 * @route POST /api/payments/razorpay-webhook
 */
const handleRazorpayWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const webhookSignature = req.headers['x-razorpay-signature'];
    
    if (!webhookSignature) {
      return res.status(400).json({ success: false, message: 'Missing webhook signature' });
    }
    
    // Process the webhook event
    const eventType = req.body.event;
    console.log('Received Razorpay webhook:', eventType);
    
    // Handle different event types
    switch (eventType) {
      case 'payment.authorized':
        // Payment has been authorized but not captured yet
        console.log('Payment authorized:', req.body.payload.payment.entity.id);
        break;
        
      case 'payment.captured':
        // Payment has been captured
        await paymentService.verifyAndCompletePayment({
          razorpay_payment_id: req.body.payload.payment.entity.id,
          razorpay_order_id: req.body.payload.payment.entity.order_id,
          razorpay_signature: webhookSignature,
          payload: req.body
        });
        console.log('Payment captured and processed');
        break;
        
      case 'payment.failed':
        // Payment has failed
        console.log('Payment failed:', req.body.payload.payment.entity.id);
        // Handle failed payment (update status in database)
        break;
        
      default:
        console.log('Unhandled webhook event:', eventType);
    }
    
    // Always return 200 to acknowledge receipt
    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Webhook handling error:', error);
    // Still return 200 to prevent Razorpay from retrying
    res.status(200).json({ success: true, message: 'Webhook received with errors' });
  }
};

module.exports = {
  createDepositOrder,
  verifyDeposit,
  createContestEntryOrder,
  verifyContestEntry,
  requestWithdrawal,
  getWithdrawalMethods,
  getPaymentHistory,
  handleRazorpayWebhook
}; 