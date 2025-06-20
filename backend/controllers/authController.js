const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Define a consistent JWT_SECRET if environment variable is not set
const JWT_SECRET = process.env.JWT_SECRET || 'tradingtournament2024secret';

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already in use' : 'Username already taken'
      });
    }
    
    // Create new user
    const user = new User({
      username,
      email,
      password, // Will be hashed in the pre-save hook
      firstName: firstName || username, // Use username as default firstName if not provided
      lastName: lastName || '', // Use empty string as default lastName if not provided
      accountStatus: 'ACTIVE', // Set as ACTIVE by default for now
      role: 'USER' // Default role is USER
    });
    
    await user.save();
    
    // Generate token with user role
    const token = jwt.sign(
      { 
        id: user._id,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // Return user data and token (excluding password)
    const userData = user.toObject();
    delete userData.password;
    
    res.status(201).json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if account is active
    if (user.accountStatus !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active. Please contact support.'
      });
    }
    
    // Generate token with user role
    const token = jwt.sign(
      { 
        id: user._id,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // Update last login time
    user.lastLogin = new Date();
    await user.save();
    
    // Return user data and token (excluding password)
    const userData = user.toObject();
    delete userData.password;
    
    res.status(200).json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving profile',
      error: error.message
    });
  }
}; 