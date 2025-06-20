/**
 * Script to test login credentials directly
 * 
 * Run with: node scripts/testLogin.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

// Define a consistent JWT_SECRET if environment variable is not set
const JWT_SECRET = process.env.JWT_SECRET || 'tradingtournament2024secret';

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/trading-contest', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(async () => {
    console.log('MongoDB connected');
    
    try {
      // Test credentials
      const email = 'admin@example.com';
      const password = 'admin1234';
      
      console.log('Testing login with:', { email, password });
      
      // Find user
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        console.error('User not found with email:', email);
        process.exit(1);
      }
      
      console.log('User found:', {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        passwordLength: user.password?.length
      });
      
      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        console.error('Password does not match!');
        
        // Create a new password hash for testing
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        console.log('New password hash created:', hashedPassword);
        
        // Update the user's password
        user.password = hashedPassword;
        await user.save();
        
        console.log('Password updated for user:', user.email);
      } else {
        console.log('Password matches!');
        
        // Generate token
        const token = jwt.sign(
          { 
            id: user._id,
            role: user.role 
          },
          JWT_SECRET,
          { expiresIn: '30d' }
        );
        
        console.log('Generated token:', token);
      }
      
    } catch (error) {
      console.error('Error testing login:', error);
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