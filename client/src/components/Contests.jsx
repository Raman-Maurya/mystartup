import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form, InputGroup, ProgressBar, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchContests } from '../redux/actions/contestActions';
import ContestCard from './ContestCard';

const Contests = () => {
  const dispatch = useDispatch();
  const { contests: originalContests, loading, refreshNeeded } = useSelector(state => state.contests);
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const [filteredContests, setFilteredContests] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    priceRange: [0, 10000],
    contestType: 'all',
    category: 'all',
    status: 'all',
    sortBy: 'newest'
  });
  const [newContestAnimation, setNewContestAnimation] = useState(null);
  const [adminCreatedContest, setAdminCreatedContest] = useState(false);

  // Function to auto-create new contests when a contest is filled
  const checkAndCreateNewContests = (contests) => {
    let updatedContests = [...contests];
    let createdNewContest = false;
    
    updatedContests.forEach(contest => {
      // Check if contest is almost full (over 95%)
      if (contest.participants.length >= contest.maxParticipants * 0.95 && !contest.hasClone) {
        // Create a clone contest with same parameters but new ID
        const newContest = {
          ...contest,
          _id: 'new-' + contest._id,
          participants: [], // Start with empty participants
          isNew: true // Mark as new for animation
        };
        
        // Mark original as having a clone
        contest.hasClone = true;
        
        // Add new contest to the list
        updatedContests.push(newContest);
        
        // Set animation target for UI feedback
        setNewContestAnimation(newContest._id);
        setTimeout(() => setNewContestAnimation(null), 3000);
        
        createdNewContest = true;
      }
    });
    
    return createdNewContest ? updatedContests : contests;
  };

  useEffect(() => {
    console.log('Fetching contests...');
    dispatch(fetchContests());
  }, [dispatch]);
  
  // Add a separate effect to refresh contests when needed
  useEffect(() => {
    if (refreshNeeded) {
      console.log('Refreshing contests due to admin action...');
      dispatch(fetchContests());
      setAdminCreatedContest(true);
      // Clear the admin created contest state after a few seconds
      setTimeout(() => {
        setAdminCreatedContest(false);
      }, 5000);
    }
  }, [refreshNeeded, dispatch]);

  useEffect(() => {
    if (originalContests) {
      console.log('Original contests from API:', originalContests);
      
      // First check if we need to auto-create new contests
      const updatedContests = checkAndCreateNewContests(originalContests);
      
      let result = [...updatedContests];
      
      // Filter out contests that the user has already joined
      if (isAuthenticated && user) {
        result = result.filter(contest => 
          !contest.participants || !contest.participants.some(participant => 
            // Check if the user ID is in the participants array
            participant.user === user.id || 
            participant.user === user._id || 
            (typeof participant === 'object' && participant.user && 
             (participant.user === user.id || participant.user === user._id))
          )
        );
      }
      
      // Apply search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        result = result.filter(contest => 
          contest.name.toLowerCase().includes(searchTerm) ||
          contest.description.toLowerCase().includes(searchTerm) ||
          contest.category.toLowerCase().includes(searchTerm) ||
          (contest.stockCategory && contest.stockCategory.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply price range filter
      result = result.filter(contest => 
        contest.entryFee >= filters.priceRange[0] && 
        contest.entryFee <= filters.priceRange[1]
      );
      
      // Apply contest type filter
      if (filters.contestType !== 'all') {
        result = result.filter(contest => 
          contest.contestType.toUpperCase() === filters.contestType.toUpperCase()
        );
      }
      
      // Apply category filter
      if (filters.category !== 'all') {
        result = result.filter(contest => 
          contest.category.toLowerCase() === filters.category.toLowerCase()
        );
      }

      // Apply status filter
      if (filters.status !== 'all') {
        result = result.filter(contest => contest.status === filters.status);
      } else {
        // By default, only show UPCOMING and ACTIVE contests
        result = result.filter(contest => {
          const isVisible = contest.status === 'UPCOMING' || contest.status === 'ACTIVE';
          if (!isVisible) {
            console.log('Contest filtered out by status:', {
              id: contest._id,
              name: contest.name,
              status: contest.status,
              startDate: contest.startDate,
              endDate: contest.endDate
            });
          }
          return isVisible;
        });
      }
      
      // Apply sorting
      switch(filters.sortBy) {
        case 'newest':
          result.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
          break;
        case 'oldest':
          result.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
          break;
        case 'priceAsc':
          result.sort((a, b) => a.entryFee - b.entryFee);
          break;
        case 'priceDesc':
          result.sort((a, b) => b.entryFee - a.entryFee);
          break;
        case 'prizeDesc':
          result.sort((a, b) => b.prizePool - a.prizePool);
          break;
        case 'filling':
          // Sort by how filled the contest is (percentage)
          result.sort((a, b) => 
            (b.participants.length / b.maxParticipants) - 
            (a.participants.length / a.maxParticipants)
          );
          break;
        case 'highWinRate':
          // Show high win rate contests first
          result.sort((a, b) => {
            if (a.highWinRate === b.highWinRate) return 0;
            return a.highWinRate ? -1 : 1;
          });
          break;
        default:
          break;
      }
      
      console.log('Filtered contests:', result);
      setFilteredContests(result);
    }
  }, [originalContests, filters]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Define contest size categories
  const getContestCategory = (contest) => {
    if (contest.maxParticipants <= 50) return "small";
    if (contest.maxParticipants >= 500) return "mega";
    return "regular";
  };

  // Get virtual money for contest type
  const getVirtualMoney = (contest) => {
    const category = getContestCategory(contest);
    return category === "small" ? "₹50,000" : "₹79,999";
  };

  // Calculate fill percentage
  const calculateFillPercentage = (participants, maxParticipants) => {
    return (participants.length / maxParticipants) * 100;
  };

  // Get progress bar variant based on fill percentage
  const getProgressVariant = (fillPercentage) => {
    if (fillPercentage < 40) return "info";
    if (fillPercentage < 75) return "warning";
    return "danger";
  };

  return (
    <Container fluid className="py-4">
      {/* Admin Contest Creation Notification */}
      {adminCreatedContest && (
        <Row className="mb-4">
          <Col>
            <div className="alert alert-success d-flex align-items-center" role="alert">
              <i className="bi bi-check-circle-fill me-2"></i>
              <div>
                <strong>Success!</strong> Your new contest has been created and is now visible to users.
              </div>
            </div>
          </Col>
        </Row>
      )}
      
      {/* Already joined contests notification */}
      {isAuthenticated && (
        <Row className="mb-4">
          <Col>
            <div className="alert alert-info d-flex align-items-center" role="alert">
              <i className="bi bi-info-circle-fill me-2"></i>
              <div>
                Contests you've already joined won't appear here. Visit <Link to="/my-contests" className="alert-link">My Contests</Link> to view and manage your joined contests.
              </div>
            </div>
          </Col>
        </Row>
      )}
      
      {/* Filters */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              <Row className="g-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Search</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Search contests..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Contest Type</Form.Label>
                    <Form.Select
                      value={filters.contestType}
                      onChange={(e) => handleFilterChange('contestType', e.target.value)}
                    >
                      <option value="all">All Types</option>
                      <option value="FREE">Free</option>
                      <option value="PAID">Paid</option>
                      <option value="HEAD2HEAD">Head to Head</option>
                      <option value="GUARANTEED">Guaranteed</option>
                      <option value="WINNER_TAKES_ALL">Winner Takes All</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Category</Form.Label>
                    <Form.Select
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      <option value="nifty50">Nifty 50</option>
                      <option value="banknifty">Bank Nifty</option>
                      <option value="stocks">Stocks</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="UPCOMING">Upcoming</option>
                      <option value="ACTIVE">Live</option>
                      <option value="COMPLETED">Completed</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Sort By</Form.Label>
                    <Form.Select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="priceAsc">Entry Fee (Low to High)</option>
                      <option value="priceDesc">Entry Fee (High to Low)</option>
                      <option value="prizeDesc">Prize Pool (High to Low)</option>
                      <option value="filling">Filling Fast</option>
                      <option value="highWinRate">High Win Rate</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Contest Grid */}
      <Row>
        {loading ? (
          <Col className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Loading contests...</p>
          </Col>
        ) : filteredContests.length === 0 ? (
          <Col className="text-center py-5">
            <p className="text-muted">No contests found matching your filters.</p>
          </Col>
        ) : (
          filteredContests.map(contest => (
            <Col key={contest._id} xs={12} md={6} lg={4} xl={3} className="mb-4">
              <div className={contest.isNew || newContestAnimation === contest._id ? 'contest-highlight-animation' : ''}>
                <ContestCard 
                  contest={contest} 
                  isUserContest={false} 
                  isNew={contest.isNew || newContestAnimation === contest._id} 
                />
              </div>
            </Col>
          ))
        )}
      </Row>
    </Container>
  );
};

export default Contests;