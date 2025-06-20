const Contest = require('../models/Contest');
const User = require('../models/User');
const Trade = require('../models/Trade');
const marketDataService = require('../services/marketDataService');
const pointsService = require('../services/pointsService');
const Payment = require('../models/Payment');

// Helper function to handle prefixed contest IDs
const handlePrefixedContestId = (contestId) => {
  if (contestId && contestId.includes('-')) {
    const parts = contestId.split('-');
    // Use the last part as the actual MongoDB ObjectId
    const extractedId = parts[parts.length - 1];
    console.log(`Extracted ObjectId from prefixed contest ID: ${extractedId}`);
    return extractedId;
  }
  return contestId;
};

exports.createContest = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      entryFee,
      maxParticipants,
      minParticipants,
      startDate,
      endDate,
      prizePool,
      prizeDistribution,
      contestType,
      category,
      status,
      virtualMoneyAmount,
      tradingSettings,
      isPublished
    } = req.body;
    
    // Basic validation
    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date'
      });
    }
    
    // Set default virtual money based on contest size if not provided
    const defaultVirtualMoney = maxParticipants >= 500 ? 79999 : 50000;
    
    // Create contest
    const contest = new Contest({
      name,
      description,
      entryFee: contestType === 'FREE' ? 0 : entryFee,
      maxParticipants,
      minParticipants: minParticipants || 2,
      startDate,
      endDate,
      prizePool: contestType === 'FREE' ? 0 : prizePool,
      prizeDistribution,
      contestType,
      category,
      status: status || 'UPCOMING',
      createdBy: userId,
      virtualMoneyAmount: virtualMoneyAmount || defaultVirtualMoney,
      isPublished: isPublished !== undefined ? isPublished : true,
      tradingSettings: {
        maxTradesPerUser: tradingSettings?.maxTradesPerUser || 5,
        maxOpenPositions: tradingSettings?.maxOpenPositions || 2,
        maxPositionSize: tradingSettings?.maxPositionSize || 50
      }
    });
    
    await contest.save();
    
    res.status(201).json({
      success: true,
      data: contest,
      refreshNeeded: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getUserContests = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find contests where the user is a participant
    const contests = await Contest.find({ 'participants.user': userId })
      .select('-participants._id -participants.trades')
      .lean();
    
    if (!contests || contests.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }
    
    // Process each contest to extract user-specific information
    const userContests = contests.map(contest => {
      // Find the user's participant object
      const userParticipant = contest.participants.find(
        p => p.user.toString() === userId
      );
      
      // Return contest with user's specific data
      return {
        _id: contest._id,
        name: contest.name,
        description: contest.description,
        category: contest.category,
        instrumentType: contest.instrumentType,
        startDate: contest.startDate,
        endDate: contest.endDate,
        entryFee: contest.entryFee,
        prizePool: contest.prizePool,
        status: contest.status,
        image: contest.image,
        contestType: contest.contestType,
        pnl: userParticipant ? userParticipant.currentPnL : 0,
        virtualBalance: userParticipant ? userParticipant.virtualBalance : 0,
        points: userParticipant ? userParticipant.points : 0,
        trades: userParticipant ? userParticipant.trades.length : 0,
        joinedAt: userParticipant ? userParticipant.joinedAt : null,
        // Calculate rank if needed (we'd need to sort all participants first)
        currentRank: null,
        prizeMoney: userParticipant ? userParticipant.prizeMoney || 0 : 0
      };
    });
    
    res.status(200).json({ success: true, data: userContests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.joinContest = async (req, res) => {
  try {
    let { contestId } = req.params;
    const userId = req.user.id;
    
    // Handle contest IDs with prefixes
    contestId = handlePrefixedContestId(contestId);
    
    // Find the contest
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }
    
    // Check if contest is open for registration
    if (contest.status !== 'UPCOMING' && contest.status !== 'REGISTRATION_OPEN' && contest.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Contest is not open for registration' });
    }
    
    // Check if contest is full
    if (contest.participants.length >= contest.maxParticipants) {
      // If contest is full, auto-create a new similar contest
      try {
        const newContest = new Contest({
          name: contest.name,
          description: contest.description,
          entryFee: contest.entryFee,
          maxParticipants: contest.maxParticipants,
          startDate: new Date(),
          endDate: new Date(Date.now() + (contest.endDate - contest.startDate)),
          prizePool: contest.prizePool,
          prizeDistribution: contest.prizeDistribution,
          contestType: contest.contestType,
          status: 'UPCOMING',
          category: contest.category,
          stockCategory: contest.stockCategory,
          virtualMoneyAmount: contest.virtualMoneyAmount,
          tradingSettings: contest.tradingSettings
        });
        
        await newContest.save();
        
        return res.status(400).json({ 
          success: false, 
          error: 'Contest is full', 
          newContestId: newContest._id,
          message: 'A new similar contest has been created for you'
        });
      } catch (error) {
        console.error('Error creating new contest:', error);
        return res.status(400).json({ success: false, error: 'Contest is full' });
      }
    }
    
    // Check if user already joined
    const alreadyJoined = contest.participants.some(p => p.user.toString() === userId);
    if (alreadyJoined) {
      return res.status(400).json({ success: false, error: 'Already joined this contest' });
    }
    
    const user = await User.findById(userId);
    
    // Check if user has enough balance for paid contests
    if (contest.entryFee > 0 && user.walletBalance < contest.entryFee) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient balance',
        message: `You need ₹${contest.entryFee} in your wallet to join this contest.`
      });
    }
    
    // Variable to store payment reference
    let payment = null;
    
    // Deduct entry fee for paid contests
    if (contest.entryFee > 0) {
      user.walletBalance -= contest.entryFee;
      user.totalEntryFees += contest.entryFee;
      
      // Record this transaction
      payment = new Payment({
        user: userId,
        amount: contest.entryFee,
        type: 'CONTEST_ENTRY',
        status: 'COMPLETED',
        paymentMethod: 'SYSTEM',
        relatedContest: contestId,
        description: `Entry fee for contest: ${contest.name}`,
        completedAt: new Date()
      });
      
      await payment.save();
      await user.save();
    }
    
    // Use the contest's virtualMoneyAmount if available, otherwise use the default based on contest size
    const initialBalance = contest.virtualMoneyAmount || (contest.maxParticipants >= 500 ? 79999 : 50000);
    
    // Add user to contest
    contest.participants.push({
      user: userId,
      joinedAt: new Date(),
      virtualBalance: initialBalance,
      currentBalance: initialBalance,
      trades: [],
      currentPnL: 0,
      points: 0,
      entryFeePaid: contest.entryFee > 0,
      paymentTransaction: payment ? payment._id : null
    });
    
    // Add contest to user's contests list
    if (!user.contests.includes(contestId)) {
      user.contests.push(contestId);
      await user.save();
    }
    
    await contest.save();
    
    res.status(200).json({ 
      success: true, 
      data: {
        contest,
        walletBalance: user.walletBalance,
        virtualAmount: initialBalance,
        message: `You have successfully joined the contest with ₹${initialBalance} virtual money!`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    let { contestId } = req.params;
    
    console.log(`Getting leaderboard for contest: ${contestId}`);
    
    // Handle contest IDs with prefixes like "new-"
    contestId = handlePrefixedContestId(contestId);
    
    const contest = await Contest.findById(contestId)
      .populate('participants.user', 'username profilePicture');
    
    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }
    
    // Get all trades for this contest including open trades to calculate real-time PnL
    const trades = await Trade.find({ contest: contestId })
      .populate('user', 'username profilePicture')
      .lean();
    
    console.log(`Found ${trades.length} trades for contest ${contestId}`);
    
    // Get current market prices for all symbols in open trades
    const openTrades = trades.filter(trade => trade.status !== 'CLOSED');
    console.log(`Found ${openTrades.length} open trades that need real-time PnL calculation`);
    
    // Calculate real-time PnL for all trades (both open and closed)
    const userPnL = {};
    const userOpenPnL = {};
    const userClosedPnL = {};
    
    // Process all trades to calculate PnL
    for (const trade of trades) {
      if (!trade.user || !trade.user._id) continue;
      
      const userId = trade.user._id.toString();
      
      // Initialize user PnL objects if needed
      if (!userPnL[userId]) {
        userPnL[userId] = 0;
        userOpenPnL[userId] = 0;
        userClosedPnL[userId] = 0;
      }
      
      if (trade.status === 'CLOSED') {
        // For closed trades, use the recorded PnL
        const tradePnL = trade.pnl || 0;
        userClosedPnL[userId] += tradePnL;
        userPnL[userId] += tradePnL;
      } else {
        // For open trades, calculate current PnL
        // Use the last known price or the original price
        const currentPrice = trade.currentPrice || trade.price;
        
        let tradePnL = 0;
        if (trade.tradeType === 'BUY') {
          tradePnL = (currentPrice - trade.price) * trade.quantity;
        } else {
          tradePnL = (trade.price - currentPrice) * trade.quantity;
        }
        
        userOpenPnL[userId] += tradePnL;
        userPnL[userId] += tradePnL;
      }
    }
    
    console.log('PnL calculated for all users with trades');
    
    // Get unique user IDs from trades to ensure we include all traders
    const traderIds = [...new Set(trades.map(trade => 
      trade.user && trade.user._id ? trade.user._id.toString() : null
    ).filter(Boolean))];
    console.log(`Found ${traderIds.length} unique traders with trades in contest ${contestId}`);
    
    const initialBalance = contest.virtualMoneyAmount || 50000;
    
    // Calculate ranking points for each participant
    const participants = contest.participants.map(participant => {
      // Handle case where participant.user might be null or undefined
      if (!participant.user) {
        console.warn(`Found participant without user in contest ${contestId}`);
        return null;
      }
      
      const userId = participant.user._id.toString();
      
      // Use calculated PnL from trades instead of stored currentPnL
      const totalPnL = userPnL[userId] || participant.currentPnL || 0;
      const openPnL = userOpenPnL[userId] || 0;
      const closedPnL = userClosedPnL[userId] || participant.currentPnL || 0;
      
      console.log(`User ${userId}: Total PnL=${totalPnL}, Open PnL=${openPnL}, Closed PnL=${closedPnL}`);
      
      return {
        user: participant.user,
        currentPnL: totalPnL, // Use total PnL including open positions
        virtualBalance: participant.virtualBalance || initialBalance,
        points: participant.points || 0,
        initialBalance: initialBalance,
        trades: participant.trades || [],
        closedPnL: closedPnL,
        openPnL: openPnL
      };
    }).filter(Boolean); // Remove any null entries
    
    // Check if there are traders who have trades but aren't in participants array
    const missingTraders = traderIds.filter(traderId => 
      !participants.some(p => p.user && p.user._id && p.user._id.toString() === traderId)
    );
    
    if (missingTraders.length > 0) {
      console.log(`Found ${missingTraders.length} traders with trades but not in participants array`);
      
      // Add these missing traders to the participants list for leaderboard display
      for (const traderId of missingTraders) {
        const traderTrades = trades.filter(t => 
          t.user && t.user._id && t.user._id.toString() === traderId
        );
        
        if (traderTrades.length === 0 || !traderTrades[0].user) {
          console.warn(`No valid trades found for trader ${traderId}`);
          continue;
        }
        
        const trader = traderTrades[0].user; // Get user info from first trade
        
        // Use calculated PnL values
        const totalPnL = userPnL[traderId] || 0;
        const openPnL = userOpenPnL[traderId] || 0;
        const closedPnL = userClosedPnL[traderId] || 0;
        
        // Add this trader to participants
        participants.push({
          user: trader,
          currentPnL: totalPnL,
          virtualBalance: initialBalance + totalPnL,
          points: 0, // Default points
          initialBalance: initialBalance,
          trades: traderTrades.length,
          closedPnL: closedPnL,
          openPnL: openPnL
        });
      }
    }
    
    // Sort participants by ranking points (primarily) and points (secondary)
    const rankedParticipants = participants.map(participant => {
      // Calculate the specific ranking points for leaderboard position
      const rankingPoints = pointsService.calculateRankingPoints(
        participant.currentPnL,
        initialBalance
      );
      
      return {
        ...participant,
        rankingPoints
      };
    }).sort((a, b) => {
      // Primary sort by ranking points (PnL-weighted score)
      if (b.rankingPoints !== a.rankingPoints) {
        return b.rankingPoints - a.rankingPoints;
      }
      
      // Secondary sort by standard points if ranking points are equal
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      
      // Tertiary sort by raw PnL if both points are equal
      return b.currentPnL - a.currentPnL;
    });
    
    // Format for the leaderboard display
    const leaderboard = rankedParticipants.map((participant, index) => {
      // Ensure participant.user exists and has required properties
      if (!participant.user) {
        console.warn('Found participant without user data in rankedParticipants');
        return null;
      }
      
      return {
        rank: index + 1,
        userId: participant.user._id,
        username: participant.user.username || 'Unknown User',
        profilePicture: participant.user.profilePicture || '',
        pnl: participant.currentPnL || 0,
        closedPnL: participant.closedPnL || 0,
        openPnL: participant.openPnL || 0,
        virtualBalance: participant.virtualBalance || initialBalance,
        points: participant.points || 0,
        rankingPoints: participant.rankingPoints || 0,
        // Include projected prize money if contest is active
        projectedPrize: contest.status === 'ACTIVE' ? 
          calculateProjectedPrize(index + 1, contest.prizePool, contest.participants.length, contest.prizeDistribution, contest.maxParticipants) : 0
      };
    }).filter(Boolean); // Remove any null entries
    
    console.log(`Returning leaderboard with ${leaderboard.length} entries`);
    res.status(200).json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Error in getLeaderboard:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to load leaderboard data' });
  }
};

/**
 * Helper function to calculate projected prize money based on current rank
 * @param {Number} rank - Current rank of participant
 * @param {Number} prizePool - Total prize pool
 * @param {Number} totalParticipants - Total number of participants
 * @param {Object} contestPrizeDistribution - Prize distribution from contest configuration
 * @param {Number} maxParticipants - Maximum number of participants allowed in the contest
 * @returns {Number} Projected prize amount
 */
const calculateProjectedPrize = (rank, prizePool, totalParticipants, contestPrizeDistribution, maxParticipants) => {
  // For head-to-head contests (2 max participants), winner takes all
  if (maxParticipants === 2) {
    return rank === 1 ? prizePool : 0;
  }
  
  // Use the contest's actual distribution if available
  const distribution = contestPrizeDistribution || {
    '1': 50, // 50% to 1st place
    '2': 30, // 30% to 2nd place
    '3': 20  // 20% to 3rd place
  };
  
  // Calculate projected prize
  const rankStr = rank.toString();
  if (distribution[rankStr]) {
    return (prizePool * distribution[rankStr]) / 100;
  }
  
  return 0; // No prize for this rank
};

exports.getAllContests = async (req, res) => {
  try {
    const now = new Date();
    let query = {};
    
    // Check if the request is coming from an admin
    const isAdmin = req.user && req.user.role === 'ADMIN';
    console.log(`getAllContests - User role: ${isAdmin ? 'ADMIN' : 'USER or Guest'}`);
    
    // For regular users, only show PUBLISHED contests with UPCOMING or ACTIVE status
    if (!isAdmin) {
      query = {
        isPublished: true,
        $or: [
          // Upcoming contests
          { status: 'UPCOMING' },
          // Registration open contests
          { status: 'REGISTRATION_OPEN' },
          // Active contests
          { status: 'ACTIVE' }
        ]
      };
    }
    // For admins, show all contests including drafts and unpublished
    
    console.log('Contest query:', JSON.stringify(query));
    
    const contests = await Contest.find(query)
      .select('-participants.trades')
      .sort({ createdAt: -1 }) // Sort by creation date instead of start date
      .lean();
    
    console.log(`Found ${contests.length} contests`);
    
    // Log contest statuses for debugging
    const statusCounts = {};
    contests.forEach(contest => {
      statusCounts[contest.status] = (statusCounts[contest.status] || 0) + 1;
    });
    console.log('Contest status counts:', statusCounts);
    
    res.status(200).json({ success: true, data: contests });
  } catch (error) {
    console.error('Error in getAllContests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getActiveContests = async (req, res) => {
  try {
    const now = new Date();
    const contests = await Contest.find({
      startDate: { $lte: now },
      endDate: { $gt: now },
      status: 'active'
    })
      .select('-participants.trades')
      .sort({ startDate: -1 })
      .lean();
    
    res.status(200).json({ success: true, data: contests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getContestById = async (req, res) => {
  try {
    let { contestId } = req.params;
    
    // Handle contest IDs with prefixes like "new-"
    contestId = handlePrefixedContestId(contestId);
    
    const contest = await Contest.findById(contestId)
      .select('-participants.trades')
      .lean();
    
    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }
    
    // If user is authenticated, include their participation status
    if (req.user) {
      const participant = contest.participants.find(
        p => p.user.toString() === req.user.id
      );
      contest.userParticipation = participant ? {
        joinedAt: participant.joinedAt,
        virtualBalance: participant.virtualBalance,
        currentPnL: participant.currentPnL,
        points: participant.points
      } : null;
    }
    
    res.status(200).json({ success: true, data: contest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getContestStats = async (req, res) => {
  try {
    let { contestId } = req.params;
    
    // Handle contest IDs with prefixes
    contestId = handlePrefixedContestId(contestId);
    
    const contest = await Contest.findById(contestId)
      .select('participants')
      .lean();
    
    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }
    
    const stats = {
      totalParticipants: contest.participants.length,
      totalTrades: contest.participants.reduce((sum, p) => sum + p.trades.length, 0),
      averagePnL: contest.participants.reduce((sum, p) => sum + p.currentPnL, 0) / contest.participants.length || 0,
      highestPoints: Math.max(...contest.participants.map(p => p.points), 0),
      fillPercentage: (contest.participants.length / contest.maxParticipants) * 100
    };
    
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getUserTrades = async (req, res) => {
  try {
    let { contestId } = req.params;
    const userId = req.user.id;
    
    // Handle contest IDs with prefixes
    contestId = handlePrefixedContestId(contestId);
    
    const trades = await Trade.find({
      contest: contestId,
      user: userId
    })
      .sort({ createdAt: -1 })
      .lean();
    
    res.status(200).json({ success: true, data: trades });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateContest = async (req, res) => {
  try {
    let { contestId } = req.params;
    const updates = req.body;
    
    // Handle contest IDs with prefixes
    contestId = handlePrefixedContestId(contestId);
    
    // Prevent updating certain fields
    delete updates.participants;
    delete updates.status;
    delete updates.createdAt;
    
    const contest = await Contest.findByIdAndUpdate(
      contestId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }
    
    res.status(200).json({ success: true, data: contest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteContest = async (req, res) => {
  try {
    let { contestId } = req.params;
    
    // Handle contest IDs with prefixes
    contestId = handlePrefixedContestId(contestId);
    
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }
    
    // Check if contest has participants
    if (contest.participants.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete contest with active participants' 
      });
    }
    
    await contest.deleteOne();
    
    res.status(200).json({ 
      success: true, 
      message: 'Contest deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.leaveContest = async (req, res) => {
  try {
    let { contestId } = req.params;
    const userId = req.user.id;
    
    // Handle contest IDs with prefixes
    contestId = handlePrefixedContestId(contestId);
    
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }
    
    // Check if user is a participant
    const participantIndex = contest.participants.findIndex(
      p => p.user.toString() === userId
    );
    
    if (participantIndex === -1) {
      return res.status(400).json({ success: false, error: 'Not a participant in this contest' });
    }
    
    // Check if contest has started
    if (new Date() >= contest.startDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot leave contest after it has started' 
      });
    }
    
    // Refund entry fee if it was a paid contest
    if (contest.entryFee > 0) {
      const user = await User.findById(userId);
      user.walletBalance += contest.entryFee;
      await user.save();
    }
    
    // Remove user from participants
    contest.participants.splice(participantIndex, 1);
    await contest.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Successfully left the contest' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.placeTrade = async (req, res) => {
  try {
    let { contestId } = req.params;
    const userId = req.user.id;
    const { symbol, tradeType, quantity, price, isOption = false, optionDetails = {} } = req.body;
    
    // Handle contest IDs with prefixes
    contestId = handlePrefixedContestId(contestId);
    
    // Validate required fields
    if (!symbol || !tradeType || !quantity || !price) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Validate tradeType
    if (!['BUY', 'SELL'].includes(tradeType)) {
      return res.status(400).json({ success: false, error: 'Invalid trade type' });
    }
    
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }
    
    // Check if contest is active
    const now = new Date();
    if (now < contest.startDate || now > contest.endDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Contest is not active' 
      });
    }
    
    // Check if user is a participant
    const participantIndex = contest.participants.findIndex(
      p => p.user.toString() === userId
    );
    
    if (participantIndex === -1) {
      return res.status(403).json({ success: false, error: 'Not a participant in this contest' });
    }
    
    // Calculate trade value
    const tradeValue = price * quantity;
    
    // Check if user has enough virtual balance
    if (contest.participants[participantIndex].virtualBalance < tradeValue) {
      return res.status(400).json({ success: false, error: 'Insufficient virtual balance' });
    }
    
    // Create trade
    const trade = new Trade({
      user: userId,
      contest: contestId,
      symbol,
      tradeType,
      quantity,
      price,
      isOption,
      optionDetails,
      status: 'OPEN'
    });
    
    await trade.save();
    
    // Update contest participant data
    contest.participants[participantIndex].trades.push(trade._id);
    contest.participants[participantIndex].virtualBalance -= tradeValue;
    
    await contest.save();
    
    res.status(201).json({ success: true, data: trade });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update contest statuses based on dates
exports.updateContestStatuses = async (req, res) => {
  try {
    const now = new Date();
    
    // Update all contests based on their dates
    const contests = await Contest.find({});
    
    for (const contest of contests) {
      const startDate = new Date(contest.startDate);
      const endDate = new Date(contest.endDate);
      
      let newStatus;
      if (startDate > now) {
        newStatus = 'UPCOMING';
      } else if (startDate <= now && endDate > now) {
        newStatus = 'ACTIVE';
      } else {
        newStatus = 'COMPLETED';
      }
      
      // Only update if status needs to change
      if (contest.status !== newStatus) {
        contest.status = newStatus;
        await contest.save();
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Contest statuses updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// More controller methods would be implemented here