const mongoose = require('mongoose');

const UserPointsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true
  },
  // Total accumulated points in this contest
  totalPoints: {
    type: Number,
    default: 0
  },
  // Track consecutive profitable trades to calculate bonus points
  consecutiveProfitableTrades: {
    type: Number,
    default: 0
  },
  // Track the maximum consecutive profitable trades achieved
  maxConsecutiveProfitableTrades: {
    type: Number,
    default: 0
  },
  // Individual points entries from various activities
  pointsLog: [{
    points: Number,
    reason: String,
    relatedTrade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trade'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    // Calculated data
    profitPercentage: Number,
    timeHeldMinutes: Number,
    volatilityScore: Number,
    bonusMultiplier: Number
  }],
  // Final position in the contest (calculated at contest end)
  finalPosition: Number,
  // Prize won (if any)
  prizeAmount: {
    type: Number,
    default: 0
  },
  // Performance metrics
  metrics: {
    totalTrades: {
      type: Number,
      default: 0
    },
    profitableTrades: {
      type: Number,
      default: 0
    },
    unprofitableTrades: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    },
    averageProfit: {
      type: Number,
      default: 0
    },
    averageLoss: {
      type: Number,
      default: 0
    },
    profitLossRatio: {
      type: Number,
      default: 0
    },
    largestProfit: {
      type: Number,
      default: 0
    },
    largestLoss: {
      type: Number,
      default: 0
    }
  },
  // Contest participation status
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'DISQUALIFIED'],
    default: 'ACTIVE'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

// Create indexes for faster queries
UserPointsSchema.index({ user: 1, contest: 1 }, { unique: true });
UserPointsSchema.index({ contest: 1, totalPoints: -1 });

module.exports = mongoose.model('UserPoints', UserPointsSchema); 