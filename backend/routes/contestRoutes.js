const express = require('express');
const router = express.Router();
const contestController = require('../controllers/contestController');
const { protect, restrictTo, setUserIfExists } = require('../middleware/authMiddleware');

// Public routes - anyone can view, but we'll try to identify the user if they're logged in
router.get('/', setUserIfExists, contestController.getAllContests);
router.get('/active', contestController.getActiveContests);

// Protected routes - require authentication
router.get('/user', protect, contestController.getUserContests);

// Parameterized routes
router.get('/:contestId', setUserIfExists, contestController.getContestById);
router.get('/:contestId/leaderboard', contestController.getLeaderboard);
router.get('/:contestId/stats', contestController.getContestStats);
router.post('/:contestId/join', protect, contestController.joinContest);
router.post('/:contestId/leave', protect, contestController.leaveContest);
router.post('/:contestId/trade', protect, contestController.placeTrade);
router.get('/:contestId/my-trades', protect, contestController.getUserTrades);

// Admin only routes
router.post('/', protect, restrictTo('ADMIN'), contestController.createContest);
router.put('/:contestId', protect, restrictTo('ADMIN'), contestController.updateContest);
router.delete('/:contestId', protect, restrictTo('ADMIN'), contestController.deleteContest);
router.post('/update-statuses', protect, restrictTo('ADMIN'), contestController.updateContestStatuses);

module.exports = router;