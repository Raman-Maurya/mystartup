import { configureStore } from '@reduxjs/toolkit';
import contestReducer from './reducers/contestReducer';
import tradeReducer from './reducers/tradeReducer';
import authReducer from './reducers/authReducer';
import virtualWalletReducer from './reducers/virtualWalletReducer';

// Load state from localStorage
const loadState = () => {
  try {
    const serializedState = localStorage.getItem('reduxState');
    const token = localStorage.getItem('token');
    
    if (serializedState === null) {
      // If we have a token but no serialized state, create initial auth state
      if (token) {
        return {
          auth: {
            token: token,
            isAuthenticated: true,
            user: JSON.parse(localStorage.getItem('user') || '{}'),
            loading: false,
            error: null
          }
        };
      }
      return undefined;
    }
    
    const parsedState = JSON.parse(serializedState);
    
    // Ensure token is synchronized if it exists
    if (token && parsedState.auth) {
      parsedState.auth.token = token;
      parsedState.auth.isAuthenticated = true;
    }
    
    return parsedState;
  } catch (err) {
    console.error('Error loading state:', err);
    return undefined;
  }
};

// Save state to localStorage
const saveState = (state) => {
  try {
    // Save auth state
    const serializedState = JSON.stringify({
      auth: state.auth
    });
    localStorage.setItem('reduxState', serializedState);
    
    // Separately store token for easier access
    if (state.auth.token) {
      localStorage.setItem('token', state.auth.token);
      localStorage.setItem('user', JSON.stringify(state.auth.user || {}));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  } catch (err) {
    console.error('Error saving state:', err);
  }
};

const persistedState = loadState();

export const store = configureStore({
  reducer: {
    contests: contestReducer,
    trades: tradeReducer,
    auth: authReducer,
    virtualWallet: virtualWalletReducer
  },
  preloadedState: persistedState,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: false
  })
});

// Subscribe to store changes to save state
store.subscribe(() => {
  saveState(store.getState());
});