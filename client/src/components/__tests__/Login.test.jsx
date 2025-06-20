import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import Login from '../Login';
import authReducer from '../../redux/reducers/authReducer';

// Mock the react-router-dom's useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Create a test store
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState,
  });
};

describe('Login Component', () => {
  let store;

  beforeEach(() => {
    store = createTestStore({
      auth: {
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      },
    });

    // Mock the login action
    vi.mock('../../redux/actions/authActions', () => ({
      loginUser: vi.fn(() => {
        return (dispatch) => {
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user: { username: 'testuser' } } });
        };
      }),
    }));
  });

  it('renders the login form correctly', () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText(/Log in to your account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log In/i })).toBeInTheDocument();
  });

  it('handles form submission and input validation', async () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    );

    // Submit empty form
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));
    
    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
    });

    // Fill the form
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    // Wait for success state
    await waitFor(() => {
      expect(store.getState().auth.isAuthenticated).toBe(true);
    });
  });
});
