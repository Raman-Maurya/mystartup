const express = require('express');
const router = express.Router();
const marketDataController = require('../controllers/marketDataController');
const { authenticateUser } = require('../middleware/auth');

// Optional authentication middleware for development
const optionalAuth = (req, res, next) => {
  // In development, proceed even without authentication
  if (process.env.NODE_ENV !== 'production') {
    // If no user is authenticated, create a mock user
    if (!req.user) {
      req.user = {
        id: 'dev-user',
        username: 'dev',
        email: 'dev@example.com',
        role: 'user'
      };
    }
    return next();
  }
  
  // In production, use real authentication
  authenticateUser(req, res, next);
};

// Option Chain routes
router.get('/option-chain/:symbol', optionalAuth, marketDataController.getOptionChain);
router.get('/option-chain/stock/:symbol', optionalAuth, marketDataController.getStockOptionChain);

// Price data routes
router.get('/price/:symbol', optionalAuth, marketDataController.getStockPrice);
router.get('/prices', optionalAuth, marketDataController.getMultipleStockPrices);

// Historical data routes
router.get('/historical/:symbol', optionalAuth, marketDataController.getHistoricalData);

// Market status and indices
router.get('/market-status', marketDataController.getMarketStatus);
router.get('/indices', marketDataController.getIndices);

module.exports = router; 