const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  type: {
    type: String,
    enum: ['DEPOSIT', 'WITHDRAWAL', 'CONTEST_ENTRY', 'CONTEST_WINNING', 'REFERRAL_BONUS'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'NETBANKING', 'CARD', 'WALLET', 'SYSTEM'],
    required: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  gatewayTransactionId: String,
  relatedContest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest'
  },
  description: String,
  metadata: {
    type: Map,
    of: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

// Index for faster queries
PaymentSchema.index({ user: 1, createdAt: -1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ transactionId: 1 });

module.exports = mongoose.model('Payment', PaymentSchema); 