import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Table, Badge, Row, Col, Alert, ProgressBar, Modal, Nav, Tab } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { fetchContestDetails, joinContest } from '../redux/actions/contestActions';
import { initializeVirtualWallet } from '../redux/reducers/virtualWalletReducer';
import LeaderboardTable from './LeaderboardTable';

const ContestDetails = ({ tab }) => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const contestsState = useSelector(state => state.contests);
  const [loading, setLoading] = useState(true);
  const [showRules, setShowRules] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const dispatch = useDispatch();
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set active tab based on props or URL
    if (tab) {
      setActiveTab(tab);
    } else if (location.pathname.includes('/leaderboard')) {
      setActiveTab('leaderboard');
    }
  }, [tab, location]);

  useEffect(() => {
    // Use real API to fetch contest details
    const loadContestDetails = async () => {
      try {
        await dispatch(fetchContestDetails(contestId));
        setLoading(false);
      } catch (err) {
        console.error('Failed to load contest details:', err);
        setError('Failed to load contest details. Please try again.');
        setLoading(false);
      }
    };
    
    loadContestDetails();
  }, [contestId, dispatch]);
  
  // Get the current contest from the redux store
  const contest = contestsState.currentContest;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading contest details...</p>
        </div>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Contest Not Found</Alert.Heading>
        <p>
          {error || "The contest you're looking for doesn't exist or has been removed."}
        </p>
        <Button variant="outline-danger" onClick={() => navigate('/contests')}>
          Back to Contests
        </Button>
      </Alert>
    );
  }

  // Calculate fill percentage
  const fillPercentage = (contest.participants ? contest.participants.length : 0) / (contest.maxParticipants || 100) * 100;
  
  // Determine if this is a mega contest
  const isMegaContest = (contest.maxParticipants || 0) >= 500;
  const virtualMoneyAmount = contest.virtualMoneyAmount ? 
    `₹${contest.virtualMoneyAmount.toLocaleString()}` : 
    (isMegaContest ? '₹79,999' : '₹50,000');

  // Function to handle start trading click
  const handleStartTrading = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/contest/${contestId}` } });
      return;
    }
    navigate(`/trade/${contestId}`);
  };

  // Handle join contest click
  const handleJoinClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/contest/${contestId}` } });
      return;
    }
    
    // Show confirmation modal
    setShowJoinModal(true);
  };
  
  // Handle actual contest join
  const handleJoinContest = async () => {
    setJoinLoading(true);
    setJoinError(null);
    
    try {
      // Check if user has enough balance
      if (user.walletBalance < contest.entryFee) {
        setJoinError(`Insufficient funds. You need ₹${contest.entryFee} to join this contest.`);
        setJoinLoading(false);
        return;
      }
      
      // If contest entry fee is 0 (free) or the user has enough wallet balance,
      // use the standard join contest flow
      await dispatch(joinContest(contestId));
      
      // Initialize virtual wallet for this contest
      const virtualAmount = contest.virtualMoneyAmount || (isMegaContest ? 79999 : 50000);
      dispatch(initializeVirtualWallet(contestId, virtualAmount));
      
      // Close modal and navigate to trading interface
      setShowJoinModal(false);
      navigate(`/trade/${contestId}`);
    } catch (error) {
      setJoinError(error.response?.data?.error || error.message || 'Failed to join contest. Please try again.');
      setJoinLoading(false);
    }
  };

  return (
    <div className="contest-details-container animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">{contest.name}</h2>
          <p className="text-muted mb-0">{contest.description}</p>
        </div>
        <div>
          <Button 
            variant="outline-secondary"
            size="sm"
            className="me-2"
            onClick={() => navigate('/contests')}
          >
            <i className="bi bi-arrow-left me-1"></i> Back to Contests
          </Button>
          <Button 
            variant="primary" 
            size="sm"
            onClick={isAuthenticated ? handleJoinClick : handleStartTrading}
          >
            <i className="bi bi-graph-up me-1"></i> {isAuthenticated ? (contest?.participants?.some(p => p.user === user?.id) ? 'Start Trading' : 'Join Contest') : 'Start Trading'}
          </Button>
        </div>
      </div>
      
      {/* Add Tab Navigation */}
      <Nav variant="tabs" className="mb-4">
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'details'} 
            onClick={() => navigate(`/contest/${contestId}`)}
          >
            Details
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'leaderboard'} 
            onClick={() => navigate(`/contest/${contestId}/leaderboard`)}
          >
            Leaderboard
          </Nav.Link>
        </Nav.Item>
        {contest.status === 'COMPLETED' && (
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'results'} 
              onClick={() => navigate(`/contest/${contestId}/results`)}
            >
              Results
            </Nav.Link>
          </Nav.Item>
        )}
      </Nav>
      
      {/* Tab Content */}
      {activeTab === 'leaderboard' ? (
        <Card className="shadow-sm border-0 mb-4">
          <Card.Body>
            <h5 className="mb-3">Contest Leaderboard</h5>
            <LeaderboardTable contestId={contestId} />
          </Card.Body>
        </Card>
      ) : activeTab === 'results' ? (
        <Card className="shadow-sm border-0 mb-4">
          <Card.Body>
            <h5 className="mb-3">Contest Results</h5>
            <LeaderboardTable contestId={contestId} />
          </Card.Body>
        </Card>
      ) : (
        <Row className="mb-4">
          <Col md={8}>
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between mb-3">
                  <Card.Title>Contest Details</Card.Title>
                  <div>
                    <Badge bg={contest.contestType === 'FREE' ? 'success' : 'primary'} className="me-2">
                      {contest.contestType === 'FREE' ? 'Free Entry' : 'Paid Entry'}
                    </Badge>
                    {isMegaContest ? (
                      <Badge bg="danger">MEGA Contest</Badge>
                    ) : (
                      <Badge bg="info">{contest.maxParticipants <= 50 ? 'Small' : 'Regular'} Contest</Badge>
                    )}
                  </div>
                </div>
                
                <Row className="g-4 mb-4">
                  <Col xs={6} sm={3}>
                    <div className="p-3 bg-light rounded text-center">
                      <div className="text-muted small">Entry Fee</div>
                      <div className="fs-5 fw-bold">
                        {contest.entryFee === 0 ? 'FREE' : `₹${contest.entryFee}`}
                      </div>
                    </div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="p-3 bg-light rounded text-center">
                      <div className="text-muted small">Prize Pool</div>
                      <div className="fs-5 fw-bold text-success">₹{contest.prizePool?.toLocaleString() || 0}</div>
                    </div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="p-3 bg-light rounded text-center">
                      <div className="text-muted small">Virtual Money</div>
                      <div className="fs-5 fw-bold text-primary">{virtualMoneyAmount}</div>
                    </div>
                  </Col>
                  <Col xs={6} sm={3}>
                    <div className="p-3 bg-light rounded text-center">
                      <div className="text-muted small">Trades Limit</div>
                      <div className="fs-5 fw-bold">{contest.tradingSettings?.maxTradesPerUser || 2} Trades</div>
                    </div>
                  </Col>
                </Row>
                
                <div className="mb-4">
                  <div className="d-flex justify-content-between mb-1">
                    <div>
                      <span className="fw-bold">{contest.participants?.length || 0}</span> of <span className="fw-bold">{contest.maxParticipants}</span> participants
                    </div>
                    <div className={fillPercentage > 80 ? 'text-danger fw-bold' : 'text-muted'}>
                      {fillPercentage > 80 ? 'Filling fast!' : `${Math.round(fillPercentage)}% filled`}
                    </div>
                  </div>
                  <ProgressBar 
                    now={fillPercentage} 
                    variant={fillPercentage > 80 ? 'danger' : fillPercentage > 40 ? 'warning' : 'info'}
                    style={{ height: '8px' }}
                  />
                </div>
                
                <div className="row mb-4">
                  <div className="col-6">
                    <div className="text-muted small">Start Date</div>
                    <div>{new Date(contest.startDate).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">End Date</div>
                    <div>{new Date(contest.endDate).toLocaleString('en-IN')}</div>
                  </div>
                </div>
                
                <div className="mb-3 d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Contest Rules</h5>
                  <Button 
                    variant="link" 
                    className="p-0 text-decoration-none"
                    onClick={() => setShowRules(!showRules)}
                  >
                    {showRules ? 'Hide' : 'Show'} Rules
                  </Button>
                </div>
                
                {showRules && (
                  <div className="mb-4">
                    <ul className="mb-0">
                      {contest.rules && contest.rules.length > 0 ? (
                        contest.rules.map((rule, index) => (
                          <li key={index}>{rule}</li>
                        ))
                      ) : (
                        // Default rules if none provided in backend
                        <>
                          <li>Each participant gets {virtualMoneyAmount} virtual money</li>
                          <li>Only Nifty and BankNifty options allowed</li>
                          <li>Maximum {contest.tradingSettings?.maxTradesPerUser || 2} trades per contest</li>
                          <li>No overnight positions allowed</li>
                          <li>Contest ends at market close on {new Date(contest.endDate).toLocaleDateString('en-IN')}</li>
                          <li>Position will automatically get closed at market close</li>
                        </>
                      )}
                    </ul>
                  </div>
                )}
              </Card.Body>
            </Card>
            
            <Card className="shadow-sm border-0">
              <Card.Body>
                <h5 className="mb-3">Prizes & Distribution</h5>
                
                <div className="prize-distribution mb-4">
                  <div className="d-flex justify-content-between flex-wrap">
                    {contest.prizeDistribution && contest.prizeDistribution.length > 0 ? (
                      contest.prizeDistribution.map((prize, index) => (
                        <div key={index} className="prize-item text-center mb-3">
                          <div className={`prize-rank rank-${index + 1}`}>{prize.rank || `${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'}`}</div>
                          <div className="prize-amount text-success fw-bold">{prize.prize || `₹${prize.amount?.toLocaleString()}`}</div>
                        </div>
                      ))
                    ) : contest.maxParticipants === 2 ? (
                      // Head-to-head contest - winner takes all
                      <div className="prize-item text-center mb-3 mx-auto">
                        <div className="prize-rank rank-1">Winner</div>
                        <div className="prize-amount text-success fw-bold">₹{contest.prizePool.toLocaleString()}</div>
                      </div>
                    ) : (
                      // Default prize distribution for regular contests
                      <>
                        <div className="prize-item text-center mb-3">
                          <div className="prize-rank rank-1">1st</div>
                          <div className="prize-amount text-success fw-bold">₹{Math.floor(contest.prizePool * 0.6).toLocaleString()}</div>
                        </div>
                        <div className="prize-item text-center mb-3">
                          <div className="prize-rank rank-2">2nd</div>
                          <div className="prize-amount text-success fw-bold">₹{Math.floor(contest.prizePool * 0.3).toLocaleString()}</div>
                        </div>
                        <div className="prize-item text-center mb-3">
                          <div className="prize-rank rank-3">3rd</div>
                          <div className="prize-amount text-success fw-bold">₹{Math.floor(contest.prizePool * 0.1).toLocaleString()}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Show join button at bottom too */}
                <div className="text-center mt-4">
                  <Button 
                    variant="primary"
                    onClick={isAuthenticated ? handleJoinClick : handleStartTrading}
                    className="px-4 py-2"
                  >
                    {isAuthenticated ? (contest?.participants?.some(p => p.user === user?.id) ? 'Start Trading' : 'Join Contest') : 'Start Trading'}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4}>
            <Card className="shadow-sm border-0 mb-4">
              <Card.Header className="bg-success text-white">
                <h5 className="mb-0">Prize Distribution</h5>
              </Card.Header>
              <Card.Body>
                {contest.maxParticipants === 2 ? (
                  // Head-to-head contest - winner takes all
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <Badge bg="warning" text="dark" className="me-2">Winner</Badge>
                        <span>Winner Takes All</span>
                      </div>
                      <strong className="text-success">₹{contest.prizePool.toLocaleString()}</strong>
                    </div>
                    <ProgressBar now={100} variant="warning" style={{ height: '8px' }} />
                  </div>
                ) : (
                  // Regular contest with multiple prizes
                  <>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <Badge bg="warning" text="dark" className="me-2">1st</Badge>
                          <span>First Place</span>
                        </div>
                        <strong className="text-success">₹{(contest.prizePool * 0.6).toLocaleString()}</strong>
                      </div>
                      <ProgressBar now={60} variant="warning" style={{ height: '8px' }} />
                    </div>
                    
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <Badge bg="secondary" className="me-2">2nd</Badge>
                          <span>Second Place</span>
                        </div>
                        <strong className="text-success">₹{(contest.prizePool * 0.3).toLocaleString()}</strong>
                      </div>
                      <ProgressBar now={30} variant="secondary" style={{ height: '8px' }} />
                    </div>
                    
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <Badge bg="danger" className="me-2">3rd</Badge>
                          <span>Third Place</span>
                        </div>
                        <strong className="text-success">₹{(contest.prizePool * 0.1).toLocaleString()}</strong>
                      </div>
                      <ProgressBar now={10} variant="danger" style={{ height: '8px' }} />
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
            
            <Card className="shadow-sm border-0 mb-4">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">Join This Contest</h5>
              </Card.Header>
              <Card.Body>
                <div className="text-center py-3">
                  {fillPercentage >= 100 ? (
                    <div>
                      <div className="display-1 text-danger mb-3">
                        <i className="bi bi-exclamation-circle"></i>
                      </div>
                      <h5>Contest Full!</h5>
                      <p className="text-muted">This contest has reached maximum capacity.</p>
                      <Button variant="secondary" onClick={() => navigate('/contests')}>
                        Find Similar Contests
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div className="display-1 text-success mb-3">
                        <i className="bi bi-check-circle"></i>
                      </div>
                      <h5>Ready to Start Trading?</h5>
                      <p className="mb-4">Get {virtualMoneyAmount} virtual money to trade in this contest!</p>
                      <Button variant="primary" onClick={handleStartTrading}>
                        Start Trading Now
                      </Button>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
            
            {fillPercentage > 75 && (
              <Card className="border-danger mb-4 shadow-sm">
                <Card.Body className="text-center p-4 pulse-animation">
                  <div className="display-5 text-danger mb-2">
                    <i className="bi bi-lightning-fill"></i>
                  </div>
                  <h5>Filling Fast!</h5>
                  <p className="text-muted mb-3">Only {contest.maxParticipants - (contest.participants?.length || 0)} spots left in this contest.</p>
                  <div className="d-grid">
                    <Button variant="danger" onClick={handleStartTrading}>
                      Reserve Your Spot
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )}
            
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-dark text-white">
                <h5 className="mb-0">Share Contest</h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-center gap-3">
                  <Button variant="outline-primary">
                    <i className="bi bi-whatsapp fs-5"></i>
                  </Button>
                  <Button variant="outline-primary">
                    <i className="bi bi-telegram fs-5"></i>
                  </Button>
                  <Button variant="outline-primary">
                    <i className="bi bi-twitter fs-5"></i>
                  </Button>
                  <Button variant="outline-primary">
                    <i className="bi bi-facebook fs-5"></i>
                  </Button>
                  <Button variant="outline-primary">
                    <i className="bi bi-envelope fs-5"></i>
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      
      <Modal
        show={showJoinModal}
        onHide={() => setShowJoinModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Join Contest</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>You are about to join <strong>{contest?.name}</strong>.</p>
          
          <div className="d-flex justify-content-between mb-3">
            <span>Entry Fee:</span>
            <span className="fw-bold">₹{contest?.entryFee}</span>
          </div>
          
          <div className="d-flex justify-content-between mb-3">
            <span>Virtual Money:</span>
            <span className="fw-bold text-primary">{virtualMoneyAmount}</span>
          </div>
          
          <div className="d-flex justify-content-between mb-3">
            <span>Current Wallet Balance:</span>
            <span className="fw-bold">₹{user?.walletBalance || 0}</span>
          </div>
          
          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            By joining this contest, ₹{contest?.entryFee} will be deducted from your wallet.
          </Alert>
          
          {joinError && (
            <Alert variant="danger">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {joinError}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowJoinModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary"
            onClick={handleJoinContest}
            disabled={joinLoading || (user?.walletBalance < contest?.entryFee)}
          >
            {joinLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Joining...
              </>
            ) : (
              'Join Contest'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      <style jsx="true">{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .rules-container {
          overflow: hidden;
          transition: max-height 0.5s ease;
        }
        
        .rules-container.show {
          max-height: 500px;
        }
        
        .rules-container.hide {
          max-height: 0;
        }
        
        .pulse-animation {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ContestDetails;