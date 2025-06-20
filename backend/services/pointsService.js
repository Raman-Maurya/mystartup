/**
 * Service for calculating and managing contest points
 */

/**
 * Calculate points based on PnL value
 * Points formula aims to normalize profits into a balanced scoring system
 * 
 * @param {Number} pnl - The profit and loss value
 * @param {Number} initialBalance - The initial virtual balance
 * @param {Number} tradeCount - Number of trades made
 * @return {Number} The calculated points
 */
const calculatePoints = (pnl, initialBalance = 100000, tradeCount = 0) => {
  // Base points calculation from PnL percentage
  const pnlPercentage = (pnl / initialBalance) * 100;
  
  // Scale the percentage to points with a non-linear formula
  // This ensures small gains don't get too few points and huge gains don't get astronomically high points
  let basePoints = 0;
  
  if (pnlPercentage > 0) {
    // Positive PnL - logarithmic scale to reward results while preventing extreme scores
    // Increased multiplier to give more weight to PnL (300 -> 500)
    basePoints = 200 + (Math.log10(pnlPercentage + 1) * 500);
  } else if (pnlPercentage < 0) {
    // Negative PnL - points still possible but lower
    // Minimum score is 100
    // Increased penalty for negative PnL (5 -> 8) to increase spread between winners and losers
    basePoints = Math.max(100, 200 + (pnlPercentage * 8));
  } else {
    // Zero PnL - starting points
    basePoints = 200;
  }
  
  // Additional points for trade activity (small bonus to encourage participation)
  // Reduced the trade activity bonus to prioritize PnL (5 -> 2)
  const activityBonus = Math.min(30, tradeCount * 2);
  
  // Final points calculation (rounded to nearest integer)
  return Math.round(basePoints + activityBonus);
};

/**
 * Calculate ranking points specifically for prize distribution
 * This puts even more emphasis on actual PnL performance
 * 
 * @param {Number} pnl - The profit and loss value
 * @param {Number} initialBalance - The initial virtual balance
 * @return {Number} The calculated ranking points
 */
const calculateRankingPoints = (pnl, initialBalance = 100000) => {
  // For ranking and prize distribution, we focus heavily on PnL percentage
  const pnlPercentage = (pnl / initialBalance) * 100;
  
  // For positive PnL, award points directly proportional to performance
  if (pnlPercentage > 0) {
    // Use square root to flatten extremely high returns slightly
    return 1000 + (Math.sqrt(pnlPercentage) * 300);
  } 
  // For negative or zero PnL, still provide a base score
  else {
    // Negative PnL gets significantly fewer points to ensure winners are rewarded
    return Math.max(100, 500 + (pnlPercentage * 20));
  }
};

/**
 * Determine prize money distribution based on final rankings
 * 
 * @param {Array} participants - Sorted array of participants with points and PnL
 * @param {Number} totalPrizePool - Total prize money to distribute
 * @param {Object} distribution - Prize distribution object from contest configuration (e.g., {'1': 50, '2': 30, '3': 20})
 * @return {Array} Updated participants with prize money allocated
 */
const distributePrizeMoney = (participants, totalPrizePool, distribution) => {
  // Never use default distribution - always respect the admin-defined distribution
  const prizeDistribution = distribution || {};
  
  // Sort participants by ranking points (which prioritize PnL)
  const rankedParticipants = [...participants].map(participant => {
    // Calculate ranking points which puts more emphasis on PnL
    const rankingPoints = calculateRankingPoints(
      participant.currentPnL,
      participant.initialBalance || 100000
    );
    
    return {
      ...participant,
      rankingPoints
    };
  }).sort((a, b) => b.rankingPoints - a.rankingPoints);
  
  // Assign ranks and prize money
  return rankedParticipants.map((participant, index) => {
    const rank = index + 1;
    const rankStr = rank.toString();
    
    // Calculate prize money if this rank is in the distribution
    let prizeMoney = 0;
    if (prizeDistribution[rankStr]) {
      prizeMoney = (totalPrizePool * prizeDistribution[rankStr]) / 100;
    }
    
    return {
      ...participant,
      rank,
      prizeMoney
    };
  });
};

/**
 * Recalculate points for all participants in a contest
 * 
 * @param {Array} participants - Array of contest participants with PnL and trade data
 * @param {Number} initialBalance - Starting balance for the contest
 * @return {Array} Updated participants array with points
 */
const updateContestPoints = (participants, initialBalance) => {
  return participants.map(participant => {
    const tradeCount = participant.trades.length;
    const points = calculatePoints(participant.currentPnL, initialBalance, tradeCount);
    
    return {
      ...participant,
      points
    };
  });
};

/**
 * Calculate bonus points for consecutive profitable trades
 * 
 * @param {Number} consecutiveTrades - Number of consecutive profitable trades
 * @param {Number} baseBonus - Base bonus points per consecutive trade
 * @param {Number} maxMultiplier - Maximum bonus multiplier
 * @return {Number} Bonus points
 */
const calculateConsecutiveBonus = (consecutiveTrades, baseBonus = 5, maxMultiplier = 5) => {
  if (consecutiveTrades <= 1) return 0;
  
  const multiplier = Math.min(consecutiveTrades - 1, maxMultiplier);
  return baseBonus * multiplier;
};

/**
 * Calculate points for a single trade
 * 
 * @param {Object} trade - Trade object with profit/loss data
 * @param {Object} pointSystem - Point system rules
 * @param {Number} initialBalance - Initial balance
 * @param {Number} consecutiveTrades - Current consecutive profitable trades
 * @return {Object} Points data
 */
const calculateTradePoints = (trade, pointSystem, initialBalance, consecutiveTrades = 0) => {
  const profit = trade.pnl || 0;
  const profitPercentage = (profit / initialBalance) * 100;
  let points = 0;
  let reason = '';
  
  if (profit > 0) {
    // Base points for profitable trade
    const basePoints = pointSystem.rules.profitableTradeBasePoints;
    
    // Points based on profit percentage
    const profitPoints = profitPercentage * pointSystem.rules.profitPercentageMultiplier;
    
    // Consecutive trade bonus
    const consecutiveBonus = consecutiveTrades > 1 ? 
      Math.min(
        consecutiveTrades * pointSystem.rules.consecutiveProfitableTradeBonus,
        pointSystem.rules.maxConsecutiveMultiplier * pointSystem.rules.consecutiveProfitableTradeBonus
      ) : 0;
    
    points = basePoints + profitPoints + consecutiveBonus;
    reason = `Profitable trade: ${basePoints} base + ${profitPoints.toFixed(1)} profit + ${consecutiveBonus} streak`;
  } else {
    // Points for loss (usually negative)
    points = pointSystem.rules.lossTradePoints;
    reason = `Unprofitable trade: ${points} points`;
  }
  
  return {
    points: Math.round(points),
    reason,
    profitPercentage
  };
};

module.exports = {
  calculatePoints,
  calculateRankingPoints,
  updateContestPoints,
  calculateConsecutiveBonus,
  calculateTradePoints,
  distributePrizeMoney
}; 