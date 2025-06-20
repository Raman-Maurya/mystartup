/**
 * Script to check a user's wallet balance
 * 
 * Usage: node scripts/checkWalletBalance.js <username_or_email>
 * Example: node scripts/checkWalletBalance.js user@example.com
 */

const mongoose = require('mongoose');
const User = require('../models/User');
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
    // Get arguments
    const usernameOrEmail = process.argv[2];
    
    // Validate arguments
    if (!usernameOrEmail) {
      console.error('Error: Please provide a username or email as the first argument');
      process.exit(1);
    }
    
    // Find the user
    const user = await User.findOne({
      $or: [
        { username: usernameOrEmail },
        { email: usernameOrEmail }
      ]
    });
    
    if (!user) {
      console.error('Error: User not found');
      process.exit(1);
    }
    
    console.log(`\nUser: ${user.username} (${user.email})`);
    console.log(`Wallet Balance: ₹${user.walletBalance}`);
    console.log(`Total Deposited: ₹${user.totalDeposited}`);
    console.log(`Total Withdrawn: ₹${user.totalWithdrawn}`);
    console.log(`Total Winnings: ₹${user.totalWinnings}`);
    console.log(`Total Entry Fees: ₹${user.totalEntryFees}`);
    
  } catch (error) {
    console.error('Error checking wallet balance:', error);
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