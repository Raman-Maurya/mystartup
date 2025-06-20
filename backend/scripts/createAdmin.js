/**
 * Script to create an admin user in the database
 * 
 * Run with: node scripts/createAdmin.js
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
      // Define admin user details
      const adminData = {
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin1234', // Will be hashed
        firstName: 'Admin',
        lastName: 'User',
        accountStatus: 'ACTIVE',
        role: 'ADMIN',
        walletBalance: 10000 // Give admin some initial balance
      };
      
      // Check if admin already exists by email or username
      const existingAdmin = await User.findOne({ 
        $or: [
          { email: adminData.email },
          { username: adminData.username }
        ]
      });
      
      if (existingAdmin) {
        console.log('Admin user already exists!');
        
        // Update role if needed
        if (existingAdmin.role !== 'ADMIN') {
          existingAdmin.role = 'ADMIN';
          await existingAdmin.save();
          console.log('Updated existing user to ADMIN role');
        }
      } else {
        // Create new admin user
        const admin = new User(adminData);
        await admin.save();
        console.log('Admin user created successfully!');
      }
      
      // Create a test user as well
      const testUserData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'test1234', // Will be hashed
        firstName: 'Test',
        lastName: 'User',
        accountStatus: 'ACTIVE',
        role: 'USER',
        walletBalance: 5000 // Give test user some initial balance
      };
      
      // Check if test user already exists
      const existingTestUser = await User.findOne({ 
        $or: [
          { email: testUserData.email },
          { username: testUserData.username }
        ]
      });
      
      if (existingTestUser) {
        console.log('Test user already exists!');
      } else {
        const testUser = new User(testUserData);
        await testUser.save();
        console.log('Test user created successfully!');
      }
      
      console.log('\nAdmin credentials:');
      console.log('Email: admin@example.com');
      console.log('Password: admin1234');
      
      console.log('\nTest user credentials:');
      console.log('Email: test@example.com');
      console.log('Password: test1234');
      
    } catch (error) {
      console.error('Error creating users:', error);
    } finally {
      // Close the connection
      mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
