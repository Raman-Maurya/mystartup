/**
 * Script to list all users in the database
 * 
 * Run with: node scripts/listUsers.js
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
      // Find all users
      const users = await User.find({}).select('-password');
      
      console.log('\nTotal users found:', users.length);
      
      if (users.length === 0) {
        console.log('No users found in the database.');
      } else {
        console.log('\nUsers in the database:');
        users.forEach((user, index) => {
          console.log(`\n${index + 1}. ${user.username} (${user.email})`);
          console.log(`   Role: ${user.role}`);
          console.log(`   Status: ${user.accountStatus}`);
          console.log(`   Created: ${user.createdAt}`);
          console.log(`   Wallet Balance: ₹${user.walletBalance}`);
        });
      }
      
    } catch (error) {
      console.error('Error listing users:', error);
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