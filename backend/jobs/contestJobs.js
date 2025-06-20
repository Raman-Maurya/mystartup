const cron = require('node-cron');
const Contest = require('../models/Contest');
const User = require('../models/User');
const Trade = require('../models/Trade');
const logger = require('../utils/logger');
const pointsService = require('../services/pointsService');

// Define the cron job functions but don't schedule them yet
const startContestsJob = async () => {
  try {
    logger.info('Running job: Start contests');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find contests that should start today
    const contests = await Contest.find({
      startDate: {
        $gte: today,
        $lt: tomorrow
      },
      status: 'upcoming'
    });
    
    for (const contest of contests) {
      contest.status = 'active';
      await contest.save();
      logger.info(`Contest started: ${contest.name} (${contest._id})`);
    }
  } catch (error) {
    logger.error('Error in start contests job:', error);
  }
};

const endContestsJob = async () => {
  try {
    logger.info('Running job: End contests');
    
    // Find active contests
    const contests = await Contest.find({
      status: 'active',
      endDate: { $lte: new Date() }
    });
    
    for (const contest of contests) {
      // Close all open trades
      const openTrades = await Trade.find({
        contest: contest._id,
        status: 'OPEN'
      });
      
      for (const trade of openTrades) {
        // In a real app, you would get the current market price
        // For simplicity, we'll use a mock price here
        const mockCurrentPrice = trade.price * (1 + (Math.random() * 0.1 - 0.05)); // +/- 5%
        
        let pnl = 0;
        if (trade.tradeType === 'BUY') {
          pnl = (mockCurrentPrice - trade.price) * trade.quantity;
        } else {
          pnl = (trade.price - mockCurrentPrice) * trade.quantity;
        }
        
        trade.status = 'CLOSED';
        trade.closingPrice = mockCurrentPrice;
        trade.pnl = pnl;
        
        await trade.save();
      }
      
      // Recalculate points for all participants
      const contestType = contest.maxParticipants > 200 ? 'mega' : 'small';
      const initialBalance = contestType === 'mega' ? 79999 : 50000;
      
      for (let i = 0; i < contest.participants.length; i++) {
        const participant = contest.participants[i];
        const tradeCount = participant.trades.length;
        participant.points = pointsService.calculatePoints(
          participant.currentPnL,
          initialBalance,
          tradeCount
        );
      }
      
      // Sort participants by points (primary) and PnL (secondary)
      contest.participants.sort((a, b) => {
        if (b.points === a.points) {
          return b.currentPnL - a.currentPnL;
        }
        return b.points - a.points;
      });
      
      // Distribute prizes
      const prizePool = contest.prizePool;
      const prizeDistribution = contest.prizeDistribution;
      
      for (const [rank, percentage] of Object.entries(prizeDistribution)) {
        const rankIndex = parseInt(rank) - 1;
        
        if (rankIndex < contest.participants.length) {
          const winner = contest.participants[rankIndex];
          const prizeAmount = (prizePool * percentage) / 100;
          
          const user = await User.findById(winner.user);
          user.walletBalance += prizeAmount;
          
          await user.save();
          
          logger.info(`Prize distributed: ${prizeAmount} to user ${user.username} (rank ${rank})`);
        }
      }
      
      contest.status = 'completed';
      await contest.save();
      
      logger.info(`Contest ended: ${contest.name} (${contest._id})`);
    }
  } catch (error) {
    logger.error('Error in end contests job:', error);
  }
};

const cleanUpOldContestsJob = async () => {
  try {
    logger.info('Running job: Clean up old contests');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Archive old contests
    const result = await Contest.updateMany(
      {
        endDate: { $lt: thirtyDaysAgo },
        status: 'completed'
      },
      {
        $set: { archived: true }
      }
    );
    
    logger.info(`Archived ${result.nModified} old contests`);
  } catch (error) {
    logger.error('Error in clean up contests job:', error);
  }
};

// Initialize and export the jobs
let startJobSchedule;
let endJobSchedule;
let cleanupJobSchedule;

module.exports = {
  startJobs: () => {
    // Start contests at 9:15 AM on weekdays
    startJobSchedule = cron.schedule('15 9 * * 1-5', startContestsJob);
    
    // End contests at 3:30 PM on weekdays
    endJobSchedule = cron.schedule('30 15 * * 1-5', endContestsJob);
    
    // Clean up old contests (run once a week)
    cleanupJobSchedule = cron.schedule('0 0 * * 0', cleanUpOldContestsJob);
    
    logger.info('Contest scheduled jobs initialized');
  },
  
  stopJobs: () => {
    if (startJobSchedule) startJobSchedule.stop();
    if (endJobSchedule) endJobSchedule.stop();
    if (cleanupJobSchedule) cleanupJobSchedule.stop();
    
    logger.info('Contest scheduled jobs stopped');
  }
};