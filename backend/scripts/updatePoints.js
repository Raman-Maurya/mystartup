const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Contest = require('../models/Contest');
const pointsService = require('../services/pointsService');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/trading-contest', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('MongoDB connected');
    updateAllContestsPoints()
      .then(() => {
        console.log('Points update completed');
        process.exit(0);
      })
      .catch(err => {
        console.error('Error updating points:', err);
        process.exit(1);
      });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function updateAllContestsPoints() {
  try {
    // Find all active contests
    const contests = await Contest.find();
    
    console.log(`Found ${contests.length} contests to update`);
    
    for (const contest of contests) {
      const contestType = contest.maxParticipants > 200 ? 'mega' : 'small';
      const initialBalance = contestType === 'mega' ? 79999 : 50000;
      
      console.log(`Updating points for contest: ${contest.name} (${contest._id})`);
      
      // Update points for each participant
      let updatedCount = 0;
      for (let i = 0; i < contest.participants.length; i++) {
        const participant = contest.participants[i];
        const tradeCount = participant.trades.length;
        const oldPoints = participant.points;
        
        // Calculate new points based on PnL and trade activity
        participant.points = pointsService.calculatePoints(
          participant.currentPnL,
          initialBalance,
          tradeCount
        );
        
        if (oldPoints !== participant.points) {
          updatedCount++;
        }
      }
      
      // Sort participants by points and then by PnL
      contest.participants.sort((a, b) => {
        if (b.points === a.points) {
          return b.currentPnL - a.currentPnL;
        }
        return b.points - a.points;
      });
      
      await contest.save();
      console.log(`Updated ${updatedCount} participants in contest ${contest.name}`);
    }
    
    console.log('All contests updated successfully');
  } catch (error) {
    console.error('Error updating points:', error);
    throw error;
  }
} 