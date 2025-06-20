import {
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,
  LOGOUT,
  REGISTER_REQUEST,
  REGISTER_SUCCESS,
  REGISTER_FAILURE,
  DEPOSIT_FUNDS_REQUEST,
  DEPOSIT_FUNDS_SUCCESS,
  DEPOSIT_FUNDS_FAILURE,
  UPDATE_WALLET_BALANCE
} from '../actions/authActions';

const initialState = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
  walletLoading: false,
  walletError: null,
  lastTransaction: null
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOGIN_REQUEST:
    case REGISTER_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };
      
    case LOGIN_SUCCESS:
    case REGISTER_SUCCESS:
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false,
        error: null
      };
      
    case LOGIN_FAILURE:
    case REGISTER_FAILURE:
      return {
        ...state,
        token: null,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };
      
    case LOGOUT:
      return {
        ...state,
        token: null,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };

    case DEPOSIT_FUNDS_REQUEST:
      return {
        ...state,
        walletLoading: true,
        walletError: null
      };

    case DEPOSIT_FUNDS_SUCCESS:
      return {
        ...state,
        walletLoading: false,
        user: {
          ...state.user,
          walletBalance: action.payload.newBalance
        },
        lastTransaction: action.payload.transaction
      };

    case DEPOSIT_FUNDS_FAILURE:
      return {
        ...state,
        walletLoading: false,
        walletError: action.payload
      };

    case UPDATE_WALLET_BALANCE:
      return {
        ...state,
        user: {
          ...state.user,
          walletBalance: action.payload
        }
      };
      
    default:
      return state;
  }
};

export default authReducer;