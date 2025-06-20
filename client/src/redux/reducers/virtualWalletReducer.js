// Action types
const INITIALIZE_VIRTUAL_WALLET = 'INITIALIZE_VIRTUAL_WALLET';
const UPDATE_VIRTUAL_WALLET = 'UPDATE_VIRTUAL_WALLET';
const FETCH_VIRTUAL_BALANCES_SUCCESS = 'FETCH_VIRTUAL_BALANCES_SUCCESS';
const TRADE_COMPLETED = 'TRADE_COMPLETED';

const initialState = {
  // Map of contestId -> { balance, initialBalance, pnl }
  contests: {},
  loading: false,
  error: null
};

const virtualWalletReducer = (state = initialState, action) => {
  switch (action.type) {
    case INITIALIZE_VIRTUAL_WALLET:
      return {
        ...state,
        contests: {
          ...state.contests,
          [action.payload.contestId]: {
            balance: action.payload.amount,
            initialBalance: action.payload.amount,
            pnl: 0
          }
        }
      };
      
    case UPDATE_VIRTUAL_WALLET:
      return {
        ...state,
        contests: {
          ...state.contests,
          [action.payload.contestId]: {
            ...state.contests[action.payload.contestId],
            balance: action.payload.balance,
            pnl: action.payload.pnl
          }
        }
      };
      
    case FETCH_VIRTUAL_BALANCES_SUCCESS:
      return {
        ...state,
        contests: {
          ...state.contests,
          ...action.payload
        }
      };
      
    case TRADE_COMPLETED:
      const contestId = action.payload.contestId;
      const currentContest = state.contests[contestId];
      
      if (!currentContest) return state;
      
      const tradeAmount = action.payload.quantity * action.payload.price;
      const newBalance = action.payload.tradeType === 'BUY'
        ? currentContest.balance - tradeAmount
        : currentContest.balance + tradeAmount;
      
      return {
        ...state,
        contests: {
          ...state.contests,
          [contestId]: {
            ...currentContest,
            balance: newBalance,
            pnl: currentContest.initialBalance - newBalance
          }
        }
      };
      
    default:
      return state;
  }
};

// Action creators
export const initializeVirtualWallet = (contestId, amount) => ({
  type: INITIALIZE_VIRTUAL_WALLET,
  payload: { contestId, amount }
});

export const updateVirtualWallet = (contestId, balance, pnl) => ({
  type: UPDATE_VIRTUAL_WALLET,
  payload: { contestId, balance, pnl }
});

export const fetchVirtualBalancesSuccess = (balances) => ({
  type: FETCH_VIRTUAL_BALANCES_SUCCESS,
  payload: balances
});

export const tradeCompleted = (trade) => ({
  type: TRADE_COMPLETED,
  payload: trade
});

export default virtualWalletReducer; 