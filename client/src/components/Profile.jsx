import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Nav, Tab, Badge } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Profile = () => {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [addingFunds, setAddingFunds] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [walletMessage, setWalletMessage] = useState('');
  
  // Initialize mock contests as empty array
  const mockUserContests = [];
  
  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isAuthenticated && !localStorage.getItem('token')) {
      navigate('/login', { state: { from: '/profile' } });
      return;
    }
  }, [isAuthenticated, navigate]);
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleProfileUpdate = (e) => {
    e.preventDefault();
    // Dispatch action to update profile
    setMessage({ type: 'success', text: 'Profile updated successfully!' });
  };
  
  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'danger', text: 'New passwords do not match!' });
      return;
    }
    
    // Dispatch action to update password
    setMessage({ type: 'success', text: 'Password updated successfully!' });
    
    // Clear password fields
    setFormData({
      ...formData,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };
  
  // Mock trading statistics
  const tradingStats = {
    totalContests: 15,
    contestsWon: 3,
    winRate: '20%',
    totalPnL: '+₹12,450',
    bestPerformance: '+₹8,200',
    worstPerformance: '-₹1,500',
    averageReturn: '+₹830'
  };
  
  // Razorpay Add Funds Handler
  const handleAddFunds = async () => {
    setWalletMessage('');
    if (!addAmount || isNaN(addAmount) || Number(addAmount) < 100) {
      setWalletMessage('Please enter a valid amount (minimum ₹100)');
      return;
    }
    setAddingFunds(true);
    try {
      // 1. Create order on backend
      const { data } = await axios.post('/api/payments/deposit', { amount: Number(addAmount) });
      const { order } = data;
      // 2. Load Razorpay script if not loaded
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }
      // 3. Open Razorpay modal
      const options = {
        key: order.key,
        amount: order.amount * 100,
        currency: order.currency,
        name: 'Trading Contest',
        description: 'Add Funds to Wallet',
        order_id: order.id,
        handler: async function (response) {
          // 4. Verify payment on backend
          try {
            const verifyRes = await axios.post('/api/payments/deposit/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
            setWalletMessage('Funds added successfully!');
            // Optionally, refresh user/wallet info here
            window.location.reload();
          } catch (err) {
            setWalletMessage('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.username,
          email: user?.email,
        },
        theme: { color: '#3399cc' },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setWalletMessage('Failed to initiate payment. Please try again.');
    } finally {
      setAddingFunds(false);
    }
  };
  
  return (
    <Container className="py-5">
      <Row>
        <Col lg={3} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="mb-3">
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto" style={{ width: '100px', height: '100px', fontSize: '2.5rem' }}>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <h5 className="mb-1">{user?.username || 'Username'}</h5>
              <p className="text-muted small">{user?.email || 'email@example.com'}</p>
              <div className="d-grid gap-2 mt-3">
                <Button variant="outline-primary" size="sm">Edit Profile</Button>
              </div>
            </Card.Body>
            <hr className="m-0" />
            <Card.Body>
              <h6 className="mb-3">Account Balance</h6>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Wallet Balance</span>
                <span className="fw-bold">₹{user?.walletBalance?.toLocaleString() || '0'}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Winnings</span>
                <span className="fw-bold text-success">₹{user?.winnings?.toLocaleString() || '0'}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span>Bonus</span>
                <span className="fw-bold text-primary">₹{user?.bonus?.toLocaleString() || '0'}</span>
              </div>
              <div className="d-grid gap-2 mt-3">
                <Button variant="success" size="sm" onClick={() => setActiveTab('wallet')}>Add Funds</Button>
                <Button variant="outline-secondary" size="sm" onClick={() => setActiveTab('wallet')}>Withdraw</Button>
              </div>
            </Card.Body>
          </Card>
          
          <Card className="border-0 shadow-sm mt-4">
            <Card.Body>
              <h6 className="mb-3">Quick Links</h6>
              <Nav className="flex-column">
                <Nav.Link href="/profile" className="px-0">
                  <i className="bi bi-person me-2"></i> My Profile
                </Nav.Link>
                <Nav.Link href="/my-contests" className="px-0">
                  <i className="bi bi-trophy me-2"></i> My Contests
                </Nav.Link>
                <Nav.Link href="/transactions" className="px-0">
                  <i className="bi bi-credit-card me-2"></i> Transaction History
                </Nav.Link>
                <Nav.Link href="/referrals" className="px-0">
                  <i className="bi bi-people me-2"></i> Refer & Earn
                </Nav.Link>
                <Nav.Link href="/settings" className="px-0">
                  <i className="bi bi-gear me-2"></i> Account Settings
                </Nav.Link>
              </Nav>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={9}>
          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white">
                <Nav variant="tabs" className="border-bottom-0">
                  <Nav.Item>
                    <Nav.Link eventKey="profile">Profile Information</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="security">Security</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="stats">Trading Statistics</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="wallet">Wallet</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="verification">Verification</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="virtualWallets">Contest Wallets</Nav.Link>
                  </Nav.Item>
                </Nav>
              </Card.Header>
              <Card.Body>
                <Tab.Content>
                  <Tab.Pane eventKey="profile">
                    {message.text && activeTab === 'profile' && (
                      <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
                        {message.text}
                      </Alert>
                    )}
                    
                    <Form onSubmit={handleProfileUpdate}>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Username</Form.Label>
                            <Form.Control
                              type="text"
                              name="username"
                              value={formData.username}
                              onChange={handleChange}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              required
                              disabled
                            />
                            <Form.Text className="text-muted">
                              Email cannot be changed
                            </Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control
                              type="text"
                              name="fullName"
                              value={formData.fullName}
                              onChange={handleChange}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Phone Number</Form.Label>
                            <Form.Control
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Bio</Form.Label>
                        <Form.Control
                          as="textarea"
                          name="bio"
                          value={formData.bio}
                          onChange={handleChange}
                          rows={3}
                        />
                      </Form.Group>
                      
                      <Button type="submit" variant="primary">
                        Update Profile
                      </Button>
                    </Form>
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="security">
                    {message.text && activeTab === 'security' && (
                      <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
                        {message.text}
                      </Alert>
                    )}
                    
                    <Form onSubmit={handlePasswordUpdate}>
                      <Form.Group className="mb-3">
                        <Form.Label>Current Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>New Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleChange}
                          required
                        />
                        <Form.Text className="text-muted">
                          Password must be at least 8 characters long
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Confirm New Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                      
                      <Button type="submit" variant="primary">
                        Update Password
                      </Button>
                    </Form>
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="stats">
                    <Row>
                      <Col md={4} className="mb-4">
                        <Card className="border-0 bg-light h-100">
                          <Card.Body className="text-center">
                            <h6 className="text-muted mb-2">Total Contests</h6>
                            <h3 className="mb-0">{tradingStats.totalContests}</h3>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={4} className="mb-4">
                        <Card className="border-0 bg-light h-100">
                          <Card.Body className="text-center">
                            <h6 className="text-muted mb-2">Contests Won</h6>
                            <h3 className="mb-0">{tradingStats.contestsWon}</h3>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={4} className="mb-4">
                        <Card className="border-0 bg-light h-100">
                          <Card.Body className="text-center">
                            <h6 className="text-muted mb-2">Win Rate</h6>
                            <h3 className="mb-0">{tradingStats.winRate}</h3>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                    
                    <Card className="border-0 shadow-sm mb-4">
                      <Card.Header className="bg-white">
                        <h5 className="mb-0">Performance Metrics</h5>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <div className="mb-4">
                              <h6 className="text-muted">Total P&L</h6>
                              <h4 className={tradingStats.totalPnL.includes('+') ? 'text-success' : 'text-danger'}>
                                {tradingStats.totalPnL}
                              </h4>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="mb-4">
                              <h6 className="text-muted">Average Return</h6>
                              <h4 className={tradingStats.averageReturn.includes('+') ? 'text-success' : 'text-danger'}>
                                {tradingStats.averageReturn}
                              </h4>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div>
                              <h6 className="text-muted">Best Performance</h6>
                              <h4 className="text-success">{tradingStats.bestPerformance}</h4>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div>
                              <h6 className="text-muted">Worst Performance</h6>
                              <h4 className="text-danger">{tradingStats.worstPerformance}</h4>
                            </div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                    
                    <div className="text-center">
                      <p className="text-muted">Want to improve your trading skills?</p>
                      <Button variant="outline-primary">View Trading Tutorials</Button>
                    </div>
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="wallet">
                    <h5 className="mb-3">Wallet Management</h5>
                    <div className="mb-3">
                      <Form inline="true" className="d-flex align-items-center gap-2">
                        <Form.Control
                          type="number"
                          min="100"
                          placeholder="Enter amount (min ₹100)"
                          value={addAmount}
                          onChange={e => setAddAmount(e.target.value)}
                          style={{ maxWidth: 180 }}
                          disabled={addingFunds}
                        />
                        <Button variant="success" onClick={handleAddFunds} disabled={addingFunds}>
                          {addingFunds ? 'Processing...' : 'Add Funds'}
                        </Button>
                      </Form>
                      {walletMessage && <Alert className="mt-3" variant={walletMessage.includes('success') ? 'success' : 'danger'}>{walletMessage}</Alert>}
                    </div>
                    
                    <Card className="border-0 shadow-sm">
                      <Card.Body>
                        <h6 className="mb-3">Withdraw Funds</h6>
                        <p className="text-muted">Withdraw your winnings to your bank account.</p>
                        
                        {!user?.isPanVerified ? (
                          <Alert variant="warning">
                            <Alert.Heading>Verification Required</Alert.Heading>
                            <p>
                              You need to verify your PAN Card before making any withdrawals.
                              Please complete your verification in the Verification tab.
                            </p>
                            <Button variant="outline-primary" onClick={() => setActiveTab('verification')}>
                              Go to Verification
                            </Button>
                          </Alert>
                        ) : (
                          <Form>
                            <Form.Group className="mb-3">
                              <Form.Label>Amount (₹)</Form.Label>
                              <Form.Control type="number" min="100" max={user?.winnings || 0} placeholder="Enter amount" />
                              <Form.Text className="text-muted">
                                Maximum withdrawable amount: ₹{user?.winnings?.toLocaleString() || '0'}
                              </Form.Text>
                            </Form.Group>
                            
                            <Form.Group className="mb-3">
                              <Form.Label>Bank Account</Form.Label>
                              <Form.Select>
                                <option>Select bank account</option>
                                <option>HDFC Bank - XXXX1234</option>
                                <option>+ Add new bank account</option>
                              </Form.Select>
                            </Form.Group>
                            
                            <Button variant="primary">Request Withdrawal</Button>
                          </Form>
                        )}
                      </Card.Body>
                    </Card>
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="verification">
                    <h5 className="mb-4">Account Verification</h5>
                    
                    <Card className="border-0 shadow-sm mb-4">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="mb-0">PAN Card Verification</h6>
                          <Badge bg={user?.isPanVerified ? "success" : "warning"}>
                            {user?.isPanVerified ? "Verified" : "Pending"}
                          </Badge>
                        </div>
                        
                        <p className="text-muted mb-4">
                          PAN Card verification is required for all withdrawals as per government regulations.
                          Your information is securely stored and will only be used for verification purposes.
                        </p>
                        
                        {user?.isPanVerified ? (
                          <div className="d-flex align-items-center">
                            <div className="bg-success-subtle p-2 rounded me-3">
                              <i className="bi bi-check-circle text-success fs-4"></i>
                            </div>
                            <div>
                              <div className="fw-bold">Verification Complete</div>
                              <div className="text-muted small">Your PAN Card has been verified successfully.</div>
                            </div>
                          </div>
                        ) : (
                          <Form>
                            <Form.Group className="mb-3">
                              <Form.Label>PAN Card Number</Form.Label>
                              <Form.Control type="text" placeholder="Enter your PAN number" />
                              <Form.Text className="text-muted">
                                Format: ABCDE1234F
                              </Form.Text>
                            </Form.Group>
                            
                            <Form.Group className="mb-3">
                              <Form.Label>Full Name (as on PAN Card)</Form.Label>
                              <Form.Control type="text" placeholder="Enter your full name" />
                            </Form.Group>
                            
                            <Form.Group className="mb-4">
                              <Form.Label>Upload PAN Card Image</Form.Label>
                              <Form.Control type="file" accept="image/*" />
                              <Form.Text className="text-muted">
                                Upload a clear image of your PAN card. Max size: 2MB
                              </Form.Text>
                            </Form.Group>
                            
                            <Button variant="primary">Submit for Verification</Button>
                          </Form>
                        )}
                      </Card.Body>
                    </Card>
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="virtualWallets">
                    <h5 className="mb-4">Your Virtual Contest Wallets</h5>
                    
                    {/* Mock data for virtual wallets */}
                    {mockUserContests.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Contest</th>
                              <th>Virtual Balance</th>
                              <th>P&L</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mockUserContests.map((contest, index) => (
                              <tr key={index}>
                                <td>
                                  <div className="fw-bold">{contest.name}</div>
                                  <small className="text-muted">
                                    {new Date(contest.endDate).toLocaleDateString()}
                                  </small>
                                </td>
                                <td className="fw-bold">
                                  ₹{(50000 - (contest.pnl || 0)).toLocaleString()}
                                </td>
                                <td className={`fw-bold ${contest.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                                  {contest.pnl >= 0 ? '+' : ''}₹{contest.pnl?.toLocaleString() || 0}
                                </td>
                                <td>
                                  <Badge bg={
                                    contest.status === 'ACTIVE' ? 'success' :
                                    contest.status === 'UPCOMING' ? 'warning' : 'secondary'
                                  }>
                                    {contest.status}
                                  </Badge>
                                </td>
                                <td>
                                  {contest.status === 'ACTIVE' && (
                                    <Button 
                                      size="sm" 
                                      variant="outline-primary"
                                      onClick={() => navigate(`/trade/${contest._id}`)}
                                    >
                                      Trade Now
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <i className="bi bi-wallet2 display-1 text-muted"></i>
                        <h4 className="mt-3">No Contest Wallets</h4>
                        <p className="text-muted">
                          You haven't joined any contests yet. Join a contest to get started with trading!
                        </p>
                        <Button 
                          variant="primary" 
                          onClick={() => navigate('/contests')}
                        >
                          Browse Contests
                        </Button>
                      </div>
                    )}
                    
                    <Alert variant="info" className="mt-4">
                      <i className="bi bi-info-circle-fill me-2"></i>
                      Virtual wallets are specific to each contest. The virtual money can only be used for trading within the respective contest.
                    </Alert>
                  </Tab.Pane>
                </Tab.Content>
              </Card.Body>
            </Card>
          </Tab.Container>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;