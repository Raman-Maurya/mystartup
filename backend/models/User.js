const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: false,
    default: ''
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    default: 'USER'
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  totalDeposited: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  totalWinnings: {
    type: Number,
    default: 0
  },
  totalEntryFees: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  kycVerified: {
    type: Boolean,
    default: false
  },
  kycStatus: {
    type: String,
    enum: ['NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED'],
    default: 'NOT_SUBMITTED'
  },
  kycDetails: {
    idType: {
      type: String,
      enum: ['AADHAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE']
    },
    idNumber: String,
    verificationDate: Date,
    rejectionReason: String,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: 0
  },
  // Authentication fields
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  phoneVerificationCode: String,
  phoneVerificationExpires: Date,
  // Account status
  accountStatus: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'PENDING_VERIFICATION'],
    default: 'PENDING_VERIFICATION'
  },
  // Physical address (optional)
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  // Banking/Payment details for withdrawals
  paymentMethods: [{
    type: {
      type: String,
      enum: ['UPI', 'BANK_ACCOUNT', 'WALLET'],
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    details: {
      upiId: String,
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      bankName: String,
      walletProvider: String,
      walletId: String
    },
    lastUsed: Date,
    isVerified: {
      type: Boolean,
      default: false
    }
  }],
  // Contest participation history
  contests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest'
  }],
  // Dates
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
  // Profile
  profilePicture: String,
  bio: String,
  dateOfBirth: Date,
  // Referral system
  referralCode: {
    type: String,
    unique: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCount: {
    type: Number,
    default: 0
  },
  referralEarnings: {
    type: Number,
    default: 0
  }
});

// Password hashing middleware
UserSchema.pre('save', async function(next) {
  // Update the updatedAt timestamp
  this.updatedAt = Date.now();
  
  // Only hash the password if it has been modified or is new
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate referral code for new users
UserSchema.pre('save', function(next) {
  if (this.isNew && !this.referralCode) {
    this.referralCode = generateReferralCode(this.username);
  }
  next();
});

// Helper function to generate referral code
function generateReferralCode(username) {
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${username.substring(0, 4).toUpperCase()}${randomString}`;
}

// Create indexes for faster queries
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ phoneNumber: 1 });
UserSchema.index({ referralCode: 1 });
UserSchema.index({ totalPoints: -1 }); // For leaderboards

module.exports = mongoose.model('User', UserSchema);