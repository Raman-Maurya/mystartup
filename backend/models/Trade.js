const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
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
  symbol: {
    type: String,
    required: true
  },
  tradeType: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED'],
    default: 'OPEN'
  },
  closingPrice: {
    type: Number
  },
  pnl: {
    type: Number,
    default: 0
  },
  isOption: {
    type: Boolean,
    default: false
  },
  optionDetails: {
    strikePrice: Number,
    expiryDate: Date,
    optionType: {
      type: String,
      enum: ['CALL', 'PUT']
    }
  }
});

module.exports = mongoose.model('Trade', TradeSchema);