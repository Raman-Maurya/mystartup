const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { 
  getDashboardStats, 
  getAllContests,
  updateContestStatus,
  deleteContest
} = require('../controllers/adminController');

// All routes require admin authentication
router.use(protect);
router.use(restrictTo('ADMIN'));

// Admin dashboard statistics
router.get('/stats', getDashboardStats);

// Contest management
router.get('/contests', getAllContests);
router.put('/contests/:contestId/status', updateContestStatus);
router.delete('/contests/:contestId', deleteContest);

module.exports = router; 