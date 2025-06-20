/**
 * Script to distribute prize money to winners of completed contests
 * This would typically run after contests are marked as COMPLETED
 * 
 * Run with: node scripts/distributePrizeMoney.js
 */

const mongoose = require('mongoose');
const Contest = require('../models/Contest');
const User = require('../models/User');
const Payment = require('../models/Payment');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/trading-contest', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB connected');
  
  try {
    // Find completed contests that haven't distributed prizes yet
    const completedContests = await Contest.find({
      status: 'COMPLETED',
      'financials.totalPrizePaid': { $eq: 0 } // Only contests that haven't paid out yet
    }).populate('participants.user', 'username email walletBalance');
    
    console.log(`Found ${completedContests.length} completed contests with prizes to distribute`);
    
    if (completedContests.length === 0) {
      console.log('No contests need prize distribution');
      return;
    }
    
    for (const contest of completedContests) {
      console.log(`\nProcessing contest: ${contest.name} (ID: ${contest._id})`);
      
      // Check if contest has participants
      if (!contest.participants || contest.participants.length === 0) {
        console.log('Contest has no participants, skipping');
        continue;
      }
      
      // Sort participants by final position (ascending, so 1st place is first)
      const sortedParticipants = [...contest.participants].sort((a, b) => {
        // If final position is not set, sort by currentBalance in descending order
        if (!a.finalPosition && !b.finalPosition) {
          return b.currentBalance - a.currentBalance;
        }
        return (a.finalPosition || Infinity) - (b.finalPosition || Infinity);
      });
      
      // Track total prizes distributed
      let totalPrizePaid = 0;
      
      // Distribute prizes
      for (const participant of sortedParticipants) {
        // Only participants with prizes get paid
        if (!participant.prizeMoney || participant.prizeMoney <= 0) {
          continue;
        }
        
        const userId = participant.user._id;
        const username = participant.user.username;
        const prizeAmount = participant.prizeMoney;
        const position = participant.finalPosition;
        
        // Create payment record
        const payment = new Payment({
          user: userId,
          amount: prizeAmount,
          type: 'PRIZE_PAYOUT',
          status: 'COMPLETED',
          paymentMethod: 'SYSTEM',
          transactionId: `PRIZE_${contest._id.toString().substring(0, 6)}_${userId.toString().substring(0, 6)}`,
          relatedContest: contest._id,
          description: `Prize for ${position}${getOrdinalSuffix(position)} place in contest: ${contest.name}`,
          completedAt: new Date()
        });
        
        await payment.save();
        
        // Update user wallet balance
        const user = await User.findById(userId);
        user.walletBalance += prizeAmount;
        user.totalWinnings += prizeAmount;
        await user.save();
        
        totalPrizePaid += prizeAmount;
        console.log(`Paid ₹${prizeAmount} to ${username} for ${position}${getOrdinalSuffix(position)} place`);
      }
      
      // Update contest financials
      contest.financials.totalPrizePaid = totalPrizePaid;
      await contest.save();
      
      console.log(`Total prize money paid for contest "${contest.name}": ₹${totalPrizePaid}`);
    }
    
    console.log('\nPrize distribution completed successfully');
    
  } catch (error) {
    console.error('Error distributing prize money:', error);
  } finally {
    // Close the connection
    mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(position) {
  if (position % 100 >= 11 && position % 100 <= 13) {
    return 'th';
  }
  
  switch (position % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
} 