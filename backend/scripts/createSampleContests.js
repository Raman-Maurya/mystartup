/**
 * Script to create sample contests for the trading platform
 * 
 * Run with: node scripts/createSampleContests.js
 */

const mongoose = require('mongoose');
const Contest = require('../models/Contest');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Sample contest templates
const contestTemplates = [
  {
    name: "Nifty50 Challenge",
    description: "Trade Nifty50 stocks and options to win big prizes!",
    entryFee: 100,
    maxParticipants: 100,
    minParticipants: 10,
    startDate: getDateAfterDays(1), // tomorrow
    endDate: getDateAfterDays(2),   // day after tomorrow
    prizePool: 9000,
    category: "nifty50",
    contestType: "PAID",
    status: "REGISTRATION_OPEN",    // Important: Set to REGISTRATION_OPEN to make it visible
    isPublished: true,              // Important: Must be published to be visible
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    virtualMoneyAmount: 50000
  },
  {
    name: "BankNifty Pro Trader",
    description: "Test your banking sector knowledge and trading skills!",
    entryFee: 200,
    maxParticipants: 50,
    minParticipants: 5,
    startDate: getDateAfterDays(1),
    endDate: getDateAfterDays(2),
    prizePool: 8000,
    category: "banknifty",
    contestType: "PAID",
    status: "REGISTRATION_OPEN",
    isPublished: true,
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    virtualMoneyAmount: 50000
  },
  {
    name: "Free Entry Stock Battle",
    description: "Perfect for beginners! Trade stocks with zero entry fee.",
    entryFee: 0,
    maxParticipants: 200,
    minParticipants: 20,
    startDate: getDateAfterDays(1),
    endDate: getDateAfterDays(3),
    prizePool: 1000,
    category: "stocks",
    contestType: "FREE",
    status: "REGISTRATION_OPEN",
    isPublished: true,
    image: "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    virtualMoneyAmount: 50000,
    stockCategory: "all"
  },
  {
    name: "Mega Trading Championship",
    description: "Our largest contest with the biggest prize pool!",
    entryFee: 500,
    maxParticipants: 500,
    minParticipants: 100,
    startDate: getDateAfterDays(7),  // Next week
    endDate: getDateAfterDays(14),   // Two weeks from now
    prizePool: 200000,
    category: "mixed",
    contestType: "PAID",
    status: "UPCOMING",
    isPublished: true,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    virtualMoneyAmount: 100000,
    highWinRate: false,
    isNew: true
  },
  {
    name: "Pharma Sector Special",
    description: "Focus on pharmaceutical stocks and win prizes!",
    entryFee: 150,
    maxParticipants: 50,
    minParticipants: 10,
    startDate: getDateAfterDays(2),
    endDate: getDateAfterDays(3),
    prizePool: 6000,
    category: "stocks",
    stockCategory: "pharma",
    contestType: "PAID",
    status: "REGISTRATION_OPEN",
    isPublished: true,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    virtualMoneyAmount: 50000
  }
];

// Helper function to get date after specified days
function getDateAfterDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/trading-contest', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB connected');
  
  try {
    // Check if we already have contests
    const existingContests = await Contest.countDocuments();
    
    if (existingContests > 0) {
      console.log(`Found ${existingContests} existing contests in the database.`);
      const shouldContinue = true; // In a real script, you might prompt the user
      
      if (!shouldContinue) {
        console.log('Exiting without creating new contests.');
        return;
      }
    }
    
    // Create contests
    console.log('Creating sample contests...');
    let createdCount = 0;
    
    for (const template of contestTemplates) {
      // Create new contest
      const contest = new Contest(template);
      
      // Set prize distribution
      if (template.contestType === 'FREE') {
        // For free contests, fewer winners
        contest.prizeDistribution = new Map([
          ['1', 70], // 70% to 1st place
          ['2', 30]  // 30% to 2nd place
        ]);
      } else {
        // For paid contests, use standard distribution
        contest.prizeDistribution = new Map([
          ['1', 60], // 60% to 1st place
          ['2', 30], // 30% to 2nd place
          ['3', 10]  // 10% to 3rd place
        ]);
      }
      
      // Create contest
      await contest.save();
      createdCount++;
      console.log(`Created contest: ${contest.name} - ID: ${contest._id}`);
    }
    
    console.log(`\nSuccessfully created ${createdCount} sample contests.`);
    
  } catch (error) {
    console.error('Error creating sample contests:', error);
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