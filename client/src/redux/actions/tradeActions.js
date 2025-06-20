import axios from 'axios';

// Fetch user trades for a contest
export const fetchUserTrades = (contestId) => async (dispatch, getState) => {
  try {
    dispatch({ type: 'FETCH_TRADES_REQUEST' });
    
    // Preserve existing trades instead of resetting to empty
    // Get existing trades from state
    const existingTrades = getState().trades.trades || [];
    
    // In a real app, we would fetch from API here
    // For now, just return existing trades to maintain state
    dispatch({
      type: 'FETCH_TRADES_SUCCESS',
      payload: existingTrades
    });
    
    return existingTrades;
  } catch (error) {
    dispatch({
      type: 'FETCH_TRADES_FAILURE',
      payload: error.message
    });
  }
};

// Place a trade
export const placeTrade = (tradeData) => async (dispatch) => {
  try {
    // Mock response with realistic data but NO hardcoded profit
    const mockTrade = {
      _id: Date.now().toString(), // Use _id to match MongoDB standard
      symbol: tradeData.symbol,
      tradeType: tradeData.tradeType,
      quantity: parseInt(tradeData.quantity),
      price: tradeData.price, // Use the actual price from tradeData
      entryPrice: tradeData.price,
      currentPrice: tradeData.price, // Start with same price
      status: 'OPEN',
      timestamp: new Date().toISOString(),
      pnl: 0 // Start with zero P&L, not hardcoded
    };
    
    dispatch({
      type: 'PLACE_TRADE_SUCCESS',
      payload: mockTrade
    });
    
    // Start simulating price changes after a brief delay
    setTimeout(() => {
      simulatePriceChanges(dispatch, mockTrade);
    }, 2000);
    
    return mockTrade;
  } catch (error) {
    dispatch({
      type: 'FETCH_TRADES_FAILURE',
      payload: error.message
    });
    throw error;
  }
};

// Close a trade
export const closeTrade = (tradeId) => async (dispatch, getState) => {
  try {
    // Find the trade in the current state
    const trade = getState().trades.trades.find(t => t._id === tradeId);
    if (!trade) throw new Error('Trade not found');
    
    // Create a copy of the trade with closed status
    const mockClosedTrade = {
      ...trade,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      // Preserve the final PnL at closing time
      finalPnl: trade.pnl
    };
    
    // Dispatch action to update the trade in the store
    dispatch({
      type: 'CLOSE_TRADE_SUCCESS',
      payload: mockClosedTrade
    });
    
    // Stop any ongoing price simulations for this trade
    clearTradeSimulation(tradeId);
    
    return mockClosedTrade;
  } catch (error) {
    dispatch({
      type: 'FETCH_TRADES_FAILURE',
      payload: error.message
    });
    throw error;
  }
};

// Helper to track active simulations
const activeSimulations = {};

// Simulate realistic price changes on the trade
const simulatePriceChanges = (dispatch, trade) => {
  // Generate a random price movement between -3% to +3%
  const priceMovement = (Math.random() * 0.06) - 0.03; 
  const newPrice = Math.max(trade.entryPrice * (1 + priceMovement), 0.01);
  
  // Calculate new P&L based on new price
  const newPnL = trade.tradeType === 'BUY'
    ? (newPrice - trade.entryPrice) * trade.quantity
    : (trade.entryPrice - newPrice) * trade.quantity;
  
  // Update the trade with new price and P&L
  const updatedTrade = {
    ...trade,
    currentPrice: parseFloat(newPrice.toFixed(2)),
    pnl: parseFloat(newPnL.toFixed(2))
  };
  
  // Dispatch action to update the trade in the store
  dispatch({
    type: 'UPDATE_TRADE',
    payload: updatedTrade
  });
  
  // Continue simulation if trade is still open
  if (updatedTrade.status === 'OPEN') {
    // Store timeout ID so we can clear it later
    activeSimulations[trade._id] = setTimeout(() => {
      simulatePriceChanges(dispatch, updatedTrade);
    }, 5000); // Update every 5 seconds
  }
};

// Clear simulation for a specific trade
const clearTradeSimulation = (tradeId) => {
  if (activeSimulations[tradeId]) {
    clearTimeout(activeSimulations[tradeId]);
    delete activeSimulations[tradeId];
  }
};