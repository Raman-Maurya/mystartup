/**
 * Script to add funds to a user's wallet for testing purposes
 * 
 * Usage: node scripts/addFundsToWallet.js <username_or_email> <amount>
 * Example: node scripts/addFundsToWallet.js user@example.com 1000
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
    // Get arguments
    const usernameOrEmail = process.argv[2];
    const amount = parseFloat(process.argv[3]);
    
    // Validate arguments
    if (!usernameOrEmail) {
      console.error('Error: Please provide a username or email as the first argument');
      process.exit(1);
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
      console.error('Error: Please provide a valid positive amount as the second argument');
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
    
    console.log(`\nUser found: ${user.username} (${user.email})`);
    console.log(`Current wallet balance: ₹${user.walletBalance}`);
    
    // Create a payment record
    const payment = new Payment({
      user: user._id,
      amount: amount,
      type: 'DEPOSIT',
      status: 'COMPLETED',
      paymentMethod: 'SYSTEM',
      transactionId: `TEST_DEP_${Date.now()}`,
      description: 'Test deposit via script',
      completedAt: new Date()
    });
    
    // Save the payment
    await payment.save();
    
    // Update user's wallet balance
    user.walletBalance += amount;
    user.totalDeposited += amount;
    await user.save();
    
    console.log(`\nSuccessfully added ₹${amount} to ${user.username}'s wallet`);
    console.log(`New wallet balance: ₹${user.walletBalance}`);
    
  } catch (error) {
    console.error('Error adding funds:', error);
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