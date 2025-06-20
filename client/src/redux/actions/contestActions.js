import axios from 'axios';

// Action Types
export const FETCH_CONTESTS_REQUEST = 'FETCH_CONTESTS_REQUEST';
export const FETCH_CONTESTS_SUCCESS = 'FETCH_CONTESTS_SUCCESS';
export const FETCH_CONTESTS_FAILURE = 'FETCH_CONTESTS_FAILURE';
export const FETCH_USER_CONTESTS_SUCCESS = 'FETCH_USER_CONTESTS_SUCCESS';
export const FETCH_CONTEST_DETAILS_SUCCESS = 'FETCH_CONTEST_DETAILS_SUCCESS';
export const JOIN_CONTEST_SUCCESS = 'JOIN_CONTEST_SUCCESS';
export const REFRESH_CONTESTS_NEEDED = 'REFRESH_CONTESTS_NEEDED';
export const ADD_NEW_CONTEST = 'ADD_NEW_CONTEST';

// Fetch all contests
export const fetchContests = () => async (dispatch) => {
  try {
    dispatch({ type: FETCH_CONTESTS_REQUEST });
    
    // Use real API endpoint without duplicate /api/ prefix
    const response = await axios.get('/api/contests');
    
    dispatch({
      type: FETCH_CONTESTS_SUCCESS,
      payload: response.data.data
    });
  } catch (error) {
    console.error('Error fetching contests:', error);
    dispatch({
      type: FETCH_CONTESTS_FAILURE,
      payload: error.response?.data?.message || error.message
    });
  }
};

// Fetch active contests
export const fetchActiveContests = () => async (dispatch) => {
  try {
    dispatch({ type: FETCH_CONTESTS_REQUEST });
    
    const response = await axios.get('/api/contests/active');
    
    dispatch({
      type: FETCH_CONTESTS_SUCCESS,
      payload: response.data.data
    });
  } catch (error) {
    dispatch({
      type: FETCH_CONTESTS_FAILURE,
      payload: error.response?.data?.message || error.message
    });
  }
};

// Fetch contest details
export const fetchContestDetails = (contestId) => async (dispatch) => {
  try {
    dispatch({ type: FETCH_CONTESTS_REQUEST });
    
    const response = await axios.get(`/api/contests/${contestId}`);
    
    dispatch({
      type: FETCH_CONTEST_DETAILS_SUCCESS,
      payload: response.data.data
    });
  } catch (error) {
    dispatch({
      type: FETCH_CONTESTS_FAILURE,
      payload: error.response?.data?.message || error.message
    });
  }
};

// Fetch user contests
export const fetchUserContests = () => async (dispatch) => {
  try {
    dispatch({ type: FETCH_CONTESTS_REQUEST });
    
    // Check if we have a token before making the request
    const token = localStorage.getItem('token');
    if (!token) {
      dispatch({
        type: FETCH_CONTESTS_FAILURE,
        payload: 'Authentication required to fetch user contests'
      });
      return [];
    }
    
    // Directly set the authorization header for this specific request
    // instead of relying on defaults which might be cleared
    const response = await axios.get('/api/contests/user', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Handle empty response
    if (!response.data || !response.data.data) {
      dispatch({
        type: FETCH_USER_CONTESTS_SUCCESS,
        payload: []
      });
      return [];
    }
    
    dispatch({
      type: FETCH_USER_CONTESTS_SUCCESS,
      payload: response.data.data
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Error fetching user contests:', error);
    
    // Handle unauthorized errors
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      dispatch({ type: 'LOGOUT' });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    
    // Return empty array instead of throwing error for better UX
    dispatch({
      type: FETCH_CONTESTS_FAILURE,
      payload: 'Error: Server error. Please try again later.'
    });
    
    return [];
  }
};

// Join contest
export const joinContest = (contestId) => async (dispatch, getState) => {
  try {
    dispatch({ type: FETCH_CONTESTS_REQUEST });
    
    // Get the contest details first to check entry fee
    const contestResponse = await axios.get(`/api/contests/${contestId}`);
    const contest = contestResponse.data.data;
    
    // Check if the contest is a mega contest
    const isMegaContest = contest.maxParticipants >= 500;
    const virtualAmount = isMegaContest ? 79999 : 50000;
    
    // Join the contest - this will check if user has sufficient balance and deduct entry fee
    const response = await axios.post(`/api/contests/${contestId}/join`, {
      entryFee: contest.entryFee,
      virtualAmount: virtualAmount
    });
    
    // Update the user's wallet in the auth state (will be handled by wallet middleware)
    dispatch({
      type: 'UPDATE_USER_WALLET',
      payload: {
        walletBalance: response.data.walletBalance
      }
    });
    
    // Update the contest in the store
    dispatch({
      type: JOIN_CONTEST_SUCCESS,
      payload: response.data.contest
    });
    
    // Immediately add this contest to the user's contests list
    const joinedContest = {
      ...contest,
      _id: contestId,
      virtualBalance: virtualAmount,
      currentPnL: 0,
      points: 0,
      trades: 0,
      joinedAt: new Date().toISOString()
    };
    
    // Add the joined contest to the user contests list
    dispatch({
      type: FETCH_USER_CONTESTS_SUCCESS,
      payload: [...(getState().contests.userContests || []), joinedContest]
    });
    
    return {
      ...response.data,
      virtualAmount
    };
  } catch (error) {
    console.error('Error joining contest:', error);
    dispatch({
      type: FETCH_CONTESTS_FAILURE,
      payload: error.response?.data?.message || 'Failed to join contest'
    });
    throw error;
  }
};

// Create new contest (for admin users)
export const createContest = (contestData) => async (dispatch) => {
  try {
    dispatch({ type: FETCH_CONTESTS_REQUEST });
    
    // Get the admin token
    const token = localStorage.getItem('token');
    
    // Ensure the contest is published
    if (!contestData.isPublished) {
      contestData.isPublished = true;
    }
    
    // Call the API to create a new contest with proper Authorization header
    const response = await axios.post('/api/contests', contestData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Update the store with the new contest
    dispatch({
      type: ADD_NEW_CONTEST,
      payload: response.data.data || response.data
    });
    
    // Set the refresh needed flag to true
    dispatch({ type: REFRESH_CONTESTS_NEEDED });
    
    return response.data;
  } catch (error) {
    dispatch({
      type: FETCH_CONTESTS_FAILURE,
      payload: error.response?.data?.message || error.message
    });
    throw error;
  }
};