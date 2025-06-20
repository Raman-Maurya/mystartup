import React from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';

const VirtualWallet = ({ contestId, virtualBalance, availableCash, currentPnL, trades = [] }) => {
  // Format currency values
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '₹0.00';
    return `₹${parseFloat(value).toFixed(2)}`;
  };
  
  // Calculate invested amount (total cost of open positions)
  const calculateInvestedAmount = () => {
    if (!trades || trades.length === 0) return 0;
    return trades.reduce((total, trade) => {
      return total + (trade.price * trade.quantity);
    }, 0);
  };
  
  const investedAmount = calculateInvestedAmount();
  const netWorth = virtualBalance + investedAmount + currentPnL;
  
  // Calculate total profit/loss percentage
  const startingBalance = 50000; // Default starting balance
  const profitLossAmount = netWorth - startingBalance;
  const profitLossPercentage = ((netWorth / startingBalance) - 1) * 100;
  
  return (
    <Card className="mb-3 shadow-sm">
      <Card.Body className="p-0">
        <Row className="g-0">
          <Col xs={12} md={3} className="border-end p-3">
            <div className="text-center">
              <div className="text-muted small">Base Balance</div>
              <div className="h4 mb-0">{formatCurrency(virtualBalance)}</div>
            </div>
          </Col>
          <Col xs={12} md={3} className="border-end p-3">
            <div className="text-center">
              <div className="text-muted small">Available Cash</div>
              <div className={`h4 mb-0 ${availableCash < virtualBalance ? 'text-danger' : 'text-success'}`}>
                {formatCurrency(availableCash)}
              </div>
            </div>
          </Col>
          <Col xs={12} md={3} className="border-end p-3">
            <div className="text-center">
              <div className="text-muted small">Current P&L</div>
              <div className={`h4 mb-0 ${currentPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                {currentPnL >= 0 ? '+' : ''}{formatCurrency(currentPnL)}
              </div>
            </div>
          </Col>
          <Col xs={12} md={3} className="p-3">
            <div className="text-center">
              <div className="text-muted small">Net Worth</div>
              <div className={`h4 mb-0 ${profitLossAmount >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(netWorth)}
                <Badge 
                  bg={profitLossAmount >= 0 ? 'success' : 'danger'} 
                  className="ms-2 align-middle"
                >
                  {profitLossAmount >= 0 ? '+' : ''}{profitLossPercentage.toFixed(2)}%
                </Badge>
              </div>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default VirtualWallet; 