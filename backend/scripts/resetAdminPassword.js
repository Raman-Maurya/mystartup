/**
 * Script to reset admin password to admin1234
 * 
 * Run with: node scripts/resetAdminPassword.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
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
      // Find admin user
      const adminUser = await User.findOne({ username: 'admin' });
      
      if (!adminUser) {
        console.log('No admin user found. Please run createAdmin.js first.');
      } else {
        console.log('Admin user found. Resetting password...');
        
        // Hash new password (bypass model's pre-save hook)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin1234', salt);
        
        // Update admin password directly
        await User.updateOne(
          { _id: adminUser._id }, 
          { $set: { password: hashedPassword } }
        );
        
        console.log('Admin password reset to: admin1234');
        
        console.log('\nAdmin credentials:');
        console.log('Email:', adminUser.email);
        console.log('Password: admin1234');
      }
      
    } catch (error) {
      console.error('Error resetting admin password:', error);
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