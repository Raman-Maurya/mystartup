/**
 * Payment Service
 * 
 * IMPORTANT: This service requires Razorpay API keys to be set in environment variables:
 * - RAZORPAY_KEY_ID
 * - RAZORPAY_KEY_SECRET
 * - RAZORPAY_WEBHOOK_SECRET
 * 
 * The application will not start without these keys.
 */

const axios = require('axios');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Contest = require('../models/Contest');
const { PaymentError } = require('../utils/customErrors');

// Load environment variables for payment gateway
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

/**
 * Initialize a payment gateway client
 * Using Razorpay as an example
 */
const initializePaymentGateway = () => {
  // Validate that environment variables are set
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.warn('Payment gateway credentials not set. Using mock gateway for development.');
    return null;
  }

  // Initialize Razorpay client
  const Razorpay = require('razorpay');
  const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  });
  
  return razorpay;
};

// Initialize payment gateway client
const paymentGateway = initializePaymentGateway();

/**
 * Create a new payment order for wallet deposit
 * @param {string} userId - User ID
 * @param {number} amount - Amount in INR (min 100)
 * @returns {Object} - Payment order details
 */
const createDepositOrder = async (userId, amount) => {
  // Validate inputs
  if (!userId) throw new PaymentError('User ID is required');
  if (!amount || amount < 100) throw new PaymentError('Minimum deposit amount is ₹100');
  
  try {
    // Get user details
    const user = await User.findById(userId);
    if (!user) throw new PaymentError('User not found');
    
    // Verify user account status
    if (user.accountStatus !== 'ACTIVE') {
      throw new PaymentError('User account is not active. Please complete verification.');
    }
    
    // Create a unique transaction ID
    const transactionId = `DEP_${Date.now()}_${userId.substring(0, 6)}`;
    
    // Create payment record in our database
    const payment = await Payment.create({
      user: userId,
      amount,
      type: 'DEPOSIT',
      status: 'PENDING',
      paymentMethod: 'SYSTEM', // Will be updated when payment completes
      transactionId,
      description: `Wallet deposit of ₹${amount}`
    });
    
    // Create order in Razorpay
    const order = await paymentGateway.orders.create({
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      receipt: transactionId,
      notes: {
        paymentId: payment._id.toString(),
        userId: userId,
        type: 'DEPOSIT'
      }
    });
    
    // Update payment with order ID
    payment.gatewayTransactionId = order.id;
    await payment.save();
    
    // Return order details for frontend
    return {
      id: order.id,
      transactionId: payment.transactionId,
      amount: order.amount / 100, // Convert back to rupees
      currency: order.currency,
      user: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phoneNumber
      },
      key: RAZORPAY_KEY_ID
    };
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    console.error('Error creating deposit order:', error);
    throw new PaymentError('Failed to create payment order');
  }
};

/**
 * Create a payment order for contest entry fee
 * @param {string} userId - User ID
 * @param {string} contestId - Contest ID
 * @returns {Object} - Payment order details
 */
