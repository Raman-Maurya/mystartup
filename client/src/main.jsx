import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import { checkAuthState } from './redux/actions/authActions'
import App from './App.jsx'
// Import Bootstrap CSS before any custom CSS
import 'bootstrap/dist/css/bootstrap.min.css'
// Import Bootstrap JS for components like dropdowns, modals, etc.
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
// Import custom CSS after Bootstrap
import './index.css'
import './App.css'
import './utils/axiosConfig'

// Check authentication state on application start
store.dispatch(checkAuthState());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)