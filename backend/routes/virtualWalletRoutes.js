const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const virtualWalletController = require('../controllers/virtualWalletController');

/**
 * Virtual Wallet Routes
 */

// Get user's virtual wallets across all contests
router.get('/', authenticateUser, virtualWalletController.getUserVirtualWallets);

// Get virtual wallet for a specific contest
router.get('/:contestId', authenticateUser, virtualWalletController.getVirtualWallet);

// Initialize virtual wallet for a contest
router.post('/:contestId/initialize', authenticateUser, virtualWalletController.initializeVirtualWallet);

module.exports = router; 