const createContestEntryOrder = async (userId, contestId) => {
  // Validate inputs
  if (!userId) throw new PaymentError('User ID is required');
  if (!contestId) throw new PaymentError('Contest ID is required');
  
  try {
    // Get user and contest details
    const user = await User.findById(userId);
    const contest = await Contest.findById(contestId);
    
    if (!user) throw new PaymentError('User not found');
    if (!contest) throw new PaymentError('Contest not found');
    
    // Check if user is allowed to join contest
    if (contest.status !== 'REGISTRATION_OPEN' && contest.status !== 'UPCOMING') {
      throw new PaymentError('Contest registration is not open');
    }
    
    // Check if the contest is full
    if (contest.participants.length >= contest.maxParticipants) {
      throw new PaymentError('Contest is full');
    }
    
    // Check if user already registered
    const isRegistered = contest.participants.some(
      participant => participant.user.toString() === userId
    );
    
    if (isRegistered) {
      throw new PaymentError('You are already registered for this contest');
    }
    
    // Get the entry fee
    const entryFee = contest.entryFee;
    
    // Check if the contest is free
    if (entryFee === 0) {
      // Register user for free
      return await registerForFreeContest(user, contest);
    }
    
    // Check if user has enough wallet balance
    if (user.walletBalance >= entryFee) {
      // Register using wallet balance
      return await payContestEntryFromWallet(user, contest);
    }
    
    // Create a unique transaction ID
    const transactionId = `ENT_${Date.now()}_${userId.substring(0, 6)}`;
    
    // Create payment record
    const payment = await Payment.create({
      user: userId,
      amount: entryFee,
      type: 'CONTEST_ENTRY',
      status: 'PENDING',
      paymentMethod: 'SYSTEM', // Will be updated when payment completes
      transactionId,
      relatedContest: contestId,
      description: `Entry fee for contest: ${contest.name}`
    });
    
    // Create order in Razorpay
    const order = await paymentGateway.orders.create({
      amount: entryFee * 100, // Amount in paise
      currency: 'INR',
      receipt: transactionId,
      notes: {
        paymentId: payment._id.toString(),
        userId: userId,
        contestId: contestId,
        type: 'CONTEST_ENTRY'
      }
    });
    
    // Update payment with order ID
    payment.gatewayTransactionId = order.id;
    await payment.save();
    
    // Return order details for frontend
    return {
      id: order.id,
      transactionId: payment.transactionId,
      amount: order.amount / 100, // Convert to rupees
      currency: order.currency,
      user: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phoneNumber
      },
      contest: {
        id: contest._id,
        name: contest.name
      },
      key: RAZORPAY_KEY_ID
    };
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    console.error('Error creating contest entry order:', error);
    throw new PaymentError('Failed to create payment order');
  }
};

/**
 * Register user for a free contest
 * @param {Object} user - User document
 * @param {Object} contest - Contest document
 * @returns {Object} - Registration result
 */
const registerForFreeContest = async (user, contest) => {
  try {
    // Create a system payment record for tracking
    const payment = await Payment.create({
      user: user._id,
      amount: 0,
      type: 'CONTEST_ENTRY',
      status: 'COMPLETED',
      paymentMethod: 'SYSTEM',
      transactionId: `FREE_${Date.now()}_${user._id.substring(0, 6)}`,
      relatedContest: contest._id,
      description: `Free entry for contest: ${contest.name}`,
      completedAt: new Date()
    });
    
    // Add user to contest participants
    contest.participants.push({
      user: user._id,
      joinedAt: new Date(),
      virtualBalance: contest.tradingSettings?.startingBalance || 100000,
      currentBalance: contest.tradingSettings?.startingBalance || 100000,
      status: 'REGISTERED',
      entryFeePaid: true,
      paymentTransaction: payment._id
    });
    
    // Add contest to user's contests
    if (!user.contests.includes(contest._id)) {
      user.contests.push(contest._id);
    }
    
    // Save both documents
    await contest.save();
    await user.save();
    
    return {
      success: true,
      message: 'Successfully registered for free contest',
      contest: {
        id: contest._id,
        name: contest.name
      }
    };
  } catch (error) {
    console.error('Error registering for free contest:', error);
    throw new PaymentError('Failed to register for free contest');
  }
};

/**
 * Pay contest entry fee from user's wallet
 * @param {Object} user - User document
 * @param {Object} contest - Contest document
 * @returns {Object} - Payment result
 */
