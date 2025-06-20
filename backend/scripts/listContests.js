/**
 * Script to list all contests in the database
 * 
 * Run with: node scripts/listContests.js
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
      // Find all contests
      const contests = await Contest.find({}).lean();
      
      console.log('\nTotal contests found:', contests.length);
      
      if (contests.length === 0) {
        console.log('No contests found in the database.');
      } else {
        console.log('\nContests in the database:');
        contests.forEach((contest, index) => {
          console.log(`\n${index + 1}. ${contest.name}`);
          console.log(`   Status: ${contest.status}`);
          console.log(`   Entry Fee: ₹${contest.entryFee}`);
          console.log(`   Prize Pool: ₹${contest.prizePool}`);
          console.log(`   Max Participants: ${contest.maxParticipants}`);
          console.log(`   Current Participants: ${contest.participants ? contest.participants.length : 0}`);
          console.log(`   Start Date: ${new Date(contest.startDate).toLocaleString()}`);
          console.log(`   End Date: ${new Date(contest.endDate).toLocaleString()}`);
          console.log(`   Is Published: ${contest.isPublished}`);
        });
      }
      
    } catch (error) {
      console.error('Error listing contests:', error);
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