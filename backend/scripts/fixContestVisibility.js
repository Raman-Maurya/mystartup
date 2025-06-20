/**
 * Script to fix contest visibility issues
 * This script ensures contests have the correct status and isPublished flag
 * 
 * Run with: node scripts/fixContestVisibility.js
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
    
    // Get all contests
    const allContests = await Contest.find({});
    console.log(`Found ${allContests.length} contests in total`);
    
    // Count contests by status before changes
    const initialStatusCounts = {};
    allContests.forEach(contest => {
      initialStatusCounts[contest.status] = (initialStatusCounts[contest.status] || 0) + 1;
    });
    console.log('Initial status counts:', initialStatusCounts);
    
    // Count published vs unpublished
    const publishedCount = allContests.filter(c => c.isPublished).length;
    const unpublishedCount = allContests.filter(c => !c.isPublished).length;
    console.log(`Published: ${publishedCount}, Unpublished: ${unpublishedCount}`);
    
    let updatedCount = 0;
    
    // Process each contest
    for (const contest of allContests) {
      let updated = false;
      
      // 1. Fix isPublished flag - make sure all contests are published
      if (!contest.isPublished) {
        contest.isPublished = true;
        updated = true;
        console.log(`Set contest "${contest.name}" to published`);
      }
      
      // 2. Fix status based on dates
      const startDate = new Date(contest.startDate);
      const endDate = new Date(contest.endDate);
      const registrationStartDate = new Date(contest.registrationStartDate);
      
      // Determine correct status based on dates
      let correctStatus;
      
      if (endDate < now) {
        // Contest has ended
        correctStatus = 'COMPLETED';
      } else if (startDate <= now && endDate > now) {
        // Contest is currently running
        correctStatus = 'ACTIVE';
      } else if (registrationStartDate <= now && startDate > now) {
        // Registration period
        correctStatus = 'REGISTRATION_OPEN';
      } else if (startDate > now) {
        // Future contest
        correctStatus = 'UPCOMING';
      }
      
      // Update status if needed
      if (correctStatus && contest.status !== correctStatus) {
        console.log(`Changing contest "${contest.name}" status from ${contest.status} to ${correctStatus}`);
        contest.status = correctStatus;
        updated = true;
      }
      
      // Save changes if needed
      if (updated) {
        await contest.save();
        updatedCount++;
      }
    }
    
    // Get all contests again to verify changes
    const updatedContests = await Contest.find({});
    
    // Count contests by status after changes
    const finalStatusCounts = {};
    updatedContests.forEach(contest => {
      finalStatusCounts[contest.status] = (finalStatusCounts[contest.status] || 0) + 1;
    });
    
    console.log('\nFinal status counts:', finalStatusCounts);
    console.log(`Published: ${updatedContests.filter(c => c.isPublished).length}`);
    console.log(`\nUpdated ${updatedCount} contests`);
    
    // Count visible contests (published + correct status)
    const visibleContests = updatedContests.filter(c => 
      c.isPublished && 
      ['UPCOMING', 'REGISTRATION_OPEN', 'ACTIVE'].includes(c.status)
    );
    
    console.log(`\nVisible contests: ${visibleContests.length}`);
    console.log('Visible contest names:');
    visibleContests.forEach(c => console.log(`- ${c.name} (${c.status})`));
    
    if (visibleContests.length === 0) {
      console.log('\nNo visible contests! Creating a sample contest...');
      
      // Create a sample contest that will be immediately visible
      const sampleContest = new Contest({
        name: "Quick Start Trading Contest",
        description: "Join this contest to start trading right away!",
        entryFee: 100,
        maxParticipants: 100,
        minParticipants: 2,
        startDate: new Date(), // starts now
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // ends in 24 hours
        registrationStartDate: new Date(Date.now() - 60 * 60 * 1000), // started 1 hour ago
        registrationEndDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // ends in 12 hours
        prizePool: 9000,
        category: "nifty50",
        contestType: "PAID",
        status: "ACTIVE",
        isPublished: true,
        virtualMoneyAmount: 50000,
        prizeDistribution: new Map([
          ['1', 60],
          ['2', 30],
          ['3', 10]
        ])
      });
      
      await sampleContest.save();
      console.log(`Created new contest: ${sampleContest.name} with ID: ${sampleContest._id}`);
    }
    
  } catch (error) {
    console.error('Error fixing contest visibility:', error);
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