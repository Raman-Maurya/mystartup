import React from 'react';
import { Container, Row, Col, Card, Table, Alert, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './HowToPlay.css';

const HowToPlay = () => {
  return (
    <Container className="how-to-play-container">
      <div className="page-header text-center">
        <h1>How to Play</h1>
        <p className="lead">Learn how to participate in Trading Arena contests and win real cash prizes</p>
      </div>
      
      <Row className="mb-5">
        <Col md={8} className="mx-auto">
          <Card className="getting-started-card">
            <Card.Header as="h2">Getting Started</Card.Header>
            <Card.Body>
              <ol className="getting-started-steps">
                <li>
                  <h4>Create an Account</h4>
                  <p>Register for a free account to start participating in trading contests.</p>
                  <Link to="/register" className="btn btn-primary btn-sm">Register Now</Link>
                </li>
                <li>
                  <h4>Browse Contests</h4>
                  <p>Find daily and weekly contests that match your interests and skill level.</p>
                  <Link to="/contests" className="btn btn-primary btn-sm">View Contests</Link>
                </li>
                <li>
                  <h4>Join a Contest</h4>
                  <p>Pay the entry fee to join a contest and receive your virtual trading capital.</p>
                </li>
                <li>
                  <h4>Start Trading</h4>
                  <p>Use the trading interface to place trades within contest rules and time limits.</p>
                </li>
                <li>
                  <h4>Track Performance</h4>
                  <p>Monitor your position on the leaderboard throughout the contest.</p>
                </li>
                <li>
                  <h4>Win Prizes</h4>
                  <p>Top performers win real cash prizes based on the prize distribution.</p>
                </li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-5">
        <Col>
          <Card className="contest-rules-card">
            <Card.Header as="h2">Contest Rules</Card.Header>
            <Card.Body>
              <ul className="contest-rules-list">
                <li>
                  <Badge bg="primary" className="rule-number">1</Badge>
                  <div className="rule-content">
                    <strong>Starting Capital:</strong> Each participant gets ₹50,000 virtual money (₹79,999 for mega contests)
                  </div>
                </li>
                <li>
                  <Badge bg="primary" className="rule-number">2</Badge>
                  <div className="rule-content">
                    <strong>Trading Instruments:</strong> Only Nifty and BankNifty options allowed
                  </div>
                </li>
                <li>
                  <Badge bg="primary" className="rule-number">3</Badge>
                  <div className="rule-content">
                    <strong>Trade Limits:</strong> Maximum 2 trades per contest
                  </div>
                </li>
                <li>
                  <Badge bg="primary" className="rule-number">4</Badge>
                  <div className="rule-content">
                    <strong>Position Restrictions:</strong> No overnight positions allowed
                  </div>
                </li>
                <li>
                  <Badge bg="primary" className="rule-number">5</Badge>
                  <div className="rule-content">
                    <strong>Contest Duration:</strong> Contest ends at market close
                  </div>
                </li>
                <li>
                  <Badge bg="primary" className="rule-number">6</Badge>
                  <div className="rule-content">
                    <strong>Auto Close:</strong> Position will automatically get closed at market close
                  </div>
                </li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-5">
        <Col>
          <Card className="prize-distribution-card">
            <Card.Header as="h2">Prize Distribution</Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive className="prize-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Prize</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1st</td>
                    <td>₹6,000</td>
                  </tr>
                  <tr>
                    <td>2nd</td>
                    <td>₹3,000</td>
                  </tr>
                  <tr>
                    <td>3rd</td>
                    <td>₹1,000</td>
                  </tr>
                </tbody>
              </Table>
              <Alert variant="info" className="mt-3">
                <i className="bi bi-info-circle-fill me-2"></i>
                Prize amounts may vary based on the specific contest. Check individual contest details for exact prize information.
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-5">
        <Col>
          <Card className="tips-card">
            <Card.Header as="h2">Tips for Success</Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="tip">
                    <i className="bi bi-lightbulb-fill tip-icon"></i>
                    <h5>Research Before Trading</h5>
                    <p>Analyze market trends and news before making trading decisions.</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="tip">
                    <i className="bi bi-graph-up tip-icon"></i>
                    <h5>Understand Option Strategies</h5>
                    <p>Learn basic options strategies to maximize your profit potential.</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="tip">
                    <i className="bi bi-shield-check tip-icon"></i>
                    <h5>Manage Your Risk</h5>
                    <p>Don't put all your virtual capital into a single trade.</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="tip">
                    <i className="bi bi-clock tip-icon"></i>
                    <h5>Time Your Trades</h5>
                    <p>Be mindful of market volatility during opening and closing hours.</p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col className="text-center mb-5">
          <h3>Ready to Get Started?</h3>
          <Link to="/contests" className="btn btn-primary btn-lg me-3">Browse Contests</Link>
          <Link to="/register" className="btn btn-outline-primary btn-lg">Create Account</Link>
        </Col>
      </Row>
    </Container>
  );
};

export default HowToPlay;
