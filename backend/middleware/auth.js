const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { AuthenticationError } = require('../utils/customErrors');

// Polyfill for atob in Node.js
const atob = (base64) => {
  return Buffer.from(base64, 'base64').toString('binary');
};

// Define a consistent JWT_SECRET if environment variable is not set
const JWT_SECRET = process.env.JWT_SECRET || 'tradingtournament2024secret';

/**
 * Middleware to authenticate user tokens
 */
const authenticateUser = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }
    
    // Check if it's a mock token for development
    let decoded;
    if (process.env.NODE_ENV !== 'production' && token.includes('eyJ')) {
      // This is a mock token, parse it manually
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          decoded = JSON.parse(atob(parts[1])); // Parse the payload part
        } else {
          throw new Error('Invalid token format');
        }
      } catch (e) {
        return res.status(401).json({
          success: false,
          message: 'Invalid mock token format'
        });
      }
    } else {
      // Regular JWT verification
      decoded = jwt.verify(token, JWT_SECRET);
    }
    
    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. User not found.' 
      });
    }
    
    // Check if user is active
    if (user.accountStatus !== 'ACTIVE') {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is not active. Please contact support.' 
      });
    }
    
    // Add user to request
    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: 'user'
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

/**
 * Middleware to authenticate admin tokens
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }
    
    // Check if it's a mock token for development
    let decoded;
    if (process.env.NODE_ENV !== 'production' && token.includes('eyJ')) {
      // This is a mock token, parse it manually
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          decoded = JSON.parse(atob(parts[1])); // Parse the payload part
          // Check if this is an admin token (based on role)
          if (decoded.role === 'ADMIN') {
            console.log('Admin authentication successful via mock token');
            // For development, allow mock admin access without DB lookup
            req.admin = {
              id: decoded.id || 'mock-admin-id',
              username: 'admin',
              email: 'admin@example.com',
              role: 'ADMIN',
              permissions: {
                manageContests: true,
                // Add other permissions as needed
              }
            };
            return next();
          } else {
            console.log('Token does not have ADMIN role:', decoded.role);
          }
        }
      } catch (e) {
        return res.status(401).json({
          success: false,
          message: 'Invalid mock token format'
        });
      }
    } else {
      // Regular JWT verification
      decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || JWT_SECRET);
      
      // Find admin in database
      const admin = await Admin.findById(decoded.id);
      
      if (!admin) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token. Admin not found.' 
        });
      }
      
      // Check if admin is active
      if (!admin.isActive) {
        return res.status(403).json({ 
          success: false, 
          message: 'Admin account is not active.' 
        });
      }
      
      // Add admin to request
      req.admin = {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions
      };
      
      // Admin is now populated in req.admin, continue to the next middleware
      next();
    }
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid admin token.' 
    });
  }
};

/**
 * Middleware to check if admin has specific permission
 * @param {string} permission - The permission to check
 */
const checkAdminPermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
    }
    
    // Super admins have all permissions
    if (req.admin.role === 'SUPER_ADMIN') {
      return next();
    }
    
    // Check specific permission
    if (!req.admin.permissions || !req.admin.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateUser,
  authenticateAdmin,
  checkAdminPermission
}; 