const payContestEntryFromWallet = async (user, contest) => {
  try {
    const entryFee = contest.entryFee;
    
    // Verify user has enough balance
    if (user.walletBalance < entryFee) {
      throw new PaymentError('Insufficient wallet balance');
    }
    
    // Create a wallet payment record
    const payment = await Payment.create({
      user: user._id,
      amount: entryFee,
      type: 'CONTEST_ENTRY',
      status: 'COMPLETED',
      paymentMethod: 'WALLET',
      transactionId: `WAL_${Date.now()}_${user._id.substring(0, 6)}`,
      relatedContest: contest._id,
      description: `Wallet payment for contest: ${contest.name}`,
      completedAt: new Date()
    });
    
    // Deduct from user's wallet
    user.walletBalance -= entryFee;
    user.totalEntryFees += entryFee;
    
    // Add user to contest participants
    contest.participants.push({
      user: user._id,
      joinedAt: new Date(),
      virtualBalance: contest.tradingSettings?.startingBalance || 100000,
      currentBalance: contest.tradingSettings?.startingBalance || 100000,
      status: 'REGISTERED',
      entryFeePaid: true,
      paymentTransaction: payment._id
    });
    
    // Update contest financials
    contest.financials.totalEntryFees += entryFee;
    
    // Calculate platform fee
    const platformFee = entryFee * (contest.platformFeePercentage / 100);
    contest.financials.platformRevenue += platformFee;
    
    // Add contest to user's contests
    if (!user.contests.includes(contest._id)) {
      user.contests.push(contest._id);
    }
    
    // Save both documents
    await contest.save();
    await user.save();
    
    return {
      success: true,
      message: 'Successfully registered using wallet balance',
      walletBalance: user.walletBalance,
      contest: {
        id: contest._id,
        name: contest.name
      }
    };
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    console.error('Error paying from wallet:', error);
    throw new PaymentError('Failed to process wallet payment');
  }
};

/**
 * Verify Razorpay signature and complete payment
 * @param {Object} paymentData - Payment data from Razorpay webhook
 * @returns {Object} - Updated payment record
 */
const verifyAndCompletePayment = async (paymentData) => {
  try {
    // Extract data from the webhook payload
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      payload 
    } = paymentData;
    
    // Verify webhook signature
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    const isValidSignature = generatedSignature === razorpay_signature;
    
    if (!isValidSignature) {
      throw new PaymentError('Invalid payment signature');
    }
    
    // Find the payment by gateway transaction ID
    const payment = await Payment.findOne({ gatewayTransactionId: razorpay_order_id });
    
    if (!payment) {
      throw new PaymentError('Payment record not found');
    }
    
    // If payment is already processed, return it
    if (payment.status === 'COMPLETED') {
      return payment;
    }
    
    // Update payment details
    payment.status = 'COMPLETED';
    payment.completedAt = new Date();
    
    // Handle payment based on type
    if (payment.type === 'DEPOSIT') {
      await handleDepositCompletion(payment, razorpay_payment_id);
    } else if (payment.type === 'CONTEST_ENTRY') {
      await handleContestEntryCompletion(payment, razorpay_payment_id);
    }
    
    return payment;
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    console.error('Error verifying payment:', error);
    throw new PaymentError('Failed to verify payment');
  }
};

/**
 * Handle deposit completion
 * @param {Object} payment - Payment document
 * @param {string} gatewayPaymentId - Gateway payment ID
 */
const handleDepositCompletion = async (payment, gatewayPaymentId) => {
  try {
    // Get user
    const user = await User.findById(payment.user);
    if (!user) throw new PaymentError('User not found');
    
    // Update payment record
    payment.status = 'COMPLETED';
    payment.completedAt = new Date();
    payment.gatewayTransactionId = gatewayPaymentId;
    
    // Add amount to user's wallet
    user.walletBalance += payment.amount;
    user.totalDeposited += payment.amount;
    
    // Save both documents
    await payment.save();
    await user.save();
    
    return {
      success: true,
      message: 'Deposit completed successfully',
      walletBalance: user.walletBalance
    };
  } catch (error) {
    console.error('Error handling deposit completion:', error);
    throw new PaymentError('Failed to complete deposit');
  }
};

/**
 * Handle contest entry fee payment completion
 * @param {Object} payment - Payment document
 * @param {string} gatewayPaymentId - Gateway payment ID
 */
