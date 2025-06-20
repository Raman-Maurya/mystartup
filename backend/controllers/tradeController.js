const Trade = require('../models/Trade');
const Contest = require('../models/Contest');
const marketDataService = require('../services/marketDataService');
const pointsService = require('../services/pointsService');
const PointSystem = require('../models/PointSystem');
const UserPoints = require('../models/UserPoints');

exports.placeTrade = async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user.id;
    const { symbol, tradeType, quantity, price, isOption = false, optionDetails = {} } = req.body;
    
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
    if (contest.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Contest is not active' });
    }
    
    // Check if user is a participant
    const participantIndex = contest.participants.findIndex(p => p.user.toString() === userId);
    if (participantIndex === -1) {
      return res.status(403).json({ success: false, error: 'Not a participant in this contest' });
    }
    
    // Check if user has reached the maximum allowed trades
    const maxTrades = contest.tradingSettings?.maxTradesPerUser || 10;
    if (contest.participants[participantIndex].trades.length >= maxTrades) {
      return res.status(400).json({ 
        success: false, 
        error: `Maximum of ${maxTrades} trades allowed per contest` 
      });
    }
    
    // Calculate trade value
    const tradeValue = price * quantity;
    
    // Check if user has enough virtual balance
    if (contest.participants[participantIndex].virtualBalance < tradeValue) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient virtual balance',
        message: `You need ₹${tradeValue} virtual money for this trade but only have ₹${contest.participants[participantIndex].virtualBalance}`
      });
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
      optionDetails
    });
    
    await trade.save();
    
    // Update user's virtual balance
    contest.participants[participantIndex].virtualBalance -= tradeValue;
    contest.participants[participantIndex].trades.push(trade._id);
    
    // Calculate and update points after placing trade
    const tradeCount = contest.participants[participantIndex].trades.length;
    const pnl = contest.participants[participantIndex].currentPnL;
    const contestType = contest.maxParticipants >= 500 ? 'mega' : 'standard';
    const initialBalance = contestType === 'mega' ? 79999 : 50000;
    
    // Calculate points based on current PnL and trade activity
    contest.participants[participantIndex].points = pointsService.calculatePoints(
      pnl, 
      initialBalance, 
      tradeCount
    );
    
    // Get the point system for the contest
    const pointSystem = await PointSystem.findById(contest.pointSystem);
    const defaultPointSystem = await PointSystem.findOne({ isDefault: true });
    const activePointSystem = pointSystem || defaultPointSystem;

    // Find or create user points record for this contest
    let userPoints = await UserPoints.findOne({ 
      user: userId,
      contest: contestId
    });

    if (!userPoints) {
      userPoints = new UserPoints({
        user: userId,
        contest: contestId
      });
    }

    // Calculate points for this trade
    const consecutiveTrades = trade.pnl > 0 ? 
      userPoints.consecutiveProfitableTrades + 1 : 0;

    const tradePoints = pointsService.calculateTradePoints(
      trade, 
      activePointSystem, 
      contest.participants[participantIndex].virtualBalance,
      consecutiveTrades
    );

    // Update user points
    userPoints.consecutiveProfitableTrades = consecutiveTrades;
    userPoints.maxConsecutiveProfitableTrades = Math.max(
      userPoints.maxConsecutiveProfitableTrades,
      consecutiveTrades
    );
    userPoints.totalPoints += tradePoints.points;

    // Add to points log
    userPoints.pointsLog.push({
      points: tradePoints.points,
      reason: tradePoints.reason,
      relatedTrade: trade._id,
      profitPercentage: tradePoints.profitPercentage
    });

    // Update contest with the points
    contest.participants[participantIndex].points = userPoints.totalPoints;

    // Save records
    await userPoints.save();
    await contest.save();
    
    res.status(201).json({ 
      success: true, 
      data: {
        trade,
        remainingVirtualBalance: contest.participants[participantIndex].virtualBalance,
        remainingTrades: maxTrades - contest.participants[participantIndex].trades.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.closeTrade = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user.id;
    
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade not found' });
    }
    
    if (trade.user.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    if (trade.status === 'CLOSED') {
      return res.status(400).json({ success: false, error: 'Trade already closed' });
    }
    
    // Get current market price
    let currentPrice;
    if (trade.isOption) {
      const optionChain = await marketDataService.getOptionChain(trade.symbol);
      // Find the specific option in the chain
      // This is simplified - actual implementation would need to match strike price, expiry, etc.
      currentPrice = optionChain.find(option => 
        option.strikePrice === trade.optionDetails.strikePrice && 
        option.optionType === trade.optionDetails.optionType
      ).lastPrice;
    } else {
      const stockData = await marketDataService.getStockPrice(trade.symbol);
      currentPrice = stockData.lastPrice;
    }
    
    // Calculate P&L
    let pnl = 0;
    if (trade.tradeType === 'BUY') {
      pnl = (currentPrice - trade.price) * trade.quantity;
    } else {
      pnl = (trade.price - currentPrice) * trade.quantity;
    }
    
    // Update trade
    trade.currentPrice = currentPrice;
    trade.pnl = pnl;
    trade.status = 'CLOSED';
    trade.closedAt = new Date();
    
    await trade.save();
    
    // Update contest participant data
    const contest = await Contest.findById(trade.contest);
    const participantIndex = contest.participants.findIndex(p => p.user.toString() === userId);
    
    // Add funds back to virtual balance
    const refundAmount = trade.price * trade.quantity;
    contest.participants[participantIndex].virtualBalance += refundAmount;
    
    // Add P&L to virtual balance
    contest.participants[participantIndex].virtualBalance += pnl;
    
    // Update total P&L
    contest.participants[participantIndex].currentPnL += pnl;
    
    // Calculate and update points
    const tradeCount = contest.participants[participantIndex].trades.length;
    const totalPnl = contest.participants[participantIndex].currentPnL;
    const contestType = contest.maxParticipants > 200 ? 'mega' : 'small';
    const initialBalance = contestType === 'mega' ? 79999 : 50000;
    
    // Recalculate points after closing trade and updating PnL
    contest.participants[participantIndex].points = pointsService.calculatePoints(
      totalPnl, 
      initialBalance, 
      tradeCount
    );
    
    await contest.save();
    
    res.status(200).json({ success: true, data: trade });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// More trade-related controller methods would be implemented here