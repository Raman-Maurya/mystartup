import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Container } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { fetchContests, fetchUserContests } from '../redux/actions/contestActions';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { contests, userContests, loading, error } = useSelector(state => state.contests);
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    // Always fetch public contests
    dispatch(fetchContests()).catch(err => {
      console.error('Error fetching contests:', err);
    });
    
    // Only fetch user contests if authenticated with a valid token
    if (isAuthenticated && localStorage.getItem('token')) {
      try {
        dispatch(fetchUserContests()).catch(err => {
          console.error('Error fetching user contests:', err);
          setFetchError('Unable to load your contests. You can still browse all available contests.');
        });
      } catch (err) {
        console.error('Error in user contests dispatch:', err);
        setFetchError('Unable to load your contests. Please try refreshing the page.');
      }
    }
  }, [dispatch, isAuthenticated]);

  if (error) {
    return <div className="alert alert-danger">Error: {error}</div>;
  }

  return (
    <Container fluid className="p-0">
      {fetchError && (
        <Container className="mb-4">
          <div className="alert alert-warning">
            {fetchError} 
            <button 
              className="btn btn-sm btn-outline-dark float-end"
              onClick={() => setFetchError(null)}
            >
              Dismiss
            </button>
          </div>
        </Container>
      )}
      
      {/* Hero Section */}
      <Row className="hero-section text-center mx-0">
        <Col>
          <h1 className="hero-title">Welcome to Trading Arena</h1>
          <p className="hero-description">
            Why betting on players, show your trading skills and win real cash prizes!
          </p>
          <div className="hero-buttons">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="btn btn-primary btn-lg">
                  Login
                </Link>
                <Link to="/register" className="btn btn-outline-light btn-lg">
                  Register
                </Link>
              </>
            ) : (
              <>
                <Link to="/contests" className="btn btn-primary btn-lg">
                  Browse Contests
                </Link>
                <Link to="/my-contests" className="btn btn-outline-light btn-lg">
                  My Contests
                </Link>
              </>
            )}
          </div>
        </Col>
      </Row>

      {/* Features Section */}
      <Container className="my-5">
        <Row className="features-section">
          <Col md={4} className="mb-4">
            <Card className="feature-card h-100">
              <Card.Body className="d-flex flex-column">
                <div className="feature-icon text-center">
                  <i className="bi bi-trophy"></i>
                </div>
                <Card.Title className="text-center">Trading Contests</Card.Title>
                <Card.Text>
                  Join daily and weekly trading contests with virtual money. Compete against other traders and win real prizes!
                </Card.Text>
                <div className="text-center mt-auto">
                  <Link to="/contests" className="btn btn-outline-primary">
                    Browse Contests
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} className="mb-4">
            <Card className="feature-card h-100">
              <Card.Body className="d-flex flex-column">
                <div className="feature-icon text-center">
                  <i className="bi bi-graph-up-arrow"></i>
                </div>
                <Card.Title className="text-center">Realistic Trading</Card.Title>
                <Card.Text>
                  Experience real-time market data, options trading, and realistic execution. Perfect your strategies risk-free.
                </Card.Text>
                <div className="text-center mt-auto">
                  <Link to="/how-to-play" className="btn btn-outline-primary">
                    Learn More
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} className="mb-4">
            <Card className="feature-card h-100">
              <Card.Body className="d-flex flex-column">
                <div className="feature-icon text-center">
                  <i className="bi bi-people"></i>
                </div>
                <Card.Title className="text-center">Community</Card.Title>
                <Card.Text>
                  Join a community of traders, share strategies, and learn from experts. Track your progress on the leaderboard.
                </Card.Text>
                <div className="text-center mt-auto">
                  <Link to="/leaderboard" className="btn btn-outline-primary">
                    View Leaderboard
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* How It Works Section */}
      <Row className="how-it-works-section text-center mx-0">
        <Col>
          <h2>How It Works</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-icon">1</div>
              <h5>Register & Deposit</h5>
              <p>Create an account and add funds to get started</p>
            </div>
            <div className="step">
              <div className="step-icon">2</div>
              <h5>Join Contests</h5>
              <p>Browse available contests and join ones that interest you</p>
            </div>
            <div className="step">
              <div className="step-icon">3</div>
              <h5>Trade & Compete</h5>
              <p>Use virtual money to trade and compete with others</p>
            </div>
            <div className="step">
              <div className="step-icon">4</div>
              <h5>Win Prizes</h5>
              <p>Top performers win real cash prizes after contest ends</p>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;