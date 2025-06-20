const initialState = {
  trades: [],
  loading: false,
  error: null
};

const tradeReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_TRADES_REQUEST':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'FETCH_TRADES_SUCCESS':
      return {
        ...state,
        trades: action.payload,
        loading: false
      };
    case 'FETCH_TRADES_FAILURE':
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    case 'PLACE_TRADE_SUCCESS':
      return {
        ...state,
        trades: [...state.trades, action.payload]
      };
    case 'CLOSE_TRADE_SUCCESS':
      return {
        ...state,
        trades: state.trades.map(trade => 
          trade._id === action.payload._id ? action.payload : trade
        )
      };
    case 'UPDATE_TRADE':
      return {
        ...state,
        trades: state.trades.map(trade => 
          trade._id === action.payload._id ? action.payload : trade
        )
      };
    default:
      return state;
  }
};

export default tradeReducer;