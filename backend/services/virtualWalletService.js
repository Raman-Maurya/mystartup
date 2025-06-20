const Contest = require('../models/Contest');
const User = require('../models/User');
const { VirtualWalletError, InsufficientFundsError, ResourceNotFoundError } = require('../utils/customErrors');

/**
 * Virtual Wallet Service
 * Handles operations related to virtual wallets in contests
 */

/**
 * Initialize a virtual wallet for a user in a contest
 * @param {string} userId - The user ID
 * @param {string} contestId - The contest ID
 * @returns {object} - The initialized virtual wallet
 */
const initializeVirtualWallet = async (userId, contestId) => {
  // Find the contest
  const contest = await Contest.findById(contestId);
  if (!contest) {
    throw new ResourceNotFoundError('Contest', contestId);
  }
  
  // Check if user is already a participant
  const existingParticipant = contest.participants.find(p => p.user.toString() === userId);
  if (existingParticipant) {
    return {
      virtualBalance: existingParticipant.virtualBalance,
      currentPnL: existingParticipant.currentPnL,
      contestId
    };
  }
  
  // Set initial virtual balance based on contest type
  const contestType = contest.maxParticipants >= 500 ? 'mega' : 'standard';
  const initialBalance = contestType === 'mega' ? 79999 : 50000;
  
  // Add user to contest with virtual wallet
  contest.participants.push({
    user: userId,
    joinedAt: new Date(),
    virtualBalance: initialBalance,
    currentBalance: initialBalance,
    trades: [],
    currentPnL: 0,
    points: 0
  });
  
  await contest.save();
  
  return {
    virtualBalance: initialBalance,
    currentPnL: 0,
    contestId
  };
};

/**
 * Get a user's virtual wallet balance for a specific contest
 * @param {string} userId - The user ID
 * @param {string} contestId - The contest ID
 * @returns {object} - The virtual wallet details
 */
const getVirtualWalletBalance = async (userId, contestId) => {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    throw new ResourceNotFoundError('Contest', contestId);
  }
  
  const participant = contest.participants.find(p => p.user.toString() === userId);
  if (!participant) {
    throw new ResourceNotFoundError('Participant');
  }
  
  return {
    virtualBalance: participant.virtualBalance,
    initialBalance: contestId >= 500 ? 79999 : 50000,
    currentPnL: participant.currentPnL,
    points: participant.points,
    contestId
  };
};

/**
 * Update a user's virtual wallet balance after a trade
 * @param {string} userId - The user ID
 * @param {string} contestId - The contest ID
 * @param {string} tradeType - The trade type (BUY/SELL)
 * @param {number} amount - The trade amount
 * @param {number} pnl - The profit/loss from the trade
 * @returns {object} - The updated virtual wallet
 */
const updateVirtualWalletBalance = async (userId, contestId, tradeType, amount, pnl = 0) => {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    throw new ResourceNotFoundError('Contest', contestId);
  }
  
  const participantIndex = contest.participants.findIndex(p => p.user.toString() === userId);
  if (participantIndex === -1) {
    throw new ResourceNotFoundError('Participant');
  }
  
  const participant = contest.participants[participantIndex];
  
  // Handle different trade types
  if (tradeType === 'BUY') {
    // Check if there's enough balance
    if (participant.virtualBalance < amount) {
      throw new InsufficientFundsError(`Insufficient virtual balance: ${participant.virtualBalance} < ${amount}`);
    }
    // Deduct from virtual balance
    participant.virtualBalance -= amount;
  } else if (tradeType === 'SELL' || tradeType === 'CLOSE') {
    // Add to virtual balance
    participant.virtualBalance += amount;
  }
  
  // Update P&L if provided
  if (pnl !== 0) {
    participant.currentPnL += pnl;
  }
  
  // Save the updated contest
  await contest.save();
  
  return {
    virtualBalance: participant.virtualBalance,
    currentPnL: participant.currentPnL,
    contestId
  };
};

/**
 * Get all virtual wallets for a user
 * @param {string} userId - The user ID
 * @returns {Array} - List of user's virtual wallets across all contests
 */
const getUserVirtualWallets = async (userId) => {
  // Find all contests where the user is a participant
  const contests = await Contest.find({
    'participants.user': userId
  }).select('name status startDate endDate participants');
  
  return contests.map(contest => {
    const participant = contest.participants.find(p => p.user.toString() === userId);
    
    return {
      contestId: contest._id,
      contestName: contest.name,
      status: contest.status,
      startDate: contest.startDate,
      endDate: contest.endDate,
      virtualBalance: participant.virtualBalance,
      initialBalance: contest.maxParticipants >= 500 ? 79999 : 50000,
      currentPnL: participant.currentPnL,
      points: participant.points
    };
  });
};

module.exports = {
  initializeVirtualWallet,
  getVirtualWalletBalance,
  updateVirtualWalletBalance,
  getUserVirtualWallets
}; 