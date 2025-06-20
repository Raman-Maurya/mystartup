import React, { useEffect, useState } from 'react';
import { Table, Spinner, Form, Badge, Card, Col, Row, Alert } from 'react-bootstrap';
import axios from 'axios';

const OptionChain = ({ symbol = 'NIFTY', onSelect }) => {
  const [optionChain, setOptionChain] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spotPrice, setSpotPrice] = useState(0);
  const [expiryDates, setExpiryDates] = useState([]);
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds by default
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    const fetchOptionChain = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Determine the endpoint based on the symbol type
        let endpoint;
        const formattedSymbol = symbol ? symbol.toUpperCase() : 'NIFTY';
        
        if (['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'NIFTY50'].includes(formattedSymbol)) {
          // For index options
          const indexSymbol = formattedSymbol === 'NIFTY50' ? 'NIFTY' : formattedSymbol;
          endpoint = `/api/market-data/option-chain/${indexSymbol}`;
        } else {
          // For stock options
          endpoint = `/api/market-data/option-chain/stock/${formattedSymbol}`;
        }
        
        const response = await axios.get(endpoint);
        
        if (response.data && response.data.success && response.data.data) {
          const data = response.data.data;
          
          if (data.options && Array.isArray(data.options)) {
            setOptionChain(data.options);
          } else {
            // Handle case where options might be different format
            setOptionChain(data.optionChain || []);
          }
          
          setSpotPrice(data.spotPrice || 0);
          
          // Extract unique expiry dates
          if (data.expiryDates && data.expiryDates.length > 0) {
            setExpiryDates(data.expiryDates);
            
            if (selectedExpiry === '' && data.expiryDates.length > 0) {
              setSelectedExpiry(data.expiryDates[0]);
            }
          }
          
          setLastUpdated(new Date());
          
          if (response.data.data.note) {
            // We're using mock data
            setIsLive(false);
          } else {
            setIsLive(true);
          }
        } else {
          throw new Error('Failed to parse response data');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Option chain fetch error:', err);
        setError('Failed to load option chain data. Using demo data.');
        setIsLive(false);
        
        // Generate sample option chain data
        const mockData = generateMockOptionChain(formattedSymbol);
        setOptionChain(mockData.options);
        setSpotPrice(mockData.spotPrice);
        setExpiryDates(mockData.expiryDates);
        
        if (selectedExpiry === '' && mockData.expiryDates.length > 0) {
          setSelectedExpiry(mockData.expiryDates[0]);
        }
        
        setLastUpdated(new Date());
        setLoading(false);
      }
    };
    
    // Generate mock option chain for development/demo
    const generateMockOptionChain = (symbol) => {
      const basePrice = symbol === 'NIFTY' ? 22500 : 
                        symbol === 'BANKNIFTY' ? 48500 : 
                        symbol === 'FINNIFTY' ? 21500 : 1000;
      
      // Create expiry dates - current month, next month, and month after
      const now = new Date();
      const expiryDates = [
        new Date(now.getFullYear(), now.getMonth(), 28).toISOString(),
        new Date(now.getFullYear(), now.getMonth() + 1, 28).toISOString(),
        new Date(now.getFullYear(), now.getMonth() + 2, 28).toISOString()
      ];
      
      // Generate strike prices around the base price
      const strikes = [];
      const strikeDiff = symbol === 'NIFTY' ? 50 : 
                        symbol === 'BANKNIFTY' ? 100 : 
                        symbol === 'FINNIFTY' ? 50 : 10;
      
      // Generate 10 strikes below and 10 above the ATM price
      for (let i = -10; i <= 10; i++) {
        strikes.push(Math.round(basePrice + i * strikeDiff));
      }
      
      // Generate option data for each strike
      const options = strikes.map(strike => {
        const diff = strike - basePrice;
        const isATM = Math.abs(diff) <= strikeDiff / 2;
        
        // Calculate call premium based on proximity to ATM
        const callPremium = Math.max(basePrice * 0.02 - Math.abs(diff) * 0.0005, 0.1).toFixed(2);
        const callOI = Math.round(Math.random() * 1000000);
        const callVolume = Math.round(callOI * (0.2 + Math.random() * 0.3));
        const callChange = (Math.random() * 20 - 10).toFixed(2);
        
        // Calculate put premium based on proximity to ATM
        const putPremium = Math.max(basePrice * 0.02 - Math.abs(diff) * 0.0005, 0.1).toFixed(2);
        const putOI = Math.round(Math.random() * 1000000);
        const putVolume = Math.round(putOI * (0.2 + Math.random() * 0.3));
        const putChange = (Math.random() * 20 - 10).toFixed(2);
        
        return {
          strikePrice: strike,
          isATM,
          call: {
            symbol: `${symbol}${strike}CE`,
            lastPrice: parseFloat(callPremium),
            change: parseFloat(callChange),
            openInterest: callOI,
            volume: callVolume,
            bidPrice: parseFloat(callPremium) * 0.98,
            askPrice: parseFloat(callPremium) * 1.02,
            expiryDate: expiryDates[0] // Use current month
          },
          put: {
            symbol: `${symbol}${strike}PE`,
            lastPrice: parseFloat(putPremium),
            change: parseFloat(putChange),
            openInterest: putOI,
            volume: putVolume,
            bidPrice: parseFloat(putPremium) * 0.98,
            askPrice: parseFloat(putPremium) * 1.02,
            expiryDate: expiryDates[0] // Use current month
          }
        };
      });
      
      return {
        spotPrice: basePrice,
        options,
        expiryDates
      };
    };

    fetchOptionChain();
    
    // Refresh data periodically
    const interval = setInterval(fetchOptionChain, refreshInterval);
    
    return () => clearInterval(interval);
  }, [symbol, refreshInterval, selectedExpiry]);

  // Filter options for selected expiry if we have expiryDates,
  // otherwise show all options (which may already be filtered by backend)
  const filteredOptions = selectedExpiry && optionChain && optionChain.length > 0
    ? optionChain.filter(opt => 
        (opt.call?.expiryDate === selectedExpiry || opt.put?.expiryDate === selectedExpiry) ||
        // If no explicit expiry date on options, show all (likely first/only expiry)
        (!opt.call?.expiryDate && !opt.put?.expiryDate)
      )
    : optionChain || [];
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  
  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  const formatOI = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-IN', { 
      maximumFractionDigits: 2,
      notation: 'compact',
      compactDisplay: 'short' 
    }).format(value);
  };

  return (
    <Card className="shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          {symbol ? symbol.toUpperCase() : 'NIFTY'} Option Chain
          {!isLive && <Badge bg="warning" className="ms-2">Simulated Data</Badge>}
        </h5>
        
        <div className="d-flex align-items-center">
          <span className="me-3">
            <strong>Spot: </strong>
            <span className="fw-bold">₹{spotPrice.toLocaleString('en-IN')}</span>
          </span>
          
          {lastUpdated && (
            <span className="text-muted small">
              Last updated: {formatTime(lastUpdated)}
            </span>
          )}
        </div>
      </Card.Header>
      
      <Card.Body className="pt-2 pb-0">
        <Row className="mb-3 align-items-center">
          <Col>
            {expiryDates.length > 0 && (
              <Form.Select 
                value={selectedExpiry} 
                onChange={e => setSelectedExpiry(e.target.value)}
                size="sm"
                className="d-inline-block w-auto"
              >
                {expiryDates.map(date => (
                  <option key={date} value={date}>
                    {formatDate(date)}
                  </option>
                ))}
              </Form.Select>
            )}
          </Col>
          
          <Col xs="auto">
            <Form.Select
              value={refreshInterval}
              onChange={e => setRefreshInterval(Number(e.target.value))}
              size="sm"
              className="d-inline-block"
            >
              <option value={5000}>Refresh: 5s</option>
              <option value={10000}>Refresh: 10s</option>
              <option value={30000}>Refresh: 30s</option>
              <option value={60000}>Refresh: 1m</option>
            </Form.Select>
          </Col>
        </Row>
      </Card.Body>
      
      {loading && optionChain.length === 0 ? (
        <div className="text-center p-4">
          <Spinner animation="border" size="sm" className="me-2" />
          <span>Loading option chain data...</span>
        </div>
      ) : error ? (
        <Alert variant="danger" className="m-3">{error}</Alert>
      ) : (
        <div className="table-responsive">
          <Table size="sm" bordered hover className="mb-0">
            <thead className="bg-light sticky-top">
              <tr>
                <th colSpan="5" className="text-center bg-light-success">CALLS</th>
                <th className="text-center">Strike</th>
                <th colSpan="5" className="text-center bg-light-danger">PUTS</th>
              </tr>
              <tr>
                <th className="text-center">OI</th>
                <th>Vol</th>
                <th>Chg%</th>
                <th>Bid</th>
                <th>LTP</th>
                <th className="text-center">Strike</th>
                <th>LTP</th>
                <th>Bid</th>
                <th>Chg%</th>
                <th>Vol</th>
                <th className="text-center">OI</th>
              </tr>
            </thead>
            <tbody>
              {filteredOptions.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-3">
                    No options data available
                  </td>
                </tr>
              ) : (
                filteredOptions.map(option => {
                  const { strikePrice, isATM, call, put } = option;
                  
                  return (
                    <tr key={strikePrice} className={isATM ? 'table-primary' : ''}>
                      {/* CALL data */}
                      <td className="text-end small font-monospace">
                        {call ? formatOI(call.openInterest) : '-'}
                      </td>
                      <td className="text-end small">
                        {call && call.volume ? formatOI(call.volume) : '-'}
                      </td>
                      <td 
                        className={`text-end small ${call && call.change >= 0 ? 'text-success' : 'text-danger'}`}
                      >
                        {call ? (call.change >= 0 ? '+' : '') + Number(call.change).toFixed(2) + '%' : '-'}
                      </td>
                      <td 
                        className="text-end cursor-pointer fw-semibold" 
                        onClick={() => call && onSelect && onSelect(call.symbol, 'CALL', call.lastPrice)}
                      >
                        {call && call.bidPrice ? call.bidPrice.toFixed(2) : '-'}
                      </td>
                      <td 
                        className="text-end cursor-pointer fw-bold" 
                        onClick={() => call && onSelect && onSelect(call.symbol, 'CALL', call.lastPrice)}
                      >
                        {call && call.lastPrice ? call.lastPrice.toFixed(2) : '-'}
                      </td>
                      
                      {/* Strike price */}
                      <td className="text-center fw-bold">
                        {isATM && <Badge bg="info" className="me-1">ATM</Badge>}
                        {strikePrice.toFixed(2)}
                      </td>
                      
                      {/* PUT data */}
                      <td 
                        className="text-end cursor-pointer fw-bold" 
                        onClick={() => put && onSelect && onSelect(put.symbol, 'PUT', put.lastPrice)}
                      >
                        {put && put.lastPrice ? put.lastPrice.toFixed(2) : '-'}
                      </td>
                      <td 
                        className="text-end cursor-pointer fw-semibold" 
                        onClick={() => put && onSelect && onSelect(put.symbol, 'PUT', put.lastPrice)}
                      >
                        {put && put.bidPrice ? put.bidPrice.toFixed(2) : '-'}
                      </td>
                      <td 
                        className={`text-end small ${put && put.change >= 0 ? 'text-success' : 'text-danger'}`}
                      >
                        {put ? (put.change >= 0 ? '+' : '') + Number(put.change).toFixed(2) + '%' : '-'}
                      </td>
                      <td className="text-end small">
                        {put && put.volume ? formatOI(put.volume) : '-'}
                      </td>
                      <td className="text-end small font-monospace">
                        {put ? formatOI(put.openInterest) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      )}
      
      <div className="p-2 text-muted small">
        Click on any price to select for trading
      </div>
    </Card>
  );
};

export default OptionChain;