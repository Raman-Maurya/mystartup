import axios from 'axios';

// Action Types
export const LOGIN_REQUEST = 'LOGIN_REQUEST';
export const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
export const LOGIN_FAILURE = 'LOGIN_FAILURE';
export const LOGOUT = 'LOGOUT';
export const REGISTER_REQUEST = 'REGISTER_REQUEST';
export const REGISTER_SUCCESS = 'REGISTER_SUCCESS';
export const REGISTER_FAILURE = 'REGISTER_FAILURE';
export const DEPOSIT_FUNDS_REQUEST = 'DEPOSIT_FUNDS_REQUEST';
export const DEPOSIT_FUNDS_SUCCESS = 'DEPOSIT_FUNDS_SUCCESS';
export const DEPOSIT_FUNDS_FAILURE = 'DEPOSIT_FUNDS_FAILURE';
export const UPDATE_WALLET_BALANCE = 'UPDATE_WALLET_BALANCE';

// Action Creators
export const login = (email, password) => async (dispatch) => {
  try {
    dispatch({ type: LOGIN_REQUEST });
    
    console.log('Attempting login with:', { email });
    
    // Use real API endpoint instead of mock data
    const response = await axios.post('/api/auth/login', { email, password });
    
    console.log('Login response:', response.data);
    
    const { token, user } = response.data;
    
    // Store token and user in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Set axios default headers
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    dispatch({
      type: LOGIN_SUCCESS,
      payload: { token, user }
    });
    
    return { token, user };
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config
    });
    
    dispatch({
      type: LOGIN_FAILURE,
      payload: error.response?.data?.message || 'Invalid email or password'
    });
    throw error;
  }
};

export const register = (username, email, password, firstName = '', lastName = '') => async (dispatch) => {
  try {
    dispatch({ type: REGISTER_REQUEST });
    
    const response = await axios.post('/api/auth/register', {
      username,
      email,
      password,
      firstName: firstName || username,
      lastName
    });
    
    const { token, user } = response.data;
    
    // Store token and user in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    dispatch({
      type: REGISTER_SUCCESS,
      payload: { token, user }
    });
    
    return { token, user };
  } catch (error) {
    dispatch({
      type: REGISTER_FAILURE,
      payload: error.response?.data?.message || error.message
    });
    throw error;
  }
};

export const logout = () => (dispatch) => {
  // Remove token and user from localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  dispatch({ type: LOGOUT });
};

export const checkAuthState = () => (dispatch) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      
      // Set axios default headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      dispatch({
        type: LOGIN_SUCCESS,
        payload: { token, user }
      });
      
      // Log that we restored the session
      console.log('Restored auth session for user:', user.username || user.email);
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      // Clear invalid data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch(logout());
    }
  }
};

// Wallet Actions

// Deposit funds into user wallet
export const depositFunds = (amount) => async (dispatch) => {
  try {
    dispatch({ type: DEPOSIT_FUNDS_REQUEST });
    
    const response = await axios.post('/api/wallet/deposit', { amount });
    
    dispatch({
      type: DEPOSIT_FUNDS_SUCCESS,
      payload: {
        transaction: response.data.transaction,
        newBalance: response.data.newBalance
      }
    });
    
    // Also update the user object with new balance
    const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
    updatedUser.walletBalance = response.data.newBalance;
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    dispatch({
      type: UPDATE_WALLET_BALANCE,
      payload: response.data.newBalance
    });
    
    return response.data;
  } catch (error) {
    dispatch({
      type: DEPOSIT_FUNDS_FAILURE,
      payload: error.response?.data?.message || error.message
    });
    throw error;
  }
};

// Check wallet balance
export const checkWalletBalance = () => async (dispatch) => {
  try {
    const response = await axios.get('/api/wallet/balance');
    
    dispatch({
      type: UPDATE_WALLET_BALANCE,
      payload: response.data.balance
    });
    
    // Update stored user data
    const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
    updatedUser.walletBalance = response.data.balance;
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    return response.data.balance;
  } catch (error) {
    console.error('Error checking wallet balance:', error);
    throw error;
  }
};