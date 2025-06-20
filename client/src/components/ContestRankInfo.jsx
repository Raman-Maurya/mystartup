import React, { useState, useEffect } from 'react';
import { Card, Badge, Spinner, Alert } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import axios from 'axios';

/**
 * Displays a summary of user's current position in a contest along with potential prize
 */
const ContestRankInfo = ({ contestId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rankInfo, setRankInfo] = useState(null);
  const { user } = useSelector(state => state.auth);
  
  useEffect(() => {
    const fetchRankInfo = async () => {
      if (!contestId || !user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Get the contest leaderboard
        const response = await axios.get(`/api/contests/${contestId}/leaderboard`);
        const leaderboard = response.data.data;
        
        // Find current user in the leaderboard
        const currentUserEntry = leaderboard.find(entry => entry.userId === user.id);
        
        if (currentUserEntry) {
          // Calculate position summary
          const totalParticipants = leaderboard.length;
          const percentile = Math.round((totalParticipants - currentUserEntry.rank + 1) / totalParticipants * 100);
          
          setRankInfo({
            rank: currentUserEntry.rank,
            totalParticipants,
            percentile,
            pnl: currentUserEntry.pnl,
            points: currentUserEntry.points,
            projectedPrize: currentUserEntry.projectedPrize || 0
          });
        }
        
        setLoading(false);
      } catch (err) {
        setError('Could not retrieve ranking information');
        setLoading(false);
      }
    };
    
    fetchRankInfo();
    
    // Refresh the ranking every 30 seconds
    const interval = setInterval(fetchRankInfo, 30000);
    return () => clearInterval(interval);
  }, [contestId, user]);
  
  if (loading) {
    return (
      <Card className="mb-4 shadow-sm">
        <Card.Body className="text-center p-4">
          <Spinner animation="border" size="sm" className="me-2" />
          <span>Loading rank information...</span>
        </Card.Body>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="danger">{error}</Alert>
    );
  }
  
  if (!rankInfo) {
    return (
      <Card className="mb-4 shadow-sm">
        <Card.Body className="text-center p-4">
          <Alert variant="info" className="mb-0">
            You are not participating in this contest yet
          </Alert>
        </Card.Body>
      </Card>
    );
  }
  
  // Determine rank badge color
  const getBadgeColor = (rank) => {
    if (rank === 1) return 'warning';
    if (rank === 2) return 'secondary';
    if (rank === 3) return 'danger';
    return 'primary';
  };
  
  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header>
        <h6 className="mb-0">Your Contest Position</h6>
      </Card.Header>
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <div className="text-muted small">Current Rank</div>
            <div className="d-flex align-items-center">
              <Badge bg={getBadgeColor(rankInfo.rank)} className="me-2" style={{ fontSize: '1.2rem', padding: '0.25rem 0.5rem' }}>
                #{rankInfo.rank}
              </Badge>
              <span className="text-muted small">
                of {rankInfo.totalParticipants} participants (Top {rankInfo.percentile}%)
              </span>
            </div>
          </div>
        </div>
        
        <div className="row g-3">
          <div className="col-md-4">
            <div className="border rounded p-3 text-center bg-light">
              <div className="text-muted small">Your P&L</div>
              <div className={`fw-bold ${rankInfo.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                {rankInfo.pnl >= 0 ? '+' : ''}
                ₹{rankInfo.pnl.toFixed(2)}
              </div>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="border rounded p-3 text-center bg-light">
              <div className="text-muted small">Your Points</div>
              <div className="fw-bold">
                {rankInfo.points}
              </div>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="border rounded p-3 text-center bg-light">
              <div className="text-muted small">Projected Prize</div>
              {rankInfo.projectedPrize > 0 ? (
                <div className="fw-bold text-success">
                  ₹{rankInfo.projectedPrize.toFixed(2)}
                </div>
              ) : (
                <div className="text-muted">Not in prize zone</div>
              )}
            </div>
          </div>
        </div>
        
        {rankInfo.rank <= 10 && rankInfo.projectedPrize > 0 && (
          <Alert variant="success" className="mt-3 mb-0">
            <i className="bi bi-trophy me-2"></i>
            You're currently in a winning position! Keep trading to maintain or improve your rank.
          </Alert>
        )}
        
        {rankInfo.rank > 10 && (
          <Alert variant="warning" className="mt-3 mb-0">
            <i className="bi bi-exclamation-triangle me-2"></i>
            You need to improve your rank to win a prize. Focus on profitable trades!
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default ContestRankInfo; 