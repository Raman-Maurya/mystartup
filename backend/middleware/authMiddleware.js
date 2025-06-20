const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');

// Define a consistent JWT_SECRET if environment variable is not set
const JWT_SECRET = process.env.JWT_SECRET || 'tradingtournament2024secret';

// Protect routes - verify token and set user on request
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      // Check if token exists in cookies
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('Not authorized. Please log in to access this resource.', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find the user
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new AppError('User not found. Please log in again.', 401));
    }

    // Check if user changed password after token was issued
    if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
      return next(new AppError('User recently changed password. Please log in again.', 401));
    }

    // Set user on request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired. Please log in again.', 401));
    }
    next(error);
  }
};

// Restrict routes to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user should exist from the protect middleware
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// Refresh user token or issue a new one
exports.refreshToken = async (req, res, next) => {
  try {
    // Get token from request
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('No token found. Please log in again.', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }

    // Check if user changed password after token was issued
    if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
      return next(new AppError('User recently changed password. Please log in again.', 401));
    }

    // Generate a new token
    const newToken = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY || '30d',
    });

    // Set cookie
    const cookieOptions = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRY || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', newToken, cookieOptions);

    // Send response
    res.status(200).json({
      success: true,
      token: newToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Public middleware to set user if token is present (for non-protected routes)
exports.setUserIfExists = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      // Check if token exists in cookies
      token = req.cookies.jwt;
    }

    if (!token) {
      // No token, continue without setting user
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find the user
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      // No user, continue without setting user
      return next();
    }

    // Set user on request
    req.user = user;
    next();
  } catch (error) {
    // Any error with token verification, continue without setting user
    next();
  }
}; 