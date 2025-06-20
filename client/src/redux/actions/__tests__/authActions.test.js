import { describe, it, expect, vi, beforeEach } from 'vitest';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import axios from 'axios';
import { loginUser, registerUser, logoutUser, checkAuthState } from '../authActions';

// Mock axios
vi.mock('axios');

// Create mock store
const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe('Auth Actions', () => {
  let store;

  beforeEach(() => {
    store = mockStore({});
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('loginUser', () => {
    it('creates LOGIN_SUCCESS when login is successful', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const responseData = {
        success: true,
        token: 'fake-token',
        user: {
          _id: '1',
          username: 'testuser',
          email: 'test@example.com',
        },
      };

      axios.post.mockResolvedValue({ data: responseData });

      const expectedActions = [
        { type: 'LOGIN_REQUEST' },
        { type: 'LOGIN_SUCCESS', payload: responseData },
      ];

      await store.dispatch(loginUser(userData));
      expect(store.getActions()).toEqual(expectedActions);
      expect(localStorage.getItem('token')).toBe('fake-token');
    });

    it('creates LOGIN_FAILURE when login fails', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const errorMessage = 'Invalid credentials';

      axios.post.mockRejectedValue({
        response: {
          data: {
            success: false,
            message: errorMessage,
          },
        },
      });

      const expectedActions = [
        { type: 'LOGIN_REQUEST' },
        { type: 'LOGIN_FAILURE', payload: errorMessage },
      ];

      await store.dispatch(loginUser(userData));
      expect(store.getActions()).toEqual(expectedActions);
    });
  });

  describe('checkAuthState', () => {
    it('sets user as authenticated when valid token exists', async () => {
      // Set token in localStorage
      localStorage.setItem('token', 'valid-token');

      const userData = {
        _id: '1',
        username: 'testuser',
        email: 'test@example.com',
      };

      axios.get.mockResolvedValue({
        data: {
          success: true,
          user: userData,
        },
      });

      const expectedActions = [
        { type: 'AUTH_CHECK_START' },
        { type: 'LOGIN_SUCCESS', payload: { user: userData, token: 'valid-token' } },
      ];

      await store.dispatch(checkAuthState());
      expect(store.getActions()).toEqual(expectedActions);
    });

    it('clears token when auth check fails', async () => {
      localStorage.setItem('token', 'invalid-token');

      axios.get.mockRejectedValue({
        response: {
          status: 401,
          data: {
            message: 'Token is not valid',
          },
        },
      });

      const expectedActions = [
        { type: 'AUTH_CHECK_START' },
        { type: 'LOGOUT' },
      ];

      await store.dispatch(checkAuthState());
      expect(store.getActions()).toEqual(expectedActions);
      expect(localStorage.getItem('token')).toBe(null);
    });
  });
});
