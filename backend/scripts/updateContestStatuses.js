/**
 * Script to update contest statuses based on their dates
 * This would typically run as a cron job
 * 
 * Run with: node scripts/updateContestStatuses.js
 */

const mongoose = require('mongoose');
const Contest = require('../models/Contest');
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
    const now = new Date();
    
    // 1. Update contests that should now be ACTIVE
    const startingContests = await Contest.find({
      status: { $in: ['REGISTRATION_OPEN', 'UPCOMING'] },
      startDate: { $lte: now },
      endDate: { $gt: now }
    });
    
    if (startingContests.length > 0) {
      console.log(`Found ${startingContests.length} contests that should be ACTIVE now`);
      
      for (const contest of startingContests) {
        contest.status = 'ACTIVE';
        await contest.save();
        console.log(`Updated contest "${contest.name}" to ACTIVE status`);
      }
    } else {
      console.log('No contests to update to ACTIVE status');
    }
    
    // 2. Update contests that should now be COMPLETED
    const endingContests = await Contest.find({
      status: 'ACTIVE',
      endDate: { $lte: now }
    });
    
    if (endingContests.length > 0) {
      console.log(`Found ${endingContests.length} contests that should be COMPLETED now`);
      
      for (const contest of endingContests) {
        contest.status = 'COMPLETED';
        
        // Calculate final positions and prize money
        if (contest.participants && contest.participants.length > 0) {
          // Sort participants by currentBalance in descending order
          contest.participants.sort((a, b) => b.currentBalance - a.currentBalance);
          
          // Assign final positions
          contest.participants.forEach((participant, index) => {
            participant.finalPosition = index + 1;
            
            // Calculate prize money based on position
            const rank = (index + 1).toString();
            const prizePercentage = contest.prizeDistribution.get(rank);
            
            if (prizePercentage) {
              participant.prizeMoney = Math.round((prizePercentage / 100) * contest.prizePool);
              console.log(`Participant in position ${rank} wins ₹${participant.prizeMoney}`);
            }
          });
        }
        
        await contest.save();
        console.log(`Updated contest "${contest.name}" to COMPLETED status`);
      }
    } else {
      console.log('No contests to update to COMPLETED status');
    }
    
    // 3. Update upcoming contests to REGISTRATION_OPEN if within registration window
    const upcomingContests = await Contest.find({
      status: 'UPCOMING',
      registrationStartDate: { $lte: now },
      startDate: { $gt: now }
    });
    
    if (upcomingContests.length > 0) {
      console.log(`Found ${upcomingContests.length} upcoming contests that should open for registration now`);
      
      for (const contest of upcomingContests) {
        contest.status = 'REGISTRATION_OPEN';
        await contest.save();
        console.log(`Updated contest "${contest.name}" to REGISTRATION_OPEN status`);
      }
    } else {
      console.log('No contests to update to REGISTRATION_OPEN status');
    }
    
    console.log('Contest status updates completed');
    
  } catch (error) {
    console.error('Error updating contest statuses:', error);
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