/**
 * Script to initialize all users with ₹5000 in their wallet if they have less
 * 
 * Run with: node scripts/initializeUserWallets.js
 */

const mongoose = require('mongoose');
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
    // Find all users with wallet balance less than 5000
    const users = await User.find({ walletBalance: { $lt: 5000 } });
    
    console.log(`Found ${users.length} users with less than ₹5000 in their wallets`);
    
    if (users.length === 0) {
      console.log('All users already have at least ₹5000. No updates needed.');
      return;
    }
    
    // Update each user's wallet
    let updatedCount = 0;
    for (const user of users) {
      const amountToAdd = 5000 - user.walletBalance;
      console.log(`Adding ₹${amountToAdd} to ${user.username}'s wallet`);
      
      // Create a payment record
      const payment = new Payment({
        user: user._id,
        amount: amountToAdd,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        paymentMethod: 'SYSTEM',
        transactionId: `INIT_${Date.now()}_${user._id.toString().substring(0, 6)}`,
        description: 'Initial wallet balance',
        completedAt: new Date()
      });
      
      // Save the payment
      await payment.save();
      
      // Update user's wallet balance
      user.walletBalance = 5000;
      user.totalDeposited += amountToAdd;
      await user.save();
      
      updatedCount++;
    }
    
    console.log(`Successfully updated ${updatedCount} user wallets to ₹5000`);
    
  } catch (error) {
    console.error('Error initializing user wallets:', error);
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