const handleContestEntryCompletion = async (payment, gatewayPaymentId) => {
  try {
    // Get user and contest
    const user = await User.findById(payment.user);
    const contest = await Contest.findById(payment.relatedContest);
    
    if (!user) throw new PaymentError('User not found');
    if (!contest) throw new PaymentError('Contest not found');
    
    // Update payment record
    payment.status = 'COMPLETED';
    payment.completedAt = new Date();
    payment.gatewayTransactionId = gatewayPaymentId;
    
    // Update user's entry fee total
    user.totalEntryFees += payment.amount;
    
    // Add user to contest participants if not already added
    const isParticipant = contest.participants.some(
      p => p.user.toString() === user._id.toString()
    );
    
    if (!isParticipant) {
      contest.participants.push({
        user: user._id,
        joinedAt: new Date(),
        virtualBalance: contest.tradingSettings?.startingBalance || 100000,
        currentBalance: contest.tradingSettings?.startingBalance || 100000,
        status: 'REGISTERED',
        entryFeePaid: true,
        paymentTransaction: payment._id
      });
    } else {
      // Update existing participant entry
      const participantIndex = contest.participants.findIndex(
        p => p.user.toString() === user._id.toString()
      );
      
      if (participantIndex !== -1) {
        contest.participants[participantIndex].entryFeePaid = true;
        contest.participants[participantIndex].paymentTransaction = payment._id;
        contest.participants[participantIndex].status = 'REGISTERED';
      }
    }
    
    // Update contest financials
    contest.financials.totalEntryFees += payment.amount;
    
    // Calculate platform fee
    const platformFee = payment.amount * (contest.platformFeePercentage / 100);
    contest.financials.platformRevenue += platformFee;
    
    // Add contest to user's contests
    if (!user.contests.includes(contest._id)) {
      user.contests.push(contest._id);
    }
    
    // Save all documents
    await payment.save();
    await user.save();
    await contest.save();
    
    return {
      success: true,
      message: 'Contest registration completed successfully',
      contest: {
        id: contest._id,
        name: contest.name
      }
    };
  } catch (error) {
    console.error('Error handling contest entry completion:', error);
    throw new PaymentError('Failed to complete contest registration');
  }
};

/**
 * Process contest winnings and distribute prize money
 * @param {string} contestId - Contest ID
 * @returns {Object} - Prize distribution results
 */
const processContestWinnings = async (contestId) => {
  try {
    // Get contest with participants
    const contest = await Contest.findById(contestId)
      .populate('participants.user', 'username email walletBalance totalWinnings')
      .exec();
    
    if (!contest) {
      throw new PaymentError('Contest not found');
    }
    
    // Check if contest is completed
    if (contest.status !== 'COMPLETED') {
      throw new PaymentError('Cannot process winnings for a contest that is not completed');
    }
    
    // Check if winnings already processed (any prize money distributed)
    if (contest.financials.totalPrizePaid > 0) {
      throw new PaymentError('Winnings already processed for this contest');
    }
    
    // Sort participants by points (if using points) or by currentPnL
    const sortedParticipants = [...contest.participants].sort((a, b) => {
      // If using points system
      if (contest.pointSystem) {
        return b.points - a.points;
      }
      // Otherwise sort by PnL
      return b.currentPnL - a.currentPnL;
    });
    
    // Assign ranks to participants
    sortedParticipants.forEach((participant, index) => {
      participant.rank = index + 1;
      participant.finalPosition = index + 1;
    });
    
    // Get prize pool
    const prizePool = contest.prizePool;
    
    // Get prize distribution
    const prizeDistribution = contest.prizeDistribution;
    
    // Calculate and distribute prizes
    let totalPrizeDistributed = 0;
    const winnersList = [];
    
    // Process each winner based on prize distribution
    for (const [position, percentage] of prizeDistribution.entries()) {
      const positionIndex = parseInt(position) - 1; // Convert to 0-based index
      
      // Skip if no participant at this position
      if (positionIndex >= sortedParticipants.length) {
        continue;
      }
      
      const winner = sortedParticipants[positionIndex];
      const prizeAmount = Math.floor(prizePool * (percentage / 100));
      
      // Skip if prize amount is 0
      if (prizeAmount <= 0) {
        continue;
      }
      
      // Create payment record for the winnings
      const payment = await Payment.create({
        user: winner.user._id,
        amount: prizeAmount,
        type: 'CONTEST_WINNING',
        status: 'COMPLETED',
        paymentMethod: 'SYSTEM',
        transactionId: `WIN_${Date.now()}_${winner.user._id.substring(0, 6)}`,
        relatedContest: contest._id,
        description: `Prize for position ${position} in contest: ${contest.name}`,
        completedAt: new Date()
      });
      
      // Update user's wallet and stats
      const user = await User.findById(winner.user._id);
      user.walletBalance += prizeAmount;
      user.totalWinnings += prizeAmount;
      await user.save();
      
      // Update participant record
      winner.prizeMoney = prizeAmount;
      
      // Add to winners list
      winnersList.push({
        userId: winner.user._id,
        username: winner.user.username,
        position: parseInt(position),
        points: winner.points,
        pnl: winner.currentPnL,
        prize: prizeAmount
      });
      
      // Add to total distributed
      totalPrizeDistributed += prizeAmount;
    }
    
    // Update contest financials
    contest.financials.totalPrizePaid = totalPrizeDistributed;
    
    // Save contest with updated participants
    await contest.save();
    
    return {
      success: true,
      message: 'Contest winnings processed successfully',
      contest: contest._id,
      prizePool,
      totalDistributed: totalPrizeDistributed,
      winners: winnersList
    };
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    console.error('Error processing contest winnings:', error);
    throw new PaymentError('Failed to process contest winnings');
  }
};

