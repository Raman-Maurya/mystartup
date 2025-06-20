import React, { useEffect, useState } from 'react';
import { Table, Spinner, Badge, Alert, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

const LeaderboardTable = ({ contestId }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInContest, setUserInContest] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const { user, isAuthenticated } = useSelector(state => state.auth);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let endpoint = '/api/leaderboard';
        if (contestId) {
          endpoint = `/api/contests/${contestId}/leaderboard`;
        }
        
        console.log(`Fetching leaderboard from: ${endpoint}`);
        const response = await axios.get(endpoint);
        
        if (!response.data || !response.data.data) {
          console.error('Invalid leaderboard response format:', response);
          throw new Error('Invalid response format from server');
        }
        
        setLeaderboard(response.data.data);
        
        // Debug logging
        console.log('Leaderboard data:', response.data.data);
        console.log('Current user:', user);
        
        // Check if user is in this contest
        if (contestId && isAuthenticated && user && user.id) {
          // Convert IDs to strings for reliable comparison
          const userIdString = String(user.id);
          const userExists = Array.isArray(response.data.data) && response.data.data.some(entry => 
            entry && entry.userId && String(entry.userId) === userIdString
          );
          
          console.log('User ID:', userIdString);
          console.log('User exists in leaderboard:', userExists);
          if (Array.isArray(response.data.data)) {
            console.log('Participant IDs:', response.data.data.map(entry => 
              entry && entry.userId ? String(entry.userId) : 'undefined'
            ));
          }
          
          setUserInContest(userExists);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Leaderboard error:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load leaderboard data');
        setLoading(false);
        
        // Auto-retry up to 3 times with increasing delay
        if (retryCount < 3) {
          const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/3)`);
          
          setTimeout(() => {
            setRetryCount(prevCount => prevCount + 1);
          }, retryDelay);
        }
      }
    };

    fetchLeaderboard();
    
    // If this is a contest-specific leaderboard, refresh more frequently
    const interval = setInterval(fetchLeaderboard, contestId ? 30000 : 300000);
    
    return () => clearInterval(interval);
  }, [contestId, isAuthenticated, user, retryCount]);

  // Format currency value
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '₹0';
    return `₹${parseFloat(value).toFixed(2)}`;
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    // Force a refresh of the leaderboard
    axios.get(`/api/contests/${contestId}/leaderboard`)
      .then(response => {
        if (!response.data || !response.data.data) {
          throw new Error('Invalid response format from server');
        }
        
        setLeaderboard(response.data.data);
        
        // Check if user is in this contest
        if (contestId && isAuthenticated && user && user.id) {
          const userIdString = String(user.id);
          const userExists = Array.isArray(response.data.data) && response.data.data.some(entry => 
            entry && entry.userId && String(entry.userId) === userIdString
          );
          setUserInContest(userExists);
        }
        
        setLoading(false);
      })
      .catch(err => {
        console.error('Error refreshing leaderboard:', err);
        setError(err.response?.data?.error || err.message || 'Failed to refresh leaderboard data');
        setLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" />
        <p className="mt-2">{retryCount > 0 ? `Loading leaderboard (attempt ${retryCount + 1}/4)...` : 'Loading leaderboard...'}</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Failed to load leaderboard</Alert.Heading>
        <p>{error}</p>
        <div className="d-flex justify-content-end">
          <Button variant="outline-danger" onClick={handleRefresh}>
            <i className="bi bi-arrow-clockwise me-1"></i> Try Again
          </Button>
        </div>
      </Alert>
    );
  }

  // Show message if user is viewing a contest leaderboard they're not part of
  if (contestId && isAuthenticated && !userInContest) {
    return (
      <Alert variant="info" className="mb-4">
        <Alert.Heading>You're not part of this contest yet!</Alert.Heading>
        <p>Join this contest to compete with other traders and see yourself on the leaderboard.</p>
        <p>If you've already traded in this contest, the leaderboard may need to be updated.</p>
        <div className="d-flex justify-content-between">
          <Button variant="primary" onClick={handleRefresh}>
            Refresh Leaderboard
          </Button>
          <Link to={`/contest/${contestId}`} className="btn btn-outline-primary">
            View Contest Details
          </Link>
        </div>
      </Alert>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between mb-3">
        <div>
          {leaderboard.length > 0 && (
            <p className="mb-0 text-muted">
              <small>Showing {leaderboard.length} participants</small>
            </p>
          )}
        </div>
        <Button variant="outline-primary" size="sm" onClick={handleRefresh}>
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </Button>
      </div>
      
      {leaderboard.length === 0 ? (
        <Alert variant="info">
          No participants found in this contest yet. Be the first to join!
        </Alert>
      ) : (
        <Table striped hover responsive>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Trader</th>
              <th>Points</th>
              <th>Total P&L</th>
              {contestId && <th>Balance</th>}
              {contestId && <th>Prize</th>}
              {!contestId && <th>Contests Won</th>}
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => (
              <tr 
                key={entry?.userId || index} 
                className={isAuthenticated && user && user.id && entry?.userId && 
                  String(entry.userId) === String(user.id) ? 'table-primary' : ''}
              >
                <td>
                  {index < 3 ? (
                    <Badge bg={index === 0 ? 'warning' : index === 1 ? 'secondary' : 'danger'}>
                      {entry?.rank || index + 1}
                    </Badge>
                  ) : (
                    entry?.rank || index + 1
                  )}
                </td>
                <td>
                  <div className="d-flex align-items-center">
                    <img 
                      src={entry?.profilePicture || '/default-avatar.png'} 
                      alt="Profile" 
                      className="rounded-circle me-2" 
                      style={{ width: '30px', height: '30px' }}
                    />
                    {entry?.userId ? (
                      <Link to={`/profile/${entry.userId}`}>
                        {entry?.username || 'Unknown User'}
                      </Link>
                    ) : (
                      <span>{entry?.username || 'Unknown User'}</span>
                    )}
                  </div>
                </td>
                <td className="fw-bold">
                  {entry?.points || 0}
                </td>
                <td className={(entry?.pnl || 0) >= 0 ? 'text-success' : 'text-danger'}>
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-pnl-${entry?.userId || index}`}>
                        Closed P&L: {(entry?.closedPnL || 0) >= 0 ? '+' : ''}{formatCurrency(entry?.closedPnL || 0)}<br />
                        Open P&L: {(entry?.openPnL || 0) >= 0 ? '+' : ''}{formatCurrency(entry?.openPnL || 0)}
                      </Tooltip>
                    }
                  >
                    <span>
                      {(entry?.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(entry?.pnl)}
                    </span>
                  </OverlayTrigger>
                </td>
                {contestId && (
                  <td>{formatCurrency(entry?.virtualBalance)}</td>
                )}
                {contestId && (
                  <td>
                    {(entry?.projectedPrize || 0) > 0 ? (
                      <Badge bg="success">{formatCurrency(entry?.projectedPrize)}</Badge>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                )}
                {!contestId && (
                  <td>{entry?.contestsWon || 0}</td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
};

export default LeaderboardTable;