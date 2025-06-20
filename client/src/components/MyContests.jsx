import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Button, Nav, Tab, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserContests } from '../redux/actions/contestActions';

const MyContests = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const { userContests, loading, error } = useSelector(state => state.contests);
  const [activeKey, setActiveKey] = useState('active');
  const [refreshing, setRefreshing] = useState(false);
  
  // Function to get the current contest ID from the URL if we're in a contest page
  const getCurrentContestId = () => {
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'contest' || pathParts[1] === 'trade') {
      return pathParts[2];
    }
    return null;
  };
  
  const currentContestId = getCurrentContestId();
  
  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isAuthenticated && !localStorage.getItem('token')) {
      navigate('/login', { state: { from: '/my-contests' } });
      return;
    }
    
    // Only fetch if authenticated
    loadUserContests();
  }, [dispatch, isAuthenticated, navigate]);
  
  // Function to load user contests
  const loadUserContests = async () => {
    try {
      await dispatch(fetchUserContests());
    } catch (err) {
      console.error('Failed to load user contests:', err);
    }
  };
  
  // Function to refresh contests
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadUserContests();
    } finally {
      setRefreshing(false);
    }
  };
  
  // Filter contests based on tab
  const filterContests = () => {
    if (!userContests || userContests.length === 0) {
      return { active: [], completed: [], upcoming: [] };
    }
    
    const now = new Date();
    const active = userContests.filter(contest => 
      new Date(contest.startDate) <= now && new Date(contest.endDate) >= now
    );
    
    const completed = userContests.filter(contest => 
      new Date(contest.endDate) < now
    );
    
    const upcoming = userContests.filter(contest => 
      new Date(contest.startDate) > now
    );
    
    return { active, completed, upcoming };
  };
  
  const filteredContests = filterContests();
  
  if (loading && !refreshing) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading your contests...</p>
        </div>
      </Container>
    );
  }
  
  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">My Contests</h2>
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1" />
              Refreshing...
            </>
          ) : (
            <>
              <i className="bi bi-arrow-clockwise me-1"></i> Refresh
            </>
          )}
        </Button>
      </div>
      
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      
      <Tab.Container id="my-contests-tabs" activeKey={activeKey} onSelect={setActiveKey}>
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link eventKey="active">
              Active <Badge bg="primary">{filteredContests.active.length}</Badge>
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="upcoming">
              Upcoming <Badge bg="info">{filteredContests.upcoming.length}</Badge>
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="completed">
              Completed <Badge bg="secondary">{filteredContests.completed.length}</Badge>
            </Nav.Link>
          </Nav.Item>
        </Nav>
        
        <Tab.Content>
          <Tab.Pane eventKey="active">
            {filteredContests.active.length > 0 ? (
              <Row xs={1} md={2} lg={3} className="g-4">
                {filteredContests.active.map(contest => (
                  <Col key={contest._id}>
                    <Card className={`h-100 shadow-sm ${currentContestId === contest._id ? 'border-primary' : ''}`}>
                      {currentContestId === contest._id && (
                        <div className="ribbon ribbon-top-right">
                          <span>Current</span>
                        </div>
                      )}
                      <Card.Img 
                        variant="top" 
                        src={contest.image || 'https://placehold.co/300x150/png?text=Contest'} 
                        alt={contest.name}
                        style={{ height: '150px', objectFit: 'cover' }}
                      />
                      <Card.Body>
                        <Card.Title>{contest.name}</Card.Title>
                        <Card.Text className="small text-muted mb-2">
                          {contest.description?.substring(0, 80)}...
                        </Card.Text>
                        
                        <div className="d-flex justify-content-between mb-3">
                          <div>
                            <Badge bg="success">Active</Badge>
                          </div>
                          <div>
                            <small className="text-muted">
                              Ends: {new Date(contest.endDate).toLocaleDateString()}
                            </small>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="d-flex justify-content-between mb-1">
                            <div>Current Rank:</div>
                            <div className="fw-bold">{contest.currentRank || 'N/A'}</div>
                          </div>
                          <div className="d-flex justify-content-between mb-1">
                            <div>P&L:</div>
                            <div className={contest.pnl >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                              {typeof contest.pnl === 'number' ? `${contest.pnl >= 0 ? '+' : ''}₹${contest.pnl.toFixed(2)}` : contest.pnl || '₹0.00'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="d-grid gap-2">
                          <Link to={`/contest/${contest._id}`} className="btn btn-primary">
                            View Details
                          </Link>
                          <Link to={`/trade/${contest._id}`} className="btn btn-outline-success">
                            Trade Now
                          </Link>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Alert variant="info">
                You're not currently participating in any active contests. 
                <Link to="/contests" className="ms-2">Browse available contests!</Link>
              </Alert>
            )}
          </Tab.Pane>
          
          <Tab.Pane eventKey="upcoming">
            {filteredContests.upcoming.length > 0 ? (
              <Row xs={1} md={2} lg={3} className="g-4">
                {filteredContests.upcoming.map(contest => (
                  <Col key={contest._id}>
                    <Card className="h-100 shadow-sm">
                      <Card.Img 
                        variant="top" 
                        src={contest.image || 'https://placehold.co/300x150/png?text=Contest'} 
                        alt={contest.name}
                        style={{ height: '150px', objectFit: 'cover' }}
                      />
                      <Card.Body>
                        <Card.Title>{contest.name}</Card.Title>
                        <Card.Text className="small text-muted mb-2">
                          {contest.description?.substring(0, 80)}...
                        </Card.Text>
                        
                        <div className="d-flex justify-content-between mb-3">
                          <div>
                            <Badge bg="info">Upcoming</Badge>
                          </div>
                          <div>
                            <small className="text-muted">
                              Starts: {new Date(contest.startDate).toLocaleDateString()}
                            </small>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="d-flex justify-content-between mb-1">
                            <div>Entry Fee:</div>
                            <div className="fw-bold">₹{contest.entryFee}</div>
                          </div>
                          <div className="d-flex justify-content-between mb-1">
                            <div>Prize Pool:</div>
                            <div className="fw-bold">₹{contest.prizePool}</div>
                          </div>
                        </div>
                        
                        <div className="d-grid">
                          <Link to={`/contest/${contest._id}`} className="btn btn-primary">
                            View Details
                          </Link>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Alert variant="info">
                You haven't registered for any upcoming contests. 
                <Link to="/contests" className="ms-2">Browse available contests!</Link>
              </Alert>
            )}
          </Tab.Pane>
          
          <Tab.Pane eventKey="completed">
            {filteredContests.completed.length > 0 ? (
              <Row xs={1} md={2} lg={3} className="g-4">
                {filteredContests.completed.map(contest => (
                  <Col key={contest._id}>
                    <Card className="h-100 shadow-sm">
                      <Card.Img 
                        variant="top" 
                        src={contest.image || 'https://placehold.co/300x150/png?text=Contest'} 
                        alt={contest.name}
                        style={{ height: '150px', objectFit: 'cover' }}
                      />
                      <Card.Body>
                        <Card.Title>{contest.name}</Card.Title>
                        <Card.Text className="small text-muted mb-2">
                          {contest.description?.substring(0, 80)}...
                        </Card.Text>
                        
                        <div className="d-flex justify-content-between mb-3">
                          <div>
                            <Badge bg="secondary">Completed</Badge>
                          </div>
                          <div>
                            <small className="text-muted">
                              Ended: {new Date(contest.endDate).toLocaleDateString()}
                            </small>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="d-flex justify-content-between mb-1">
                            <div>Final Rank:</div>
                            <div className="fw-bold">{contest.finalRank || contest.currentRank || 'N/A'}</div>
                          </div>
                          <div className="d-flex justify-content-between mb-1">
                            <div>Final P&L:</div>
                            <div className={contest.pnl >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                              {typeof contest.pnl === 'number' ? `${contest.pnl >= 0 ? '+' : ''}₹${contest.pnl.toFixed(2)}` : contest.pnl || '₹0.00'}
                            </div>
                          </div>
                          {contest.prizeMoney > 0 && (
                            <div className="d-flex justify-content-between mb-1">
                              <div>Prize Won:</div>
                              <div className="text-success fw-bold">₹{contest.prizeMoney}</div>
                            </div>
                          )}
                        </div>
                        
                        <div className="d-grid">
                          <Link to={`/contest/${contest._id}`} className="btn btn-primary">
                            View Results
                          </Link>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Alert variant="info">
                You haven't completed any contests yet.
                <Link to="/contests" className="ms-2">Browse available contests!</Link>
              </Alert>
            )}
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
      
      {/* Add some CSS for the ribbon effect */}
      <style jsx>{`
        .ribbon {
          width: 150px;
          height: 150px;
          overflow: hidden;
          position: absolute;
          z-index: 1;
        }
        .ribbon-top-right {
          top: -10px;
          right: -10px;
        }
        .ribbon-top-right::before,
        .ribbon-top-right::after {
          border-top-color: transparent;
          border-right-color: transparent;
        }
        .ribbon-top-right::before {
          top: 0;
          left: 0;
        }
        .ribbon-top-right::after {
          bottom: 0;
          right: 0;
        }
        .ribbon-top-right span {
          position: absolute;
          top: 30px;
          right: -25px;
          transform: rotate(45deg);
          width: 100px;
          background-color: #0d6efd;
          color: white;
          text-align: center;
          font-size: 12px;
          font-weight: bold;
          padding: 5px 0;
        }
      `}</style>
    </Container>
  );
};

export default MyContests;