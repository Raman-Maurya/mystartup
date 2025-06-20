const virtualWalletService = require('../services/virtualWalletService');

/**
 * Get all virtual wallets for the authenticated user
 * @route GET /api/virtual-wallets
 */
const getUserVirtualWallets = async (req, res) => {
  try {
    const userId = req.user.id;
    const wallets = await virtualWalletService.getUserVirtualWallets(userId);
    
    res.status(200).json({
      success: true,
      data: wallets
    });
  } catch (error) {
    console.error('Error fetching virtual wallets:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get a specific virtual wallet by contest ID
 * @route GET /api/virtual-wallets/:contestId
 */
const getVirtualWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contestId } = req.params;
    
    const wallet = await virtualWalletService.getVirtualWalletBalance(userId, contestId);
    
    res.status(200).json({
      success: true,
      data: wallet
    });
  } catch (error) {
    console.error('Error fetching virtual wallet:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Initialize a virtual wallet for a contest
 * @route POST /api/virtual-wallets/:contestId/initialize
 */
const initializeVirtualWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contestId } = req.params;
    
    const wallet = await virtualWalletService.initializeVirtualWallet(userId, contestId);
    
    res.status(200).json({
      success: true,
      data: wallet
    });
  } catch (error) {
    console.error('Error initializing virtual wallet:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getUserVirtualWallets,
  getVirtualWallet,
  initializeVirtualWallet
}; 