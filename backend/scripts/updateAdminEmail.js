/**
 * Script to update admin email to admin@example.com
 * 
 * Run with: node scripts/updateAdminEmail.js
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
      // Find admin user
      const adminUser = await User.findOne({ username: 'admin' });
      
      if (!adminUser) {
        console.log('No admin user found. Creating one...');
        
        // Create new admin user
        const newAdmin = new User({
          username: 'admin',
          email: 'admin@example.com',
          password: 'admin1234', // Will be hashed by model pre-save hook
          firstName: 'Admin',
          lastName: 'User',
          accountStatus: 'ACTIVE',
          role: 'ADMIN',
          walletBalance: 10000
        });
        
        await newAdmin.save();
        console.log('New admin user created successfully!');
      } else {
        console.log('Admin user found. Updating email...');
        console.log(`Current email: ${adminUser.email}`);
        
        // Update admin email
        adminUser.email = 'admin@example.com';
        await adminUser.save();
        
        console.log('Admin email updated to admin@example.com');
      }
      
      console.log('\nAdmin credentials:');
      console.log('Email: admin@example.com');
      console.log('Password: admin1234');
      
    } catch (error) {
      console.error('Error updating admin email:', error);
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