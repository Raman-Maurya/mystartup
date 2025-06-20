import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, Alert, Tabs, Tab, Table, Badge, ProgressBar } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { createContest } from '../redux/actions/contestActions';
import axios from 'axios';
import './AdminContestForm.css';

const AdminContestForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const dispatch = useDispatch();
  
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    entryFee: 100,
    prizePool: 0, // Will be calculated based on distribution
    maxParticipants: 100,
    minParticipants: 2,
    startDate: '',
    endDate: '',
    contestType: 'PAID',
    category: 'nifty50', 
    virtualMoneyAmount: 50000,
    tradingSettings: {
      maxTradesPerUser: 5,
      maxOpenPositions: 2,
      maxPositionSize: 50
    },
    isPublished: false,
    status: 'UPCOMING'
  });
  
  const [prizeDistribution, setPrizeDistribution] = useState([
    { rank: 1, amount: 0 },
    { rank: 2, amount: 0 },
    { rank: 3, amount: 0 }
  ]);
  
  const contestTypes = [
    { id: 'FREE', name: 'Free Entry', description: 'Practice trading with no entry fee' },
    { id: 'PAID', name: 'Paid Entry', description: 'Regular paid contest' },
    { id: 'HEAD2HEAD', name: 'Head to Head', description: 'One-on-one trading competition' },
    { id: 'GUARANTEED', name: 'Guaranteed Prize Pool', description: 'Prize pool is guaranteed regardless of participation' },
    { id: 'WINNER_TAKES_ALL', name: 'Winner Takes All', description: 'Winner gets the entire prize pool' }
  ];
  
  const assetCategories = [
    { id: 'nifty50', name: 'Nifty 50 Options', icon: 'bi-graph-up' },
    { id: 'banknifty', name: 'Bank Nifty Options', icon: 'bi-bank' },
    { id: 'stocks', name: 'Stock Options', icon: 'bi-bar-chart-line' },
    { id: 'crypto', name: 'Crypto', icon: 'bi-currency-bitcoin' },
    { id: 'forex', name: 'Forex', icon: 'bi-currency-exchange' },
    { id: 'mixed', name: 'Mixed Assets', icon: 'bi-layers' }
  ];
  
  // Calculate total prize pool based on entry fee and max participants
  useEffect(() => {
    const calculatePrizePool = () => {
      if (form.contestType === 'FREE') {
        return 0;
      }
      
      const entryFee = parseInt(form.entryFee || 0);
      const maxParticipants = parseInt(form.maxParticipants || 0);
      
      if (!isNaN(entryFee) && !isNaN(maxParticipants)) {
        const totalPool = entryFee * maxParticipants;
        // Take 10% platform fee
        const prizePool = Math.floor(totalPool * 0.9);
        
        // Use functional update to avoid stale state
        setForm(prevForm => {
          // Only update if different to avoid infinite loops
          if (prevForm.prizePool !== prizePool) {
            return { ...prevForm, prizePool };
          }
          return prevForm;
        });
        
        return prizePool;
      }
      return 0;
    };
    
    // Calculate immediately
    calculatePrizePool();
  }, [form.entryFee, form.maxParticipants, form.contestType]);
  
  // Update prize distribution whenever prize pool changes
  useEffect(() => {
    if (form.prizePool > 0 && calculateTotalAmount() === 0) {
      // Auto-distribute only if no manual values have been set
      autoDistributePrizes();
    }
  }, [form.prizePool]);
  
  // Set virtual money amount based on max participants
  useEffect(() => {
    const maxParticipants = parseInt(form.maxParticipants || 0);
    if (maxParticipants >= 500 && form.virtualMoneyAmount === 50000) {
      setForm(prev => ({...prev, virtualMoneyAmount: 79999}));
    } else if (maxParticipants < 500 && form.virtualMoneyAmount === 79999) {
      setForm(prev => ({...prev, virtualMoneyAmount: 50000}));
    }
  }, [form.maxParticipants]);

  // Fetch contest data if editing
  useEffect(() => {
    if (isEditing) {
      fetchContest();
    } else {
      // Set default start and end dates for new contests
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      setForm(prevForm => ({
        ...prevForm,
        startDate: formatDateForInput(now),
        endDate: formatDateForInput(tomorrow)
      }));
    }
  }, [id]);
  
  const fetchContest = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/contests/${id}`);
      const contestData = response.data;
      
      // Format dates for form inputs
      setForm({
        ...contestData,
        startDate: formatDateForInput(new Date(contestData.startDate)),
        endDate: formatDateForInput(new Date(contestData.endDate))
      });
      
      // Set prize distribution if available
      if (contestData.prizeDistribution) {
        setPrizeDistribution(contestData.prizeDistribution);
      }
      
    } catch (err) {
      setError('Failed to load contest data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDateForInput = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle nested objects like tradingSettings
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };
  
  const handlePrizeDistributionChange = (index, field, value) => {
    const updatedDistribution = [...prizeDistribution];
    updatedDistribution[index][field] = Number(value);
    setPrizeDistribution(updatedDistribution);
  };
  
  const addPrizeRank = () => {
    const nextRank = prizeDistribution.length + 1;
    setPrizeDistribution([
      ...prizeDistribution,
      { rank: nextRank, amount: 0 }
    ]);
  };
  
  const removePrizeRank = (index) => {
    if (prizeDistribution.length <= 1) return;
    const updatedDistribution = prizeDistribution.filter((_, i) => i !== index);
    // Recalculate ranks
    const redistributed = updatedDistribution.map((prize, i) => ({
      ...prize,
      rank: i + 1
    }));
    setPrizeDistribution(redistributed);
  };
  
  const calculateTotalAmount = () => {
    return prizeDistribution.reduce((sum, item) => sum + Number(item.amount), 0);
  };
  
  // Quick suggestion for distributing prize pool
  const autoDistributePrizes = () => {
    if (!form.prizePool || form.prizePool <= 0) return;
    
    // For winner takes all contests
    if (form.contestType === 'WINNER_TAKES_ALL') {
      setPrizeDistribution([{ rank: 1, amount: form.prizePool }]);
      return;
    }
    
    // Default distribution percentages based on number of ranks
    const getDistribution = (numRanks) => {
      switch(numRanks) {
        case 1: return [100];
        case 2: return [70, 30];
        case 3: return [60, 30, 10];
        case 4: return [50, 25, 15, 10];
        case 5: return [45, 25, 15, 10, 5];
        default:
          // For more than 5 ranks, allocate 80% to top 5 and rest evenly
          const topFive = [40, 20, 10, 7, 3];
          const remaining = 20;
          const restEach = Math.floor(remaining / (numRanks - 5));
          return [...topFive, ...Array(numRanks - 5).fill(restEach)];
      }
    };
    
    const distribution = getDistribution(prizeDistribution.length);
    const updated = prizeDistribution.map((prize, index) => ({
      ...prize,
      amount: Math.floor((distribution[index] / 100) * form.prizePool)
    }));
    
    setPrizeDistribution(updated);
  };
  
  // Validate that total prize amount doesn't exceed prize pool
  const validatePrizeAmounts = () => {
    const totalAmount = calculateTotalAmount();
    return totalAmount <= form.prizePool;
  };
  
  // Check if any prize amount is invalid (negative or exceeds pool)
  const hasPrizeErrors = () => {
    return !validatePrizeAmounts() || prizeDistribution.some(p => p.amount < 0);
  };
  
  const getTotalPrizeAmount = () => {
    return prizeDistribution.reduce((sum, prize) => sum + prize.amount, 0);
  };
  
  const getContestTypeInfo = (typeId) => {
    return contestTypes.find(type => type.id === typeId) || {};
  };
  
  const getCategoryInfo = (categoryId) => {
    return assetCategories.find(cat => cat.id === categoryId) || {};
  };
  
  const isFormValid = () => {
    // Basic validation
    if (!form.name || !form.description || !form.startDate || !form.endDate) {
      return false;
    }
    
    // Validate dates
    const startDate = new Date(form.startDate);
    const endDate = new Date(form.endDate);
    if (endDate <= startDate) {
      return false;
    }
    
    // Validate prize distribution
    if (form.contestType !== 'FREE' && !validatePrizeAmounts()) {
      return false;
    }
    
    // Validate participant counts
    if (form.maxParticipants < form.minParticipants) {
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      setError('Please fill in all required fields and fix any validation errors.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare contest data
      const contestData = {
        ...form,
        prizeDistribution: prizeDistribution.reduce((acc, prize) => {
          acc[prize.rank] = prize.amount;
          return acc;
        }, {}),
        isPublished: true // Ensure the contest is published
      };
      
      // Create or update contest
      let response;
      if (isEditing) {
        response = await axios.put(`/api/contests/${id}`, contestData);
        setSuccess('Contest updated successfully!');
      } else {
        response = await dispatch(createContest(contestData));
        setSuccess('Contest created successfully!');
      }
      
      // Refresh contests list
      dispatch({ type: 'REFRESH_CONTESTS_NEEDED' });
      
      // Navigate after a short delay to show the success message
      setTimeout(() => {
        navigate('/admin');
      }, 1500);
      
    } catch (err) {
      console.error('Error saving contest:', err);
      setError(err.response?.data?.message || 'Failed to save contest. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">
          {isEditing ? 'Loading contest details...' : 'Setting up contest form...'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="contest-form-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{isEditing ? 'Edit Contest' : 'Create New Contest'}</h2>
        <Button 
          variant="outline-secondary" 
          onClick={() => navigate('/admin')}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Back to Admin Dashboard
        </Button>
      </div>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          <i className="bi bi-check-circle-fill me-2"></i>
          {success}
        </Alert>
      )}
      
      <Card className="shadow-sm">
        <Card.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4"
          >
            <Tab eventKey="basic" title="Basic Details">
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Contest Name <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="E.g., Daily Nifty Challenge"
                        required
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Contest Type <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        name="contestType"
                        value={form.contestType}
                        onChange={handleChange}
                        required
                      >
                        {contestTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text muted>
                        {getContestTypeInfo(form.contestType).description}
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Label>Description <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the contest, rules, and any special instructions"
                    required
                  />
                </Form.Group>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Date & Time <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="datetime-local"
                        name="startDate"
                        value={form.startDate}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>End Date & Time <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="datetime-local"
                        name="endDate"
                        value={form.endDate}
                        onChange={handleChange}
                        required
                      />
                      {new Date(form.endDate) <= new Date(form.startDate) && (
                        <Form.Text className="text-danger">
                          End date must be after start date
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Category <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        required
                      >
                        {assetCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </Form.Select>
                      <div className="d-flex align-items-center mt-2">
                        <i className={`bi ${getCategoryInfo(form.category).icon} me-2`}></i>
                        <span>{getCategoryInfo(form.category).name} Trading</span>
                      </div>
                    </Form.Group>
                  </Col>
                  
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="UPCOMING">Upcoming</option>
                        <option value="ACTIVE">Active</option>
                      </Form.Select>
                      <Form.Text muted>
                        Set to "Upcoming" to make it visible to users
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  
                  <Col md={4}>
                    <Form.Group className="mb-3 d-flex flex-column">
                      <Form.Label>&nbsp;</Form.Label>
                      <Form.Check
                        type="switch"
                        id="isPublishedSwitch"
                        name="isPublished"
                        label="Publish contest immediately"
                        checked={form.isPublished}
                        onChange={handleChange}
                        className="mt-2"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <div className="mt-3 d-flex justify-content-between">
                  <Button variant="secondary" onClick={() => navigate('/admin')}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={() => setActiveTab('participation')}>
                    Next: Participation Settings <i className="bi bi-arrow-right ms-2"></i>
                  </Button>
                </div>
              </Form>
            </Tab>
            
            <Tab eventKey="participation" title="Participation & Rewards">
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Entry Fee (₹)</Form.Label>
                      <Form.Control
                        type="number"
                        name="entryFee"
                        value={form.entryFee}
                        onChange={handleChange}
                        disabled={form.contestType === 'FREE'}
                        min={0}
                      />
                      <Form.Text muted>
                        {form.contestType === 'FREE' 
                          ? 'Free contests have no entry fee'
                          : '90% of entry fees go to the prize pool, 10% is platform fee'}
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Virtual Money Amount (₹)</Form.Label>
                      <Form.Control
                        type="number"
                        name="virtualMoneyAmount"
                        value={form.virtualMoneyAmount}
                        onChange={handleChange}
                        min={5000}
                      />
                      <Form.Text muted>
                        {form.maxParticipants >= 500 
                          ? 'Mega contests typically use ₹79,999'
                          : 'Standard contests typically use ₹50,000'}
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Min Participants</Form.Label>
                      <Form.Control
                        type="number"
                        name="minParticipants"
                        value={form.minParticipants}
                        onChange={handleChange}
                        min={2}
                      />
                      <Form.Text muted>
                        Minimum participants needed for the contest to run
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Max Participants</Form.Label>
                      <Form.Control
                        type="number"
                        name="maxParticipants"
                        value={form.maxParticipants}
                        onChange={handleChange}
                        min={form.minParticipants}
                      />
                      <Form.Text className={form.maxParticipants < form.minParticipants ? 'text-danger' : 'text-muted'}>
                        {form.maxParticipants < form.minParticipants 
                          ? 'Max participants must be greater than min participants' 
                          : form.maxParticipants >= 500
                            ? 'This is a MEGA contest (500+ participants)'
                            : 'Standard size contest'}
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                
                <div className="prize-pool-card p-3 mb-4 border rounded">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Prize Pool</h5>
                    <div>
                      <span className="fs-4 fw-bold text-success">₹{form.prizePool.toLocaleString()}</span>
                      {form.contestType !== 'FREE' && (
                        <Badge bg="info" className="ms-2">
                          90% of Entry Fees
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {form.contestType === 'FREE' && (
                    <Alert variant="info" className="mb-0">
                      <i className="bi bi-info-circle me-2"></i>
                      Free contests do not have a monetary prize pool.
                    </Alert>
                  )}
                  
                  {form.contestType !== 'FREE' && (
                    <div className="prize-distribution-table">
                      <div className="d-flex justify-content-between mb-2">
                        <h6 className="mb-0">Prize Distribution</h6>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={autoDistributePrizes}
                        >
                          <i className="bi bi-magic me-1"></i> Auto-Distribute
                        </Button>
                      </div>
                      
                      <Table bordered size="sm" className="mb-2">
                        <thead>
                          <tr>
                            <th style={{ width: '20%' }}>Rank</th>
                            <th style={{ width: '50%' }}>Prize Amount (₹)</th>
                            <th style={{ width: '30%' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prizeDistribution.map((prize, index) => (
                            <tr key={index}>
                              <td>{prize.rank}</td>
                              <td>
                                <Form.Control
                                  type="number"
                                  value={prize.amount}
                                  onChange={(e) => handlePrizeDistributionChange(index, 'amount', e.target.value)}
                                  min={0}
                                  max={form.prizePool}
                                  size="sm"
                                  isInvalid={prize.amount < 0 || calculateTotalAmount() > form.prizePool}
                                />
                              </td>
                              <td>
                                <Button 
                                  variant="danger" 
                                  size="sm"
                                  onClick={() => removePrizeRank(index)}
                                  disabled={prizeDistribution.length <= 1}
                                >
                                  <i className="bi bi-trash"></i>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td><strong>Total</strong></td>
                            <td>
                              <strong 
                                className={
                                  calculateTotalAmount() > form.prizePool 
                                    ? 'text-danger' 
                                    : calculateTotalAmount() < form.prizePool
                                      ? 'text-warning'
                                      : 'text-success'
                                }
                              >
                                ₹{calculateTotalAmount().toLocaleString()}
                              </strong>
                              {calculateTotalAmount() !== form.prizePool && (
                                <span className="ms-2 text-muted">
                                  {calculateTotalAmount() > form.prizePool
                                    ? `(Exceeds by ₹${(calculateTotalAmount() - form.prizePool).toLocaleString()})`
                                    : `(₹${(form.prizePool - calculateTotalAmount()).toLocaleString()} remaining)`}
                                </span>
                              )}
                            </td>
                            <td>
                              <Button 
                                variant="success" 
                                size="sm"
                                onClick={addPrizeRank}
                              >
                                <i className="bi bi-plus-circle"></i>
                              </Button>
                            </td>
                          </tr>
                        </tfoot>
                      </Table>
                      
                      {calculateTotalAmount() !== form.prizePool && (
                        <div className="prize-pool-progress mb-2">
                          <ProgressBar 
                            now={Math.min(100, (calculateTotalAmount() / form.prizePool) * 100)}
                            variant={
                              calculateTotalAmount() > form.prizePool 
                                ? 'danger' 
                                : calculateTotalAmount() === form.prizePool
                                  ? 'success'
                                  : 'warning'
                            }
                            style={{ height: '8px' }}
                          />
                        </div>
                      )}
                      
                      {calculateTotalAmount() > form.prizePool && (
                        <Alert variant="danger" className="mb-0 py-2">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          Total prizes exceed the available prize pool
                        </Alert>
                      )}
                      
                      {calculateTotalAmount() < form.prizePool && form.prizePool > 0 && (
                        <Alert variant="warning" className="mb-0 py-2">
                          <i className="bi bi-info-circle me-2"></i>
                          Not all prize money has been allocated
                        </Alert>
                      )}
                      
                      {calculateTotalAmount() === form.prizePool && form.prizePool > 0 && (
                        <Alert variant="success" className="mb-0 py-2">
                          <i className="bi bi-check-circle me-2"></i>
                          Prize distribution balanced perfectly
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="mt-3 d-flex justify-content-between">
                  <Button variant="outline-secondary" onClick={() => setActiveTab('basic')}>
                    <i className="bi bi-arrow-left me-2"></i> Back
                  </Button>
                  <Button variant="primary" onClick={() => setActiveTab('trading')}>
                    Next: Trading Settings <i className="bi bi-arrow-right ms-2"></i>
                  </Button>
                </div>
              </Form>
            </Tab>
            
            <Tab eventKey="trading" title="Trading Settings">
              <Form>
                <Row className="mb-4">
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Max Trades Per User</Form.Label>
                      <Form.Control
                        type="number"
                        name="tradingSettings.maxTradesPerUser"
                        value={form.tradingSettings.maxTradesPerUser}
                        onChange={handleChange}
                        min={1}
                      />
                      <Form.Text muted>
                        Maximum number of trades a participant can make
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Max Open Positions</Form.Label>
                      <Form.Control
                        type="number"
                        name="tradingSettings.maxOpenPositions"
                        value={form.tradingSettings.maxOpenPositions}
                        onChange={handleChange}
                        min={1}
                      />
                      <Form.Text muted>
                        Maximum number of positions a user can hold simultaneously
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Max Position Size (%)</Form.Label>
                      <Form.Control
                        type="number"
                        name="tradingSettings.maxPositionSize"
                        value={form.tradingSettings.maxPositionSize}
                        onChange={handleChange}
                        min={1}
                        max={100}
                      />
                      <Form.Text muted>
                        Maximum percentage of virtual balance for a single trade
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Alert variant="secondary">
                  <h6 className="mb-3"><i className="bi bi-info-circle me-2"></i>Contest Trading Summary</h6>
                  
                  <Row>
                    <Col md={6}>
                      <ul className="list-unstyled">
                        <li><i className="bi bi-check2 text-success me-2"></i>Trading {getCategoryInfo(form.category).name}</li>
                        <li><i className="bi bi-check2 text-success me-2"></i>{form.virtualMoneyAmount.toLocaleString()} virtual money</li>
                        <li><i className="bi bi-check2 text-success me-2"></i>Max {form.tradingSettings.maxTradesPerUser} trades per participant</li>
                      </ul>
                    </Col>
                    <Col md={6}>
                      <ul className="list-unstyled">
                        <li><i className="bi bi-check2 text-success me-2"></i>Contest runs for {
                            Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24))
                          } days</li>
                        <li><i className="bi bi-check2 text-success me-2"></i>Up to {form.tradingSettings.maxOpenPositions} open positions</li>
                        <li><i className="bi bi-check2 text-success me-2"></i>Max {form.tradingSettings.maxPositionSize}% of balance per trade</li>
                      </ul>
                    </Col>
                  </Row>
                </Alert>
                
                <div className="mt-4 d-flex justify-content-between">
                  <Button variant="outline-secondary" onClick={() => setActiveTab('participation')}>
                    <i className="bi bi-arrow-left me-2"></i> Back
                  </Button>
                  <Button 
                    variant="success"
                    disabled={!isFormValid() || hasPrizeErrors() || loading}
                    onClick={handleSubmit}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-save me-2"></i>
                        {isEditing ? 'Update Contest' : 'Create Contest'}
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdminContestForm;
