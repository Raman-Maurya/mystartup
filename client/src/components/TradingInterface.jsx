import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { fetchContestDetails } from '../redux/actions/contestActions';
import { placeTrade, closeTrade, fetchUserTrades } from '../redux/actions/tradeActions';
import { Card, Form, Button, Table, Alert, Row, Col, Badge, Toast, ToastContainer, ProgressBar, Spinner, Tabs, Tab } from 'react-bootstrap';
import OptionChain from './OptionChain';
import VirtualWallet from './VirtualWallet';
import StockChart from './StockChart';

const TradingInterface = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentContest, loading: contestLoading } = useSelector(state => state.contests);
  const { trades, loading: tradesLoading } = useSelector(state => state.trades);
  const { user, isAuthenticated } = useSelector(state => state.auth);
  
  // Updated trading states
  const [optionType, setOptionType] = useState('CE'); // CE or PE (Call or Put)
  const [symbol, setSymbol] = useState('NIFTY');
  const [strikePrice, setStrikePrice] = useState(0);
  const [lots, setLots] = useState(1);
  const [lotSize, setLotSize] = useState(50); // Default lot size for NIFTY
  const [virtualBalance, setVirtualBalance] = useState(0);
  const [availableCash, setAvailableCash] = useState(0); // New state for tracking actual available cash
  const [currentPnL, setCurrentPnL] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');
  const [stockOptions, setStockOptions] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [contestCategory, setContestCategory] = useState('stocks');
  const [selectedOptionPrice, setSelectedOptionPrice] = useState(0);
  const [remainingTrades, setRemainingTrades] = useState(5); // Default limit
  const [timeRemaining, setTimeRemaining] = useState('');
  const [marketOpen, setMarketOpen] = useState(true);
  const [optionSelected, setOptionSelected] = useState(false);
  const [optionSelectionError, setOptionSelectionError] = useState('');
  const timerRef = useRef(null);
  
  // TradingView chart URLs
  const tradingViewUrls = {
    nifty50: 'https://www.tradingview.com/chart/?symbol=NSE%3ANIFTY',
    banknifty: 'https://www.tradingview.com/chart/?symbol=NSE%3ABANKNIFTY'
  };
  
  // Market timer function
  const startMarketTimer = () => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      // Get current time
      const now = new Date();
      const marketCloseToday = new Date();
      
      // Set market close time to 3:30 PM (15:30)
      marketCloseToday.setHours(15, 30, 0, 0);
      
      // Calculate time remaining
      const timeRemainingMs = marketCloseToday - now;
      
      // If market is closed (past 3:30 PM)
      if (timeRemainingMs <= 0) {
        setMarketOpen(false);
        setTimeRemaining('Market Closed');
        
        // Close all open trades
        if (trades && trades.length > 0) {
          closeAllTrades();
        }
        
        clearInterval(timerRef.current);
      } else {
        // Format time remaining
        const hours = Math.floor(timeRemainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemainingMs % (1000 * 60)) / 1000);
        
        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        setMarketOpen(true);
      }
    }, 1000);
  };
  
  // Update current PnL and available cash from all trades (both open and closed)
  useEffect(() => {
    if (!trades || trades.length === 0) {
      setCurrentPnL(0);
      setAvailableCash(virtualBalance);
      return;
    }
    
    // Calculate PnL from both open and closed trades
    let totalPnL = 0;
    
    // For open trades, use the current pnl
    const openTrades = trades.filter(trade => trade.status === 'OPEN');
    const openTradesPnL = openTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    
    // For closed trades, use the finalPnl
    const closedTrades = trades.filter(trade => trade.status === 'CLOSED');
    const closedTradesPnL = closedTrades.reduce((sum, trade) => sum + (trade.finalPnl || 0), 0);
    
    // Combine both for total PnL
    totalPnL = openTradesPnL + closedTradesPnL;
    
    setCurrentPnL(totalPnL);
    
    // Update available cash based on virtual balance and current PnL from open trades only
    // We only consider open trades for available cash because closed trades' PnL is already in virtualBalance
    setAvailableCash(virtualBalance + openTradesPnL);
  }, [trades, virtualBalance]);

  // Close all trades at market close
  const closeAllTrades = async () => {
    try {
      if (trades.length === 0) return;
      
      // Calculate total PnL before closing
      const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      
      // Store the number of trades being closed
      const tradeCount = trades.length;
      
      // Close each trade sequentially
      const tradeIds = trades.map(trade => trade._id);
      for (const tradeId of tradeIds) {
        await dispatch(closeTrade(tradeId));
      }
      
      // Update the virtual balance with the total PnL
      setVirtualBalance(prev => prev + totalPnL);
      
      // Reset remaining trades count based on contest settings
      if (currentContest && currentContest.tradingSettings) {
        setRemainingTrades(currentContest.tradingSettings.maxTradesPerUser || 5);
      } else {
        setRemainingTrades(5); // Default
      }
      
      // Force refresh trades list to ensure UI is updated
      dispatch(fetchUserTrades(contestId));
      
      setToastVariant('info');
      setToastMessage(`All ${tradeCount} trades closed automatically at market close. ${totalPnL >= 0 ? '+' : ''}₹${totalPnL.toFixed(2)} added to balance.`);
      setShowToast(true);
    } catch (error) {
      console.error('Error closing all trades:', error);
      setToastVariant('danger');
      setToastMessage('Failed to close all trades');
      setShowToast(true);
    }
  };
  
  // Function to open TradingView chart
  const openTradingViewChart = (market) => {
    window.open(tradingViewUrls[market], '_blank');
  };

  // Check authentication state and start market timer
  useEffect(() => {
    // Check authentication
    if (!isAuthenticated && !localStorage.getItem('token')) {
      navigate('/login', { state: { from: `/trade/${contestId}` } });
    } else if (contestId) {
      // If authenticated, fetch contest details and user trades
      dispatch(fetchContestDetails(contestId));
      dispatch(fetchUserTrades(contestId));
      
      // Generate stock options
      setStockOptions(generateStockOptions());
      
      // Set initial selected stock
      setSelectedStock(mockStocks[0]);
      
      // Start market timer
      startMarketTimer();
    }
    
    // Clean up timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [dispatch, contestId, isAuthenticated, navigate]);

  // Mock stock data for Indian markets
  const mockStocks = [
    { id: 1, symbol: 'RELIANCE', name: 'Reliance Industries', price: 2450.75, change: 1.2 },
    { id: 2, symbol: 'TCS', name: 'Tata Consultancy Services', price: 3540.30, change: -0.5 },
    { id: 3, symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1678.90, change: 0.8 },
    { id: 4, symbol: 'INFY', name: 'Infosys', price: 1450.60, change: -1.1 },
    { id: 5, symbol: 'ICICIBANK', name: 'ICICI Bank', price: 945.25, change: 0.3 },
    { id: 6, symbol: 'HINDUNILVR', name: 'Hindustan Unilever', price: 2560.15, change: -0.2 },
    { id: 7, symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', price: 1780.35, change: 0.5 },
    { id: 8, symbol: 'WIPRO', name: 'Wipro', price: 425.80, change: -0.7 },
    { id: 9, symbol: 'AXISBANK', name: 'Axis Bank', price: 850.45, change: 1.5 },
    { id: 10, symbol: 'BAJFINANCE', name: 'Bajaj Finance', price: 7120.60, change: 2.1 },
  ];

  // Generate option chain entries with strike prices based on underlying assets
  const generateStockOptions = () => {
    return mockStocks.map(stock => {
      // Generate realistic strike prices around current price
      const basePrice = Math.round(stock.price / 10) * 10; // Round to nearest 10
      const strikePrices = [];
      
      for (let i = -5; i <= 5; i++) {
        strikePrices.push({
          strike: basePrice + (i * 20), // 20 point intervals
          callPrice: Math.round((basePrice / 20) * (1 + Math.random() * 0.5 - 0.2)), // Call option price
          putPrice: Math.round((basePrice / 20) * (1 + Math.random() * 0.5 - 0.3)), // Put option price
          oi: Math.floor(Math.random() * 5000) // Open interest
        });
      }
      
      return {
        id: `${stock.symbol}-OPT`,
        symbol: stock.symbol,
        name: `${stock.name}`,
        currentPrice: stock.price,
        strikePrices: strikePrices,
        expiryDate: new Date(Date.now() + (7 + Math.floor(Math.random() * 21)) * 86400000)
      };
    });
  };

  useEffect(() => {
    // Set contest category and initialize appropriate data based on contest type
    if (currentContest) {
      const contestType = currentContest.maxParticipants > 500 ? 'mega' : 'small';
      const initialBalance = contestType === 'mega' ? 79999 : 50000;
      setVirtualBalance(initialBalance);
      
      // Set trade limits based on contest settings and count only open trades
      if (currentContest.tradingSettings && currentContest.tradingSettings.maxTradesPerUser) {
        const openTradesCount = trades ? trades.filter(trade => trade.status === 'OPEN').length : 0;
        setRemainingTrades(currentContest.tradingSettings.maxTradesPerUser - openTradesCount);
      } else {
        const openTradesCount = trades ? trades.filter(trade => trade.status === 'OPEN').length : 0;
        setRemainingTrades(5 - openTradesCount); // Default to 5 if not specified
      }
      
      // Set contest category and lot size
      if (currentContest.category) {
        setContestCategory(currentContest.category);
        
        // Set default instrument and lot size based on contest category
        if (currentContest.category === 'nifty50') {
          setSymbol('NIFTY');
          setLotSize(50); // NIFTY lot size
          setSelectedStock({ 
            id: 'NIFTY50', 
            symbol: 'NIFTY50', 
            name: 'Nifty 50 Index', 
            price: 22450.30, 
            change: 0.75 
          });
        } else if (currentContest.category === 'banknifty') {
          setSymbol('BANKNIFTY');
          setLotSize(25); // BANKNIFTY lot size
          setSelectedStock({ 
            id: 'BANKNIFTY', 
            symbol: 'BANKNIFTY', 
            name: 'Bank Nifty Index', 
            price: 48320.15, 
            change: 1.2 
          });
        }
        
        // If there's a stock subcategory, filter stocks
        if (currentContest.stockCategory && currentContest.category === 'stocks') {
          const filteredStocks = mockStocks.filter(stock => {
            switch(currentContest.stockCategory) {
              case 'pharma':
                return ['SUNPHARMA', 'CIPLA', 'DRREDDY'].includes(stock.symbol);
              case 'it':
                return ['TCS', 'INFY', 'WIPRO'].includes(stock.symbol);
              case 'banking':
                return ['HDFCBANK', 'ICICIBANK', 'AXISBANK', 'KOTAKBANK'].includes(stock.symbol);
              default:
                return true;
            }
          });
          
          if (filteredStocks.length > 0) {
            setSelectedStock(filteredStocks[0]);
            setLotSize(100); // Default stock lot size
          }
        }
      }
    }
  }, [currentContest, trades]);

  // Calculate total PnL from trades
  useEffect(() => {
    if (trades.length > 0) {
      const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      setCurrentPnL(totalPnL);
      
      // Update remaining trade count
      if (currentContest && currentContest.tradingSettings) {
        setRemainingTrades(currentContest.tradingSettings.maxTradesPerUser - trades.length);
      } else {
        setRemainingTrades(5 - trades.length); // Default
      }
    }
  }, [trades, currentContest]);

  // Reset option selection when the underlying symbol changes
  useEffect(() => {
    setOptionSelected(false);
    setOptionSelectionError('');
    setStrikePrice(0);
    setSelectedOptionPrice(0);
  }, [symbol]);

  // Updated place trade function to work with options terminology
  const handlePlaceTrade = () => {
    if (!optionSelected) {
      setOptionSelectionError('Please select an option from the option chain first');
      return;
    }
    
    if (remainingTrades <= 0) {
      setToastVariant('danger');
      setToastMessage(`You've reached the maximum number of trades allowed for this contest!`);
      setShowToast(true);
      return;
    }
    
    if (!marketOpen) {
      setToastVariant('warning');
      setToastMessage('Market is closed. Trading is not available.');
      setShowToast(true);
      return;
    }
    
    // Calculate total trade cost based on premium, lots and lot size
    const premium = selectedOptionPrice;
    const tradeCost = premium * lots * lotSize;
    
    // Check against available cash (virtual balance + current PnL) instead of just virtual balance
    if (tradeCost > availableCash) {
      setToastVariant('danger');
      setToastMessage(`Insufficient funds! Trade cost: ₹${tradeCost.toFixed(2)}, Available: ₹${availableCash.toFixed(2)}`);
      setShowToast(true);
      return;
    }
    
    // Format the symbol name properly for options
    const optionSymbol = `${symbol} ${strikePrice} ${optionType}`;
    
    // Immediately deduct the trade cost from the balance to prevent over-trading
    setVirtualBalance(prev => prev - tradeCost);
    
    // Immediately decrease remaining trades count
    setRemainingTrades(prev => prev - 1);
    
    const tradeData = {
      contestId,
      symbol: optionSymbol,
      tradeType: 'BUY', // Always buying options
      quantity: lots * lotSize,
      price: premium
    };
    
    dispatch(placeTrade(tradeData))
      .then(newTrade => {
        // Show success toast
        setToastVariant('success');
        setToastMessage(`Trade placed successfully: ${lots} lot(s) of ${optionSymbol} @ ₹${premium} (Cost: ₹${tradeCost.toFixed(2)})`);
        setShowToast(true);
        
        // Reset selection
        setOptionSelected(false);
        setOptionSelectionError('');
      })
      .catch(error => {
        console.error('Error placing trade:', error);
        
        // Restore the balance if trade fails
        setVirtualBalance(prev => prev + tradeCost);
        
        // Restore remaining trades count if trade fails
        setRemainingTrades(prev => prev + 1);
        
        setToastVariant('danger');
        setToastMessage('Failed to place trade. Please try again.');
        setShowToast(true);
      });
  };

  const handleCloseTrade = (tradeId) => {
    if (!marketOpen) {
      setToastVariant('warning');
      setToastMessage('Market is closed. Cannot close positions manually.');
      setShowToast(true);
      return;
    }
    
    // Find the trade first to get its current PnL
    const tradeToClose = trades.find(t => t._id === tradeId);
    if (!tradeToClose) {
      setToastVariant('danger');
      setToastMessage('Trade not found!');
      setShowToast(true);
      return;
    }

    dispatch(closeTrade(tradeId))
      .then((closedTrade) => {
        // Add the PnL to the virtual balance
        const pnlToAdd = tradeToClose.pnl || 0;
        setVirtualBalance(prev => prev + pnlToAdd);
        
        // Update current PnL to reflect the closed trade
        setCurrentPnL(prev => prev - pnlToAdd);
        
        // Do NOT increment the remaining trades count because closing doesn't give back a trade
        
        setToastVariant('success');
        setToastMessage(`Trade closed successfully! ${pnlToAdd >= 0 ? '+' : ''}₹${pnlToAdd.toFixed(2)} added to balance.`);
        setShowToast(true);
        
        // Force refresh trades list but without resetting the state
        dispatch(fetchUserTrades(contestId));
      })
      .catch(error => {
        console.error('Error closing trade:', error);
        setToastVariant('danger');
        setToastMessage('Failed to close trade. Please try again.');
        setShowToast(true);
      });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Enhanced option selection from option chain
  const handleOptionSelect = (optionSymbol, optionType, price, strike) => {
    const parsedOptionType = optionType === 'call' ? 'CE' : 'PE';
    
    setSymbol(optionSymbol);
    setOptionType(parsedOptionType);
    setStrikePrice(strike);
    setSelectedOptionPrice(price);
    setOptionSelected(true);
    setOptionSelectionError('');
    
    // Notify the user about selection
    setToastVariant('info');
    setToastMessage(`Selected ${optionSymbol} ${strike} ${parsedOptionType} @ ₹${price}`);
    setShowToast(true);
  };

  // Button text formatter to prevent "undefined" from appearing
  const getButtonText = () => {
    if (!optionSelected) return 'Select an option first';
    
    // Make sure all values are defined before creating the button text
    const displaySymbol = symbol || '';
    const displayStrikePrice = strikePrice || '';
    const displayOptionType = optionType || '';
    
    return `Buy ${lots} Lot${lots > 1 ? 's' : ''} of ${displaySymbol} ${displayStrikePrice} ${displayOptionType}`;
  };

  if (contestLoading || tradesLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading trading interface...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Virtual Wallet Display */}
      <VirtualWallet 
        contestId={contestId}
        virtualBalance={virtualBalance}
        availableCash={availableCash}
        currentPnL={currentPnL}
        trades={trades}
      />

      {/* Market Timer and Trade Limit Indicator */}
      <Card className="shadow-sm mb-3">
        <Card.Body className="p-2">
          <Row className="align-items-center">
            <Col md={4}>
              <div className="d-flex align-items-center">
                <div className={`status-indicator ${marketOpen ? 'bg-success' : 'bg-danger'} me-2`} style={{ width: '10px', height: '10px', borderRadius: '50%' }}></div>
                <span className="fw-bold">Market Status: {marketOpen ? 'Open' : 'Closed'}</span>
              </div>
            </Col>
            <Col md={4} className="text-center">
              <div className="d-flex justify-content-center align-items-center">
                <i className="bi bi-clock me-2"></i>
                <span className="fw-bold">Market Closes In: </span>
                <span className={`ms-2 fw-bold ${timeRemaining === 'Market Closed' ? 'text-danger' : 'text-success'}`}>{timeRemaining}</span>
              </div>
            </Col>
            <Col md={4} className="text-end">
              <div>
                <span>Remaining Trades: </span>
                <Badge bg={remainingTrades > 0 ? 'primary' : 'danger'}>
                  {remainingTrades > 0 ? remainingTrades : 'No trades left'}
                </Badge>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Stock Chart */}
      <StockChart symbol={symbol} initialTimeframe="1d" />
      <Card className="shadow-sm mb-4">
        <Card.Header>
          <Tabs
            defaultActiveKey="nifty"
            className="mb-3"
            fill
          >
            <Tab eventKey="nifty" title="Nifty 50">
              <div className="text-center p-4">
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={() => openTradingViewChart('nifty50')}
                >
                  <i className="bi bi-graph-up me-1"></i> Open Nifty 50 Chart in TradingView
                </Button>
              </div>
            </Tab>
            <Tab eventKey="banknifty" title="Bank Nifty">
              <div className="text-center p-4">
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={() => openTradingViewChart('banknifty')}
                >
                  <i className="bi bi-graph-up me-1"></i> Open Bank Nifty Chart in TradingView
                </Button>
              </div>
            </Tab>
            {selectedStock && selectedStock.symbol !== 'NIFTY50' && selectedStock.symbol !== 'BANKNIFTY' && (
              <Tab eventKey="selectedStock" title={selectedStock.symbol}>
                <div className="text-center p-4">
                  <Button 
                    variant="primary" 
                    size="lg"
                    onClick={() => window.open(`https://www.tradingview.com/chart/?symbol=NSE%3A${selectedStock.symbol}`, '_blank')}
                  >
                    <i className="bi bi-graph-up me-1"></i> Open {selectedStock.name} Chart in TradingView
                  </Button>
                </div>
              </Tab>
            )}
          </Tabs>
        </Card.Header>
      </Card>

      <Card className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            {currentContest && (
              <>
                <span className="text-primary">{currentContest.name}</span>
                <Badge bg={currentContest.contestType === 'free' ? 'success' : 'primary'} className="ms-2">
                  {currentContest.contestType === 'free' ? 'Free Entry' : `₹${currentContest.entryFee} Entry`}
                </Badge>
                {currentContest.category && (
                  <Badge bg="info" className="ms-2">
                    {currentContest.category === 'nifty50' ? 'Nifty 50 Options' : 
                     currentContest.category === 'banknifty' ? 'Bank Nifty Options' : 'Stock Options'}
                  </Badge>
                )}
              </>
            )}
          </h5>
          <div>
            <span className={`fw-bold ${currentPnL >= 0 ? 'text-success' : 'text-danger'}`}>
              P&L: {currentPnL >= 0 ? '+' : ''}₹{currentPnL.toFixed(2)}
            </span>
            <span className="ms-3 fw-bold">
              Base Balance: ₹{virtualBalance.toFixed(2)}
            </span>
            <span className="ms-3 fw-bold border-start ps-3" style={{borderColor: '#ddd'}}>
              <span className="text-primary">Available Cash: </span>
              <span className={availableCash < virtualBalance ? 'text-danger' : 'text-success'}>
                ₹{availableCash.toFixed(2)}
              </span>
            </span>
          </div>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={8}>
              {/* Quick Stock Selection - Only for stock contests */}
              {contestCategory === 'stocks' && (
                <Card className="mb-3">
                  <Card.Header>
                    <h6 className="mb-0">Quick Stock Selection</h6>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {mockStocks.slice(0, 6).map(stock => (
                        <Button 
                          key={`quick-${stock.id}`}
                          variant={selectedStock?.id === stock.id ? "primary" : "outline-primary"}
                          size="sm"
                          onClick={() => setSelectedStock(stock)}
                        >
                          {stock.symbol}
                          <span className={`ms-1 ${stock.change >= 0 ? 'text-success' : 'text-danger'}`}>
                            {stock.change >= 0 ? '+' : ''}{stock.change}%
                          </span>
                        </Button>
                      ))}
                    </div>
                    
                    <div className="table-responsive">
                      <Table hover size="sm">
                        <thead>
                          <tr>
                            <th>Symbol</th>
                            <th>Name</th>
                            <th className="text-end">Price</th>
                            <th className="text-end">Change</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockStocks.map(stock => (
                            <tr 
                              key={`stock-${stock.id}`}
                              className={`${selectedStock?.id === stock.id ? 'table-primary' : ''}`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => setSelectedStock(stock)}
                            >
                              <td><strong>{stock.symbol}</strong></td>
                              <td>{stock.name}</td>
                              <td className="text-end">₹{stock.price.toFixed(2)}</td>
                              <td className={`text-end ${stock.change >= 0 ? 'text-success' : 'text-danger'}`}>
                                {stock.change >= 0 ? '+' : ''}{stock.change}%
                              </td>
                              <td>
                                <Button 
                                  variant="outline-primary" 
                                  size="sm"
                                  className="py-0 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStock(stock);
                                  }}
                                >
                                  Trade
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Card.Body>
                </Card>
              )}
              
              {/* Option Chain */}
              <Tabs defaultActiveKey="optionchain" id="trading-tabs" className="mb-3">
                <Tab eventKey="optionchain" title="Option Chain">
                  <Card className="shadow-sm mb-4">
                    <Card.Header className="bg-light">
                      <h6 className="mb-0 text-center">Select an Option from the Chain Below</h6>
                    </Card.Header>
                    <Card.Body className="p-0">
                      <OptionChain 
                        symbol={contestCategory === 'nifty50' ? 'NIFTY' : 
                                contestCategory === 'banknifty' ? 'BANKNIFTY' : 
                                selectedStock?.symbol} 
                        onSelect={handleOptionSelect}
                      />
                    </Card.Body>
                  </Card>
                </Tab>
                <Tab eventKey="positions" title="Positions">
                  <Card className="shadow-sm mb-4">
                    <Card.Body>
                      <h6 className="mb-3">Current Positions</h6>
                      {trades.length === 0 ? (
                        <Alert variant="info">You don't have any open positions</Alert>
                      ) : (
                        <Table striped bordered responsive size="sm">
                          <thead>
                            <tr>
                              <th>Symbol</th>
                              <th>Type</th>
                              <th>Quantity</th>
                              <th>Entry Price</th>
                              <th>Current Price</th>
                              <th>P&L</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trades.map(trade => (
                              <tr key={trade._id} className={trade.status === 'CLOSED' ? 'bg-light' : ''}>
                                <td>{trade.symbol}</td>
                                <td>{trade.symbol.includes('CE') ? 'Call' : (trade.symbol.includes('PE') ? 'Put' : 'Stock')}</td>
                                <td>{trade.quantity}</td>
                                <td>₹{trade.price}</td>
                                <td>₹{(trade.currentPrice || trade.price).toFixed(2)}</td>
                                <td className={
                                  trade.status === 'CLOSED' 
                                    ? (trade.finalPnl >= 0 ? 'text-success' : 'text-danger')
                                    : (trade.pnl >= 0 ? 'text-success' : 'text-danger')
                                }>
                                  {trade.status === 'CLOSED'
                                    ? (trade.finalPnl >= 0 ? '+' : '') + '₹' + (trade.finalPnl?.toFixed(2) || '0.00') 
                                    : (trade.pnl >= 0 ? '+' : '') + '₹' + (trade.pnl?.toFixed(2) || '0.00')
                                  }
                                </td>
                                <td>
                                  {trade.status === 'OPEN' ? (
                                    <Button 
                                      variant="danger" 
                                      size="sm"
                                      disabled={!marketOpen}
                                      onClick={() => handleCloseTrade(trade._id)}
                                    >
                                      Exit
                                    </Button>
                                  ) : (
                                    <Badge bg="secondary">Closed</Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </Card.Body>
                  </Card>
                </Tab>
              </Tabs>
            </Col>
            
            <Col md={4}>
              <Card className="mb-4">
                <Card.Header>
                  <h6 className="mb-0">Place Order</h6>
                </Card.Header>
                <Card.Body>
                  {optionSelectionError && (
                    <Alert variant="warning" className="mb-3">
                      {optionSelectionError}
                    </Alert>
                  )}
                  
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Selected Instrument</Form.Label>
                      {contestCategory === 'stocks' ? (
                        <Form.Select 
                          value={selectedStock?.symbol || ''}
                          onChange={(e) => {
                            const stock = mockStocks.find(s => s.symbol === e.target.value);
                            setSelectedStock(stock);
                            setSymbol(stock.symbol);
                          }}
                        >
                          {mockStocks.map((stock) => (
                            <option key={`select-${stock.id}`} value={stock.symbol}>
                              {stock.name} (₹{stock.price})
                            </option>
                          ))}
                        </Form.Select>
                      ) : (
                        <Form.Control 
                          plaintext 
                          readOnly 
                          value={contestCategory === 'nifty50' ? 'NIFTY 50 Index' : 'Bank NIFTY Index'} 
                        />
                      )}
                    </Form.Group>
                    
                    <div className="selected-option-details p-3 mb-3 bg-light rounded">
                      <h6 className="border-bottom pb-2 mb-3">Selected Option</h6>
                      {optionSelected ? (
                        <>
                          <div className="d-flex justify-content-between mb-2">
                            <span>Symbol:</span>
                            <strong>{symbol}</strong>
                          </div>
                          <div className="d-flex justify-content-between mb-2">
                            <span>Strike Price:</span>
                            <strong>₹{strikePrice}</strong>
                          </div>
                          <div className="d-flex justify-content-between mb-2">
                            <span>Option Type:</span>
                            <strong>{optionType === 'CE' ? 'Call (CE)' : 'Put (PE)'}</strong>
                          </div>
                          <div className="d-flex justify-content-between mb-2">
                            <span>LTP (Premium):</span>
                            <strong className="text-primary">₹{selectedOptionPrice}</strong>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-muted">
                          <i className="bi bi-arrow-down-circle mb-2" style={{ fontSize: '1.5rem' }}></i>
                          <p>Please select an option from the Option Chain tab</p>
                        </div>
                      )}
                    </div>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Lots</Form.Label>
                          <Form.Control 
                            type="number" 
                            min="1"
                            value={lots} 
                            onChange={(e) => setLots(parseInt(e.target.value))}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Lot Size</Form.Label>
                          <Form.Control 
                            plaintext
                            readOnly
                            value={lotSize}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <div className="p-3 mb-3 bg-light rounded">
                      <h6 className="border-bottom pb-2 mb-3">Order Summary</h6>
                      <div className="d-flex justify-content-between">
                        <span>Total Quantity:</span>
                        <span><strong>{lots * lotSize} shares</strong></span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Total Cost:</span>
                        <span><strong>₹{(selectedOptionPrice * lots * lotSize).toFixed(2)}</strong></span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="primary" 
                      className="w-100"
                      disabled={!marketOpen || !optionSelected || remainingTrades <= 0}
                      onClick={handlePlaceTrade}
                    >
                      {getButtonText()}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
              
              <Card>
                <Card.Header>
                  <h6 className="mb-0">Portfolio Summary</h6>
                </Card.Header>
                <Card.Body className="p-0">
                  {trades.length === 0 ? (
                    <Alert variant="info" className="m-3">
                      No open positions. Place your first trade!
                    </Alert>
                  ) : (
                    <Table striped hover size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>Instrument</th>
                          <th>Qty</th>
                          <th>P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((trade) => (
                          <tr key={trade._id || `trade-${trade.symbol}-${trade.price}-${Math.random()}`}>
                            <td>
                              {trade.symbol}
                              <div className="small text-muted">
                                Bought @ ₹{trade.price}
                                {trade.status === 'CLOSED' && ' (Closed)'}
                              </div>
                            </td>
                            <td>{trade.quantity}</td>
                            <td className={
                              trade.status === 'CLOSED'
                                ? (trade.finalPnl >= 0 ? 'text-success' : 'text-danger')
                                : (trade.pnl >= 0 ? 'text-success' : 'text-danger')
                            }>
                              {trade.status === 'CLOSED'
                                ? (trade.finalPnl >= 0 ? '+' : '') + '₹' + (trade.finalPnl || 0).toFixed(2)
                                : (trade.pnl >= 0 ? '+' : '') + '₹' + (trade.pnl || 0).toFixed(2)
                              }
                            </td>
                          </tr>
                        ))}
                        <tr className="table-secondary">
                          <td colSpan="2"><strong>Total P&L</strong></td>
                          <td className={currentPnL >= 0 ? 'text-success' : 'text-danger'}>
                            <strong>{currentPnL >= 0 ? '+' : ''}₹{currentPnL.toFixed(2)}</strong>
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
        
        <ToastContainer position="top-end" className="p-3">
          <Toast 
            show={showToast} 
            onClose={() => setShowToast(false)} 
            delay={3000} 
            autohide
            bg={toastVariant}
          >
            <Toast.Header>
              <strong className="me-auto">Trade Alert</strong>
            </Toast.Header>
            <Toast.Body className={toastVariant === 'success' ? 'text-white' : ''}>
              {toastMessage}
            </Toast.Body>
          </Toast>
        </ToastContainer>
      </Card>
    </>
  );
};

export default TradingInterface;