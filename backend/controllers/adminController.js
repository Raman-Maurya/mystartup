const Contest = require('../models/Contest');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Trade = require('../models/Trade');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

// Get admin dashboard stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    const stats = {};
    
    // Contest stats
    const contestStats = await Contest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalPrizePool: { $sum: '$prizePool' },
          totalParticipants: { $sum: { $size: '$participants' } }
        }
      }
    ]);
    
    // Format contest stats
    stats.contests = {
      total: 0,
      active: 0,
      upcoming: 0,
      completed: 0,
      cancelled: 0,
      totalPrizePool: 0
    };
    
    contestStats.forEach(stat => {
      stats.contests.total += stat.count;
      stats.contests.totalPrizePool += stat.totalPrizePool;
      
      switch(stat._id) {
        case 'ACTIVE':
          stats.contests.active = stat.count;
          break;
        case 'UPCOMING':
        case 'REGISTRATION_OPEN':
          stats.contests.upcoming += stat.count;
          break;
        case 'COMPLETED':
          stats.contests.completed = stat.count;
          break;
        case 'CANCELLED':
          stats.contests.cancelled = stat.count;
          break;
      }
    });
    
    // User stats
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { 
            $sum: { 
              $cond: [{ $gt: ['$lastLoginAt', new Date(Date.now() - 30*24*60*60*1000)] }, 1, 0] 
            } 
          },
          totalWalletBalance: { $sum: '$walletBalance' }
        }
      }
    ]);
    
    stats.users = userStats[0] || { totalUsers: 0, activeUsers: 0, totalWalletBalance: 0 };
    
    // Payment stats
    const paymentStats = await Payment.aggregate([
      {
        $match: { status: 'COMPLETED' }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Format payment stats
    stats.payments = {
      totalRevenue: 0,
      deposits: { count: 0, total: 0 },
      withdrawals: { count: 0, total: 0 },
      contestEntries: { count: 0, total: 0 },
      prizePayouts: { count: 0, total: 0 }
    };
    
    paymentStats.forEach(stat => {
      switch(stat._id) {
        case 'DEPOSIT':
          stats.payments.deposits = { count: stat.count, total: stat.total };
          stats.payments.totalRevenue += stat.total;
          break;
        case 'WITHDRAWAL':
          stats.payments.withdrawals = { count: stat.count, total: stat.total };
          break;
        case 'CONTEST_ENTRY':
          stats.payments.contestEntries = { count: stat.count, total: stat.total };
          stats.payments.totalRevenue += stat.total * 0.1; // 10% platform fee
          break;
        case 'PRIZE_PAYOUT':
          stats.payments.prizePayouts = { count: stat.count, total: stat.total };
          break;
      }
    });
    
    // Trade stats
    const tradeStats = await Trade.aggregate([
      {
        $group: {
          _id: null,
          totalTrades: { $sum: 1 },
          profitableTrades: { 
            $sum: { 
              $cond: [{ $gt: ['$profitLoss', 0] }, 1, 0] 
            } 
          },
          totalVolume: { $sum: '$tradeValue' }
        }
      }
    ]);
    
    stats.trades = tradeStats[0] || { totalTrades: 0, profitableTrades: 0, totalVolume: 0 };
    
    // Add platform stats
    stats.platform = {
      uptime: process.uptime(), // Server uptime in seconds
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform
    };
    
    return res.status(200).json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return next(new AppError('Failed to retrieve admin dashboard statistics', 500));
  }
};

// Get all contests with detailed info
exports.getAllContests = async (req, res, next) => {
  try {
    // Extract query parameters for filtering and pagination
    const { 
      page = 1, 
      limit = 10, 
      status, 
      sortBy = 'startDate',
      sortOrder = 'desc',
      search,
      contestType
    } = req.query;
    
    // Build query
    const query = {};
    
    // Add filters
    if (status) {
      query.status = status.toUpperCase();
    }
    
    if (contestType) {
      query.contestType = contestType.toUpperCase();
    }
    
    // Add search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Count total contests matching the query
    const totalContests = await Contest.countDocuments(query);
    
    // Apply pagination and sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const contests = await Contest.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('name description entryFee prizePool maxParticipants participants startDate endDate status contestType category virtualMoneyAmount');
    
    return res.status(200).json({
      success: true,
      count: contests.length,
      total: totalContests,
      page: parseInt(page),
      pages: Math.ceil(totalContests / limit),
      data: contests
    });
    
  } catch (error) {
    console.error('Error fetching contests:', error);
    return next(new AppError('Failed to retrieve contests', 500));
  }
};

// Update contest status
exports.updateContestStatus = async (req, res, next) => {
  try {
    const { contestId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return next(new AppError('Status is required', 400));
    }
    
    // Validate status
    const validStatuses = ['DRAFT', 'UPCOMING', 'REGISTRATION_OPEN', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid status', 400));
    }
    
    const contest = await Contest.findById(contestId);
    
    if (!contest) {
      return next(new AppError('Contest not found', 404));
    }
    
    // Update status
    contest.status = status;
    
    // If setting to COMPLETED, calculate final positions and prize money
    if (status === 'COMPLETED' && contest.status !== 'COMPLETED') {
      // Sort participants by currentBalance in descending order
      contest.participants.sort((a, b) => b.currentBalance - a.currentBalance);
      
      // Assign final positions and prize money
      contest.participants.forEach((participant, index) => {
        const rank = index + 1;
        participant.finalPosition = rank;
        
        // Check if this rank gets a prize
        const prizePercentage = contest.prizeDistribution.get(rank.toString());
        if (prizePercentage) {
          participant.prizeMoney = (prizePercentage / 100) * contest.prizePool;
          
          // Create payment record for winner
          if (participant.prizeMoney > 0) {
            const newPayment = new Payment({
              user: participant.user,
              amount: participant.prizeMoney,
              type: 'PRIZE_PAYOUT',
              status: 'COMPLETED',
              paymentMethod: 'SYSTEM',
              relatedContest: contestId,
              description: `Prize money for rank ${rank} in contest: ${contest.name}`,
              completedAt: new Date()
            });
            
            // Save payment
            newPayment.save();
            
            // Update user's wallet balance
            User.findByIdAndUpdate(
              participant.user,
              { $inc: { walletBalance: participant.prizeMoney } },
              { new: true }
            ).exec();
          }
        }
      });
      
      // Update contest financials
      contest.financials = {
        totalEntryFees: contest.entryFee * contest.participants.length,
        totalPrizePaid: contest.participants.reduce((sum, p) => sum + (p.prizeMoney || 0), 0),
        platformRevenue: (contest.entryFee * contest.participants.length) * (contest.platformFeePercentage / 100)
      };
    }
    
    await contest.save();
    
    return res.status(200).json({
      success: true,
      data: {
        id: contest._id,
        name: contest.name,
        status: contest.status
      }
    });
    
  } catch (error) {
    console.error('Error updating contest status:', error);
    return next(new AppError('Failed to update contest status', 500));
  }
};

// Delete a contest
exports.deleteContest = async (req, res, next) => {
  try {
    const { contestId } = req.params;
    
    const contest = await Contest.findById(contestId);
    
    if (!contest) {
      return next(new AppError('Contest not found', 404));
    }
    
    // Check if contest has participants and is active
    if (contest.participants.length > 0 && ['ACTIVE', 'REGISTRATION_OPEN'].includes(contest.status)) {
      return next(new AppError('Cannot delete contest with active participants', 400));
    }
    
    // If contest has participants and payments, refund them
    if (contest.participants.length > 0 && contest.entryFee > 0) {
      // Process refunds for each participant
      const refundPromises = contest.participants.map(async participant => {
        // Refund entry fee to user's wallet
        await User.findByIdAndUpdate(
          participant.user,
          { $inc: { walletBalance: contest.entryFee } },
          { new: true }
        );
        
        // Create refund payment record
        const refundPayment = new Payment({
          user: participant.user,
          amount: contest.entryFee,
          type: 'REFUND',
          status: 'COMPLETED',
          paymentMethod: 'SYSTEM',
          relatedContest: contestId,
          description: `Refund for cancelled contest: ${contest.name}`,
          completedAt: new Date()
        });
        
        return refundPayment.save();
      });
      
      await Promise.all(refundPromises);
    }
    
    // Delete all trades associated with this contest
    await Trade.deleteMany({ contest: contestId });
    
    // Remove contest from users' contests array
    await User.updateMany(
      { contests: contestId },
      { $pull: { contests: contestId } }
    );
    
    // Delete contest
    await Contest.findByIdAndDelete(contestId);
    
    return res.status(200).json({
      success: true,
      message: 'Contest deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting contest:', error);
    return next(new AppError('Failed to delete contest', 500));
  }
};

module.exports = exports; 