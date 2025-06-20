import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, Button, Pagination } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const Transactions = () => {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isAuthenticated && !localStorage.getItem('token')) {
      navigate('/login', { state: { from: '/transactions' } });
      return;
    }
  }, [isAuthenticated, navigate]);
  
  // Mock transaction data
  const mockTransactions = [
    {
      _id: '1',
      type: 'deposit',
      amount: 5000,
      status: 'completed',
      date: new Date(Date.now() - 15 * 86400000),
      description: 'Wallet deposit via UPI',
      reference: 'TXN123456789'
    },
    {
      _id: '2',
      type: 'contest_entry',
      amount: -1000,
      status: 'completed',
      date: new Date(Date.now() - 14 * 86400000),
      description: 'Entry fee for Midcap Masters',
      reference: 'CONTEST004'
    },
    {
      _id: '3',
      type: 'winning',
      amount: 12000,
      status: 'completed',
      date: new Date(Date.now() - 10 * 86400000),
      description: 'Contest winnings from Midcap Masters',
      reference: 'WIN004123'
    },
    {
      _id: '4',
      type: 'contest_entry',
      amount: -500,
      status: 'completed',
      date: new Date(Date.now() - 5 * 86400000),
      description: 'Entry fee for Sensex Trading Cup',
      reference: 'CONTEST001'
    },
    {
      _id: '5',
      type: 'contest_entry',
      amount: -250,
      status: 'completed',
      date: new Date(Date.now() - 3 * 86400000),
      description: 'Entry fee for Bank Nifty Sprint',
      reference: 'CONTEST002'
    },
    {
      _id: '6',
      type: 'withdrawal',
      amount: -2000,
      status: 'pending',
      date: new Date(Date.now() - 1 * 86400000),
      description: 'Withdrawal to bank account',
      reference: 'WDR987654321'
    },
    {
      _id: '7',
      type: 'contest_entry',
      amount: -5000,
      status: 'completed',
      date: new Date(Date.now() - 1 * 86400000),
      description: 'Entry fee for Dalal Street Pro Championship',
      reference: 'CONTEST005'
    },
    {
      _id: '8',
      type: 'bonus',
      amount: 500,
      status: 'completed',
      date: new Date(Date.now() - 20 * 86400000),
      description: 'Welcome bonus',
      reference: 'BONUS001'
    }
  ];
  
  // Filter transactions based on selected filter
  const filteredTransactions = mockTransactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.type === filter;
  });
  
  // Sort transactions by date (newest first)
  const sortedTransactions = [...filteredTransactions].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
  
  // Pagination
  const transactionsPerPage = 5;
  const totalPages = Math.ceil(sortedTransactions.length / transactionsPerPage);
  const currentTransactions = sortedTransactions.slice(
    (currentPage - 1) * transactionsPerPage,
    currentPage * transactionsPerPage
  );
  
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  
  // Calculate account summary
  const accountSummary = {
    totalDeposits: mockTransactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0),
    totalWithdrawals: Math.abs(mockTransactions
      .filter(t => t.type === 'withdrawal' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0)),
    totalWinnings: mockTransactions
      .filter(t => t.type === 'winning')
      .reduce((sum, t) => sum + t.amount, 0),
    totalContestFees: Math.abs(mockTransactions
      .filter(t => t.type === 'contest_entry')
      .reduce((sum, t) => sum + t.amount, 0)),
    pendingWithdrawals: Math.abs(mockTransactions
      .filter(t => t.type === 'withdrawal' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0))
  };
  
  return (
    <Container className="py-5">
      <h2 className="mb-4">Transaction History</h2>
      
      <Row>
        <Col lg={4} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h5 className="mb-4">Account Summary</h5>
              
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Total Deposits</span>
                <span className="fw-bold">₹{accountSummary.totalDeposits.toLocaleString()}</span>
              </div>
              
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Total Withdrawals</span>
                <span className="fw-bold">₹{accountSummary.totalWithdrawals.toLocaleString()}</span>
              </div>
              
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Total Winnings</span>
                <span className="fw-bold text-success">₹{accountSummary.totalWinnings.toLocaleString()}</span>
              </div>
              
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Contest Entry Fees</span>
                <span className="fw-bold">₹{accountSummary.totalContestFees.toLocaleString()}</span>
              </div>
              
              <hr />
              
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Current Balance</span>
                <span className="fw-bold fs-5">₹{user?.walletBalance?.toLocaleString() || '0'}</span>
              </div>
              
              {accountSummary.pendingWithdrawals > 0 && (
                <div className="d-flex justify-content-between align-items-center text-muted small">
                  <span>Pending Withdrawals</span>
                  <span>₹{accountSummary.pendingWithdrawals.toLocaleString()}</span>
                </div>
              )}
              
              <div className="d-grid gap-2 mt-4">
                <Button variant="success">Add Funds</Button>
                <Button variant="outline-secondary">Withdraw</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0">Transactions</h5>
                
                <Form.Select 
                  style={{ width: 'auto' }}
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Transactions</option>
                  <option value="deposit">Deposits</option>
                  <option value="withdrawal">Withdrawals</option>
                  <option value="contest_entry">Contest Entries</option>
                  <option value="winning">Winnings</option>
                  <option value="bonus">Bonuses</option>
                </Form.Select>
              </div>
              
              {currentTransactions.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-credit-card display-1 text-muted"></i>
                  <h4 className="mt-3">No transactions found</h4>
                  <p className="text-muted">There are no transactions matching your filter.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table hover className="align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Description</th>
                          <th>Reference</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentTransactions.map(transaction => (
                          <tr key={transaction._id}>
                            <td className="text-nowrap">
                              {new Date(transaction.date).toLocaleDateString()}
                            </td>
                            <td>{transaction.description}</td>
                            <td className="text-muted small">{transaction.reference}</td>
                            <td className={`fw-bold ${transaction.amount > 0 ? 'text-success' : 'text-danger'}`}>
                              {transaction.amount > 0 ? '+' : ''}₹{Math.abs(transaction.amount).toLocaleString()}
                            </td>
                            <td>
                              <Badge bg={transaction.status === 'completed' ? 'success' : 'warning'} className="rounded-pill">
                                {transaction.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-4">
                      <Pagination>
                        <Pagination.First 
                          onClick={() => handlePageChange(1)} 
                          disabled={currentPage === 1}
                        />
                        <Pagination.Prev 
                          onClick={() => handlePageChange(currentPage - 1)} 
                          disabled={currentPage === 1}
                        />
                        
                        {[...Array(totalPages)].map((_, i) => (
                          <Pagination.Item
                            key={i + 1}
                            active={i + 1 === currentPage}
                            onClick={() => handlePageChange(i + 1)}
                          >
                            {i + 1}
                          </Pagination.Item>
                        ))}
                        
                        <Pagination.Next 
                          onClick={() => handlePageChange(currentPage + 1)} 
                          disabled={currentPage === totalPages}
                        />
                        <Pagination.Last 
                          onClick={() => handlePageChange(totalPages)} 
                          disabled={currentPage === totalPages}
                        />
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Transactions;