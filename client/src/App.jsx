import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeProvider } from './context/ThemeContext';
import { checkAuthState } from './redux/actions/authActions';
import { setupAxiosDefaults } from './utils/authHelper';
import Dashboard from './components/Dashboard';
import TradingInterface from './components/TradingInterface';
import Login from './components/Login';
import Register from './components/Register';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ContestDetails from './components/ContestDetails';
import Contests from './components/Contests';
import Profile from './components/Profile';
import MyContests from './components/MyContests';
import Transactions from './components/Transactions';
import CreateContest from './components/CreateContest';
import HowToPlay from './components/HowToPlay';
import AdminContestForm from './components/AdminContestForm';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector(state => state.auth);
  const location = useLocation();
  
  if (!isAuthenticated && !localStorage.getItem('token')) {
    // Save the attempted URL to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

// Admin route component
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const location = useLocation();
  
  if (!isAuthenticated || !user || user.role !== 'ADMIN') {
    return <Navigate to="/" state={{ message: "You don't have permission to access this page" }} replace />;
  }
  
  return children;
};

// Contest participation route - requires authentication
const ContestParticipationRoute = ({ children }) => {
  const { isAuthenticated } = useSelector(state => state.auth);
  const location = useLocation();
  
  if (!isAuthenticated && !localStorage.getItem('token')) {
    return (
      <Navigate 
        to="/login" 
        state={{ 
          from: location,
          message: "Please login to participate in contests" 
        }} 
        replace 
      />
    );
  }
  
  return children;
};

function App() {
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector(state => state.auth);
  
  // Check authentication state when app mounts
  useEffect(() => {
    // Set up axios defaults with stored token first
    setupAxiosDefaults();
    
    // Then check auth state
    try {
      dispatch(checkAuthState());
    } catch (err) {
      console.error('Error checking auth state:', err);
    }
  }, [dispatch]);

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          <h4>Something went wrong</h4>
          <p>{error.toString()}</p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="App d-flex flex-column min-vh-100">
          <Navbar />
          <div className="container-fluid p-0 flex-grow-1">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/login" element={
                <div className="container mt-4">
                  <Login />
                </div>
              } />
              <Route path="/register" element={
                <div className="container mt-4">
                  <Register />
                </div>
              } />
              <Route path="/contests" element={
                <div className="container mt-4">
                  <Contests />
                </div>
              } />
              <Route path="/contest/:contestId" element={
                <div className="container mt-4">
                  <ContestDetails />
                </div>
              } />
              <Route path="/how-to-play" element={
                <div className="container mt-4">
                  <HowToPlay />
                </div>
              } />
              
              {/* Protected routes */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <div className="container mt-4">
                    <Profile />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/my-contests" element={
                <ProtectedRoute>
                  <div className="container mt-4">
                    <MyContests />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/transactions" element={
                <ProtectedRoute>
                  <div className="container mt-4">
                    <Transactions />
                  </div>
                </ProtectedRoute>
              } />
              
              {/* Admin routes */}
              <Route path="/admin" element={
                <AdminRoute>
                  <div className="container mt-4">
                    <AdminDashboard />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/contests" element={
                <AdminRoute>
                  <div className="container mt-4">
                    <AdminDashboard />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/contests/new" element={
                <AdminRoute>
                  <div className="container mt-4">
                    <AdminContestForm />
                  </div>
                </AdminRoute>
              } />
              <Route path="/admin/contests/edit/:id" element={
                <AdminRoute>
                  <div className="container mt-4">
                    <AdminContestForm />
                  </div>
                </AdminRoute>
              } />
              <Route path="/create-contest" element={
                <AdminRoute>
                  <div className="container mt-4">
                    <CreateContest />
                  </div>
                </AdminRoute>
              } />
              
              {/* Contest participation routes - require authentication */}
              <Route path="/trade/:contestId" element={
                <ContestParticipationRoute>
                  <div className="container mt-4">
                    <TradingInterface />
                  </div>
                </ContestParticipationRoute>
              } />
              <Route path="/contest/:contestId/join" element={
                <ContestParticipationRoute>
                  <div className="container mt-4">
                    <ContestDetails tab="join" />
                  </div>
                </ContestParticipationRoute>
              } />
              <Route path="/contest/:contestId/leaderboard" element={
                <ContestParticipationRoute>
                  <div className="container mt-4">
                    <ContestDetails tab="leaderboard" />
                  </div>
                </ContestParticipationRoute>
              } />
              <Route path="/contest/:contestId/results" element={
                <ContestParticipationRoute>
                  <div className="container mt-4">
                    <ContestDetails tab="results" />
                  </div>
                </ContestParticipationRoute>
              } />
            </Routes>
          </div>
          <Footer />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
