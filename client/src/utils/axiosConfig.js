import axios from 'axios';
import { store } from '../redux/store';

// Use relative URLs for API calls in development
// This will let the proxy in vite.config.js handle the forwarding
axios.defaults.baseURL = '';  // Use Vite's proxy instead of direct URL

// Add a function to set authorization headers with token
export const setupAxiosDefaults = () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('Auth token set in axios defaults');
    } else {
      delete axios.defaults.headers.common['Authorization'];
      console.log('No auth token available');
    }
  } catch (err) {
    console.error('Error setting auth token:', err);
  }
};

// Call setup when the file loads
setupAxiosDefaults();

// Set up default headers
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.timeout = 15000; // 15 second timeout

// Add response interceptor to handle common errors
axios.interceptors.response.use(
  response => response,
  error => {
    // Handle request timeout
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
      return Promise.reject(new Error('Request timeout. Please try again.'));
    }
    
    // For network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    
    // For undefined or empty responses
    if (!error.response.data) {
      console.error('Empty response received');
      return Promise.reject(new Error('Server error. Please try again later.'));
    }
    
    console.error('Axios error:', error?.response?.status, error?.response?.data);
    
    // Handle authentication errors
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log('Authentication error detected, logging out');
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // If we have access to Redux store, dispatch logout
      if (store && store.dispatch) {
        store.dispatch({ type: 'LOGOUT' });
      }
      
      // Redirect only for 401 errors, not for all 403 errors
      if (error.response.status === 401) {
        // Don't redirect if we're already on the login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    
    // Handle 500 errors
    if (error.response && error.response.status === 500) {
      console.error('Server error:', error.response.data);
      // Use a more generic error message instead of passing through the server error
      return Promise.reject(new Error('Server error. Please try again later.'));
    }
    
    return Promise.reject(error);
  }
);

export default axios; 