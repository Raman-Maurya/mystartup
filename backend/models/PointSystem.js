const mongoose = require('mongoose');

const PointSystemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Points calculation rules
  rules: {
    // Base points for each profitable trade
    profitableTradeBasePoints: {
      type: Number,
      default: 10
    },
    // Additional points per percentage of profit (i.e., 2 points per 1% profit)
    profitPercentageMultiplier: {
      type: Number,
      default: 2
    },
    // Points for consecutive profitable trades
    consecutiveProfitableTradeBonus: {
      type: Number,
      default: 5
    },
    // Maximum consecutive trade bonus multiplier
    maxConsecutiveMultiplier: {
      type: Number,
      default: 5
    },
    // Points penalty for losses (negative points)
    lossTradePoints: {
      type: Number,
      default: -5
    },
    // Time-based multipliers (e.g., holding trades overnight)
    timeBonusMultiplier: {
      type: Number,
      default: 1.2
    },
    // Minimum time in minutes to qualify for time bonus
    timeBonusMinMinutes: {
      type: Number,
      default: 60
    },
    // Volatility bonus - extra points for trading during high volatility
    volatilityBonus: {
      type: Number,
      default: 3
    },
    // Special event multiplier (can be set for special trading days)
    specialEventMultiplier: {
      type: Number,
      default: 1
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create the default point system if none exists
PointSystemSchema.statics.createDefaultSystem = async function() {
  const count = await this.countDocuments({ isDefault: true });
  if (count === 0) {
    await this.create({
      name: 'Standard Point System',
      description: 'Default point system for all contests',
      isDefault: true,
      rules: {
        profitableTradeBasePoints: 10,
        profitPercentageMultiplier: 2,
        consecutiveProfitableTradeBonus: 5,
        maxConsecutiveMultiplier: 5,
        lossTradePoints: -5,
        timeBonusMultiplier: 1.2,
        timeBonusMinMinutes: 60,
        volatilityBonus: 3,
        specialEventMultiplier: 1
      }
    });
  }
};

module.exports = mongoose.model('PointSystem', PointSystemSchema); 