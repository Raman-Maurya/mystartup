import axios from 'axios';
import { store } from '../redux/store';
import { login as loginAction } from '../redux/actions/authActions';

/**
 * Set up axios defaults with stored token
 */
export const setupAxiosDefaults = () => {
  const token = localStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

/**
 * Helper to directly login with test credentials
 */
export const loginWithTestCredentials = async () => {
  try {
    // Create a test user if needed
    const createUserResponse = await axios.post('/api/auth/register', {
      username: 'testuser',
      email: 'test@example.com',
      password: 'test1234',
      firstName: 'Test',
      lastName: 'User'
    }).catch(err => {
      // Ignore if user already exists
      console.log('User might already exist, trying to login');
    });

    // Login with test user
    const response = await axios.post('/api/auth/login', {
      email: 'test@example.com',
      password: 'test1234'
    });

    const { token, user } = response.data;
    
    // Store token and user in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Set token in axios defaults
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Dispatch login action
    store.dispatch(loginAction('test@example.com', 'test1234'));
    
    console.log('Login successful!', token, user);
    return { token, user };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Test if auth is working
 */
export const testAuth = async () => {
  // Get current token
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.log('No token found - need to login first');
    return false;
  }
  
  try {
    console.log('Testing auth with token:', token);
    const response = await axios.get('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('Auth test successful:', response.data);
    return true;
  } catch (error) {
    console.error('Auth test failed:', error);
    return false;
  }
}; 