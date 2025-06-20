const mongoose = require('mongoose');

const ContestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  entryFee: {
    type: Number,
    required: true
  },
  maxParticipants: {
    type: Number,
    required: true
  },
  minParticipants: {
    type: Number,
    default: 2
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  registrationStartDate: {
    type: Date,
    default: function() {
      // Default to 7 days before start date
      const date = new Date(this.startDate);
      date.setDate(date.getDate() - 7);
      return date;
    }
  },
  registrationEndDate: {
    type: Date,
    default: function() {
      // Default to start date
      return this.startDate;
    }
  },
  // Explicit virtual money amount for this contest
  virtualMoneyAmount: {
    type: Number,
    default: function() {
      // Default to 50000, or 79999 for mega contests
      return this.maxParticipants >= 500 ? 79999 : 50000;
    }
  },
  // Whether the contest is published and visible to users
  isPublished: {
    type: Boolean,
    default: true
  },
  prizePool: {
    type: Number,
    required: true
  },
  // Default contest image
  image: {
    type: String,
    default: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
  },
  // Whether contest has high win rate (60% or more participants win)
  highWinRate: {
    type: Boolean,
    default: false
  },
  // Whether contest is newly created
  isNew: {
    type: Boolean,
    default: true
  },
  // Prize distribution array for detailed breakdown
  prizeDistributionDetails: [{
    rank: String,
    prize: String,
    percentage: Number
  }],
  // Percentage of entry fees that goes to prize pool
  prizePoolPercentage: {
    type: Number,
    default: 80 // 80% of entry fees go to prize pool
  },
  // Percentage of entry fees that goes to platform (revenue)
  platformFeePercentage: {
    type: Number,
    default: 20 // 20% of entry fees as platform fee
  },
  prizeDistribution: {
    type: Map,
    of: Number,
    default: {
      '1': 50, // 50% to 1st place
      '2': 30, // 30% to 2nd place
      '3': 20  // 20% to 3rd place
    }
  },
  // Dynamic prize tiers based on participant count
  prizeTiers: [{
    minParticipants: Number,
    maxParticipants: Number,
    distribution: {
      type: Map,
      of: Number
    }
  }],
  // Point system to use for this contest
  pointSystem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PointSystem'
  },
  // Trading related settings
  tradingSettings: {
    maxTradesPerUser: {
      type: Number,
      default: 10
    },
    maxOpenPositions: {
      type: Number,
      default: 3
    },
    // Maximum percentage of virtual balance for a single trade
    maxPositionSize: {
      type: Number,
      default: 50 // 50% of balance
    },
    allowedInstruments: {
      type: [String],
      default: ['STOCKS', 'OPTIONS', 'FUTURES']
    },
    // Trading hours
    tradingHoursStart: {
      type: String,
      default: '09:15' // Indian market opening
    },
    tradingHoursEnd: {
      type: String,
      default: '15:30' // Indian market closing
    },
    // Days when trading is allowed (0 = Sunday, 1 = Monday, etc.)
    tradingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5] // Monday to Friday
    }
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    // Starting balance for trading
    virtualBalance: {
      type: Number,
      default: function() {
        // Use the contest's virtualMoneyAmount field
        return this.parent().parent().virtualMoneyAmount || 50000;
      }
    },
    // Current balance including profits/losses
    currentBalance: {
      type: Number,
      default: function() {
        // Default to the same as virtual balance
        return this.virtualBalance;
      }
    },
    trades: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trade'
    }],
    // Profit and loss
    currentPnL: {
      type: Number,
      default: 0
    },
    pnlPercentage: {
      type: Number,
      default: 0
    },
    // Points earned in this contest
    points: {
      type: Number,
      default: 0
    },
    // Current rank in the contest
    rank: {
      type: Number,
      default: 0
    },
    // Participation status
    status: {
      type: String,
      enum: ['REGISTERED', 'ACTIVE', 'COMPLETED', 'DISQUALIFIED'],
      default: 'REGISTERED'
    },
    // Final position and winnings (filled at contest end)
    finalPosition: Number,
    prizeMoney: {
      type: Number,
      default: 0
    },
    // If entry fee was paid
    entryFeePaid: {
      type: Boolean,
      default: false
    },
    // Related payment transaction
    paymentTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    }
  }],
  category: {
    type: String,
    enum: ['nifty50', 'banknifty', 'stocks', 'crypto', 'forex', 'mixed'],
    default: 'stocks'
  },
  stockCategory: {
    type: String,
    enum: ['all', 'large_cap', 'mid_cap', 'small_cap', 'it', 'banking', 'pharma', 'auto', 'fmcg'],
    default: 'all'
  },
  status: {
    type: String,
    enum: ['DRAFT', 'UPCOMING', 'REGISTRATION_OPEN', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
    default: 'DRAFT'
  },
  contestType: {
    type: String,
    enum: ['FREE', 'PAID', 'HEAD2HEAD', 'GUARANTEED', 'WINNER_TAKES_ALL'],
    required: true
  },
  visibility: {
    type: String,
    enum: ['PUBLIC', 'PRIVATE', 'INVITE_ONLY'],
    default: 'PUBLIC'
  },
  // For invite-only contests
  invitationCodes: [String],
  // Contest tags for filtering/searching
  tags: [String],
  // Financial summary
  financials: {
    totalEntryFees: {
      type: Number,
      default: 0
    },
    totalPrizePaid: {
      type: Number,
      default: 0
    },
    platformRevenue: {
      type: Number,
      default: 0
    },
    // In case of guaranteed prize pools where entry fees don't cover
    platformContribution: {
      type: Number,
      default: 0
    }
  },  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel'
  },
  createdByModel: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'User'
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

// Pre-save hook to update timestamps
ContestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
ContestSchema.index({ status: 1, startDate: 1 });
ContestSchema.index({ category: 1, status: 1 });
ContestSchema.index({ 'participants.user': 1 });

module.exports = mongoose.model('Contest', ContestSchema);