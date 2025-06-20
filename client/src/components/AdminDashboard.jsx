import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Form, InputGroup, Row, Col, Alert, Spinner, Modal, Tabs, Tab } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contestToDelete, setContestToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('contests');
  
  // Stats for the admin dashboard
  const [stats, setStats] = useState({
    totalContests: 0,
    activeContests: 0,
    upcomingContests: 0,
    completedContests: 0,
    totalUsers: 0,
    totalRevenue: 0
  });
  
  useEffect(() => {
    fetchContests();
    fetchStats();
  }, []);
  
  const fetchContests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/contests');
      setContests(response.data.data || []);
    } catch (err) {
      console.error('Error fetching contests:', err);
      setError('Failed to load contests. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStats = async () => {
    try {
      // This would be a real API call in production
      // const response = await axios.get('/api/admin/stats');
      // setStats(response.data);
      
      // Mock stats for demo
      setStats({
        totalContests: 25,
        activeContests: 8,
        upcomingContests: 5,
        completedContests: 12,
        totalUsers: 1250,
        totalRevenue: 125000
      });
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    }
  };
  
  const handleDeleteContest = (contestId) => {
    setContestToDelete(contestId);
    setShowDeleteModal(true);
  };
  
  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/contests/${contestToDelete}`);
      setContests(contests.filter(contest => contest._id !== contestToDelete));
      setShowDeleteModal(false);
      setContestToDelete(null);
    } catch (err) {
      console.error('Error deleting contest:', err);
      setError('Failed to delete contest. Please try again later.');
    }
  };
  
  const handleStatusChange = async (contestId, newStatus) => {
    try {
      await axios.put(`/api/contests/${contestId}/status`, { status: newStatus });
      
      // Update the contest status in the UI
      setContests(contests.map(contest => 
        contest._id === contestId ? { ...contest, status: newStatus } : contest
      ));
    } catch (err) {
      console.error('Error updating contest status:', err);
      setError('Failed to update contest status. Please try again later.');
    }
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <Badge bg="secondary">Draft</Badge>;
      case 'UPCOMING':
        return <Badge bg="info">Upcoming</Badge>;
      case 'ACTIVE':
        return <Badge bg="success">Active</Badge>;
      case 'COMPLETED':
        return <Badge bg="primary">Completed</Badge>;
      case 'CANCELLED':
        return <Badge bg="danger">Cancelled</Badge>;
      default:
        return <Badge bg="light">Unknown</Badge>;
    }
  };
  
  // Filter contests based on search term and status filter
  const filteredContests = contests.filter(contest => {
    const matchesSearch = searchTerm === '' || 
      contest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contest.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || contest.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading admin dashboard...</p>
      </div>
    );
  }
  
  return (
    <div className="admin-dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Admin Dashboard</h2>
        <Button 
          variant="primary" 
          onClick={() => navigate('/admin/contests/new')}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Create New Contest
        </Button>
      </div>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="stats" title="Dashboard Stats">
          <Row className="mb-4">
            <Col md={4} className="mb-3">
              <Card className="h-100 shadow-sm">
                <Card.Body className="text-center">
                  <div className="display-4">{stats.totalContests}</div>
                  <div className="text-muted">Total Contests</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-3">
              <Card className="h-100 shadow-sm">
                <Card.Body className="text-center">
                  <div className="display-4">{stats.totalUsers}</div>
                  <div className="text-muted">Registered Users</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-3">
              <Card className="h-100 shadow-sm">
                <Card.Body className="text-center">
                  <div className="display-4">₹{stats.totalRevenue.toLocaleString()}</div>
                  <div className="text-muted">Total Revenue</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row className="mb-4">
            <Col md={4} className="mb-3">
              <Card className="h-100 shadow-sm border-success">
                <Card.Body className="text-center">
                  <div className="display-4 text-success">{stats.activeContests}</div>
                  <div className="text-muted">Active Contests</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-3">
              <Card className="h-100 shadow-sm border-info">
                <Card.Body className="text-center">
                  <div className="display-4 text-info">{stats.upcomingContests}</div>
                  <div className="text-muted">Upcoming Contests</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-3">
              <Card className="h-100 shadow-sm border-primary">
                <Card.Body className="text-center">
                  <div className="display-4 text-primary">{stats.completedContests}</div>
                  <div className="text-muted">Completed Contests</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      
        <Tab eventKey="contests" title="Manage Contests">
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          <Card className="shadow-sm">
            <Card.Header>
              <Row className="align-items-center">
                <Col md={5}>
                  <InputGroup>
                    <InputGroup.Text>
                      <i className="bi bi-search"></i>
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Search contests..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                <Col md={4}>
                  <Form.Select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </Form.Select>
                </Col>
                <Col md={3} className="text-end">
                  <Button 
                    variant="outline-primary" 
                    onClick={fetchContests}
                  >
                    <i className="bi bi-arrow-clockwise"></i> Refresh
                  </Button>
                </Col>
              </Row>
            </Card.Header>
            <div className="table-responsive">
              <Table striped hover className="mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Entry Fee</th>
                    <th>Prize Pool</th>
                    <th>Participants</th>
                    <th>Start Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        {searchTerm || statusFilter !== 'all' ? (
                          <div className="text-muted">
                            <i className="bi bi-search me-2"></i> No contests match your search.
                          </div>
                        ) : (
                          <div>
                            <div className="mb-3">
                              <i className="bi bi-calendar3 fs-1 text-muted"></i>
                            </div>
                            <p>No contests have been created yet.</p>
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => navigate('/admin/contests/new')}
                            >
                              Create Your First Contest
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredContests.map(contest => (
                      <tr key={contest._id}>
                        <td>
                          <div className="fw-bold">{contest.name}</div>
                          <small className="text-muted">{contest.description?.substring(0, 50)}{contest.description?.length > 50 ? '...' : ''}</small>
                        </td>
                        <td>
                          {contest.entryFee === 0 ? (
                            <Badge bg="success">FREE</Badge>
                          ) : (
                            `₹${contest.entryFee}`
                          )}
                        </td>
                        <td>₹{contest.prizePool?.toLocaleString()}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="me-2">{contest.participants?.length || 0}</span>
                            <span className="text-muted">/ {contest.maxParticipants}</span>
                          </div>
                          <div className="progress" style={{ height: '5px' }}>
                            <div 
                              className="progress-bar" 
                              role="progressbar"
                              style={{ width: `${(contest.participants?.length / contest.maxParticipants * 100) || 0}%` }}
                              aria-valuenow={(contest.participants?.length / contest.maxParticipants * 100) || 0}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            ></div>
                          </div>
                        </td>
                        <td>
                          {new Date(contest.startDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td>
                          {getStatusBadge(contest.status)}
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => navigate(`/admin/contests/edit/${contest._id}`)}
                            >
                              <i className="bi bi-pencil"></i>
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => handleDeleteContest(contest._id)}
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                            <Button 
                              as={Link}
                              to={`/contest/${contest._id}`}
                              variant="outline-secondary" 
                              size="sm"
                              target="_blank"
                            >
                              <i className="bi bi-eye"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        </Tab>
      </Tabs>
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Contest</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this contest? This action cannot be undone.</p>
          <p className="text-danger fw-bold">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Warning: Deleting a contest will affect all users who have joined it.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete Contest
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminDashboard; 