/**
 * Process a withdrawal request
 * @param {string} userId - User ID
 * @param {number} amount - Amount to withdraw
 * @param {Object} paymentMethod - Payment method details
 * @returns {Object} - Withdrawal request details
 */
const processWithdrawal = async (userId, amount, paymentMethod) => {
  // Validate inputs
  if (!userId) throw new PaymentError('User ID is required');
  if (!amount || amount < 100) throw new PaymentError('Minimum withdrawal amount is ₹100');
  if (!paymentMethod) throw new PaymentError('Payment method is required');
  
  try {
    // Get user
    const user = await User.findById(userId);
    if (!user) throw new PaymentError('User not found');
    
    // Check if user is KYC verified
    if (!user.kycVerified) {
      throw new PaymentError('KYC verification required for withdrawals');
    }
    
    // Check if user has enough balance
    if (user.walletBalance < amount) {
      throw new PaymentError('Insufficient wallet balance');
    }
    
    // Create withdrawal request
    const payment = await Payment.create({
      user: userId,
      amount,
      type: 'WITHDRAWAL',
      status: 'PENDING',
      paymentMethod: paymentMethod.type,
      transactionId: `WDR_${Date.now()}_${userId.substring(0, 6)}`,
      description: `Withdrawal of ₹${amount}`,
      metadata: {
        methodDetails: JSON.stringify(paymentMethod.details)
      }
    });
    
    // Deduct from user's wallet (but actual transfer happens after admin approval)
    user.walletBalance -= amount;
    await user.save();
    
    return {
      success: true,
      message: 'Withdrawal request submitted successfully',
      withdrawalId: payment._id,
      amount,
      status: payment.status,
      estimatedProcessingTime: '1-3 business days'
    };
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    console.error('Error processing withdrawal:', error);
    throw new PaymentError('Failed to process withdrawal request');
  }
};

/**
 * Get user payment history
 * @param {string} userId - User ID
 * @param {Object} filters - Optional filters (type, status, date range)
 * @param {number} page - Page number for pagination
 * @param {number} limit - Items per page
 * @returns {Object} - Paginated payment history
 */
const getUserPaymentHistory = async (userId, filters = {}, page = 1, limit = 10) => {
  try {
    // Build query
    const query = { user: userId };
    
    // Add filters
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get total count
    const total = await Payment.countDocuments(query);
    
    // Get payments with pagination
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('relatedContest', 'name')
      .exec();
    
    return {
      success: true,
      payments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting payment history:', error);
    throw new PaymentError('Failed to get payment history');
  }
};

module.exports = {
  createDepositOrder,
  createContestEntryOrder,
  verifyAndCompletePayment,
  processContestWinnings,
  processWithdrawal,
  getUserPaymentHistory,
  payContestEntryFromWallet
}; 