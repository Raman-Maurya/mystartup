const axios = require('axios');
const MarketDataService = require('../services/marketDataService');
const marketDataService = new MarketDataService(process.env.MARKET_API_KEY);

/**
 * Fetch option chain data for index symbols (NIFTY, BANKNIFTY)
 */
exports.getOptionChain = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Format symbol for NSE API
    const formattedSymbol = symbol.toUpperCase();
    
    if (!['NIFTY', 'BANKNIFTY', 'FINNIFTY'].includes(formattedSymbol)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid symbol. Supported indices: NIFTY, BANKNIFTY, FINNIFTY' 
      });
    }
    
    // Get current timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    // NSE option chain API URL
    const nseUrl = `https://www.nseindia.com/api/option-chain-indices?symbol=${formattedSymbol}`;
    
    // Headers to simulate a browser request (NSE blocks API requests without proper headers)
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.nseindia.com/get-quotes/derivatives?symbol=' + formattedSymbol
    };
    
    // Make the request to NSE
    const response = await axios.get(nseUrl, { headers });
    
    // If response is successful
    if (response.data && response.data.records && response.data.filtered) {
      // Get the current underlying price
      const spotPrice = response.data.records.underlyingValue;
      
      // Process the data to extract essential option chain info
      const expiryDates = response.data.records.expiryDates;
      
      // Get the nearest expiry date by default
      const currentExpiry = expiryDates[0];
      
      // Filter options for the current expiry
      const optionsData = response.data.filtered.data.filter(item => 
        item.expiryDate === currentExpiry
      );
      
      // Transform the data into a more usable format
      const formattedOptions = optionsData.map(option => {
        const strikePrice = option.strikePrice;
        const isATM = Math.abs(strikePrice - spotPrice) < 0.3 * spotPrice * 0.01; // Within 0.3% of spot
        
        // Format call and put data
        const callOption = option.CE ? {
          symbol: `${formattedSymbol} ${strikePrice} CE`,
          type: 'CE',
          expiryDate: option.expiryDate,
          strikePrice: strikePrice,
          bidPrice: option.CE.bidprice || 0,
          askPrice: option.CE.askPrice || 0,
          lastPrice: option.CE.lastPrice || 0,
          change: option.CE.pChange || 0,
          openInterest: option.CE.openInterest || 0,
          volume: option.CE.totalTradedVolume || 0
        } : null;
        
        const putOption = option.PE ? {
          symbol: `${formattedSymbol} ${strikePrice} PE`,
          type: 'PE',
          expiryDate: option.expiryDate,
          strikePrice: strikePrice,
          bidPrice: option.PE.bidprice || 0,
          askPrice: option.PE.askPrice || 0,
          lastPrice: option.PE.lastPrice || 0,
          change: option.PE.pChange || 0,
          openInterest: option.PE.openInterest || 0,
          volume: option.PE.totalTradedVolume || 0
        } : null;
        
        return {
          strikePrice,
          isATM,
          call: callOption,
          put: putOption
        };
      });
      
      return res.json({
        success: true,
        data: {
          symbol: formattedSymbol,
          spotPrice,
          expiryDates,
          timestamp,
          options: formattedOptions
        }
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to parse NSE option chain data'
      });
    }
  } catch (error) {
    console.error('NSE option chain fetch error:', error.message);
    
    // Return a fallback response with simulated data for demo/testing
    return res.json({
      success: true,
      data: {
        symbol: req.params.symbol.toUpperCase(),
        spotPrice: req.params.symbol.toUpperCase() === 'NIFTY' ? 22450 : 48320,
        expiryDates: [
          new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        ],
        timestamp: new Date().getTime(),
        options: generateMockOptionChain(req.params.symbol.toUpperCase()),
        note: "Using simulated data due to NSE API access restrictions"
      }
    });
  }
};

/**
 * Fetch option chain for stock symbols
 */
exports.getStockOptionChain = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Format symbol for NSE API
    const formattedSymbol = symbol.toUpperCase();
    
    // NSE option chain API URL for stocks
    const nseUrl = `https://www.nseindia.com/api/option-chain-equities?symbol=${formattedSymbol}`;
    
    // Headers to simulate a browser request (NSE blocks API requests without proper headers)
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.nseindia.com/get-quotes/derivatives?symbol=' + formattedSymbol
    };
    
    // Make the request to NSE
    const response = await axios.get(nseUrl, { headers });
    
    // If response is successful
    if (response.data && response.data.records && response.data.filtered) {
      // Get the current underlying price
      const spotPrice = response.data.records.underlyingValue;
      
      // Process the data to extract essential option chain info
      const expiryDates = response.data.records.expiryDates;
      
      // Get the nearest expiry date by default
      const currentExpiry = expiryDates[0];
      
      // Filter options for the current expiry
      const optionsData = response.data.filtered.data.filter(item => 
        item.expiryDate === currentExpiry
      );
      
      // Transform the data into a more usable format
      const formattedOptions = optionsData.map(option => {
        const strikePrice = option.strikePrice;
        const isATM = Math.abs(strikePrice - spotPrice) < 0.3 * spotPrice * 0.01; // Within 0.3% of spot
        
        // Format call and put data
        const callOption = option.CE ? {
          symbol: `${formattedSymbol} ${strikePrice} CE`,
          type: 'CE',
          expiryDate: option.expiryDate,
          strikePrice: strikePrice,
          bidPrice: option.CE.bidprice || 0,
          askPrice: option.CE.askPrice || 0,
          lastPrice: option.CE.lastPrice || 0,
          change: option.CE.pChange || 0,
          openInterest: option.CE.openInterest || 0,
          volume: option.CE.totalTradedVolume || 0
        } : null;
        
        const putOption = option.PE ? {
          symbol: `${formattedSymbol} ${strikePrice} PE`,
          type: 'PE',
          expiryDate: option.expiryDate,
          strikePrice: strikePrice,
          bidPrice: option.PE.bidprice || 0,
          askPrice: option.PE.askPrice || 0,
          lastPrice: option.PE.lastPrice || 0,
          change: option.PE.pChange || 0,
          openInterest: option.PE.openInterest || 0,
          volume: option.PE.totalTradedVolume || 0
        } : null;
        
        return {
          strikePrice,
          isATM,
          call: callOption,
          put: putOption
        };
      });
      
      return res.json({
        success: true,
        data: {
          symbol: formattedSymbol,
          spotPrice,
          expiryDates,
          timestamp: new Date().getTime(),
          options: formattedOptions
        }
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to parse NSE option chain data'
      });
    }
  } catch (error) {
    console.error('NSE stock option chain fetch error:', error.message);
    
    // Return a fallback response with simulated data
    const mockPrice = Math.round(1000 + Math.random() * 2000);
    
    return res.json({
      success: true,
      data: {
        symbol: req.params.symbol.toUpperCase(),
        spotPrice: mockPrice,
        expiryDates: [
          new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        ],
        timestamp: new Date().getTime(),
        options: generateMockStockOptionChain(req.params.symbol.toUpperCase(), mockPrice),
        note: "Using simulated data due to NSE API access restrictions"
      }
    });
  }
};

/**
 * Get the current price for a symbol
 */
exports.getSymbolPrice = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Format symbol for NSE API
    const formattedSymbol = symbol.toUpperCase();
    
    // Determine if this is an index or equity
    const isIndex = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'NIFTY50', 'SENSEX'].includes(formattedSymbol);
    
    // NSE API URL for price data
    const nseUrl = isIndex
      ? `https://www.nseindia.com/api/equity-stockIndices?index=${formattedSymbol === 'NIFTY' || formattedSymbol === 'NIFTY50' ? 'NIFTY 50' : formattedSymbol}`
      : `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(formattedSymbol)}`;
    
    // Headers to simulate a browser request
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.nseindia.com/get-quotes/equity?symbol=' + encodeURIComponent(formattedSymbol)
    };
    
    // Make the request to NSE
    const response = await axios.get(nseUrl, { headers });
    
    if (response.data) {
      // Extract price data based on whether it's an index or equity
      const priceData = isIndex
        ? {
            symbol: formattedSymbol,
            lastPrice: response.data.last,
            change: response.data.change,
            pChange: response.data.pChange
          }
        : {
            symbol: formattedSymbol,
            lastPrice: response.data.priceInfo.lastPrice,
            change: response.data.priceInfo.change,
            pChange: response.data.priceInfo.pChange
          };
      
      return res.json({
        success: true,
        data: priceData
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to parse NSE price data'
      });
    }
  } catch (error) {
    console.error('NSE price fetch error:', error.message);
    
    // Return a fallback response with mock data
    return res.json({
      success: true,
      data: {
        symbol: req.params.symbol.toUpperCase(),
        lastPrice: generateMockPrice(req.params.symbol.toUpperCase()),
        change: (Math.random() * 100 - 50).toFixed(2),
        pChange: (Math.random() * 4 - 2).toFixed(2),
        note: "Using simulated data due to NSE API access restrictions"
      }
    });
  }
};

/**
 * Get historical OHLC data for a symbol
 * @route GET /api/market-data/historical/:symbol
 */
exports.getHistoricalData = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1d' } = req.query;
    
    // Call the service to get historical data
    const data = await marketDataService.getHistoricalData(symbol, timeframe);
    
    res.status(200).json({
      success: true,
      data: data,
      timeframe
    });
  } catch (error) {
    console.error(`Error fetching historical data for ${req.params.symbol}:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch historical data',
      error: error.message
    });
  }
};

// Helper function to generate mock option chain for indices
function generateMockOptionChain(symbol) {
  const spotPrice = symbol === 'NIFTY' ? 22450 : symbol === 'BANKNIFTY' ? 48320 : 20000;
  const step = symbol === 'NIFTY' ? 100 : 200;
  const options = [];
  
  // Generate strikes around the spot price
  for (let i = -10; i <= 10; i++) {
    const strikePrice = Math.round((spotPrice + i * step) / step) * step;
    const isATM = i === 0;
    
    // Generate option data
    const call = {
      symbol: `${symbol} ${strikePrice} CE`,
      type: 'CE',
      expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      strikePrice: strikePrice,
      bidPrice: Math.max(5, Math.round(Math.max(0, spotPrice - strikePrice) + Math.random() * 50)),
      askPrice: Math.max(5, Math.round(Math.max(0, spotPrice - strikePrice) + Math.random() * 60)),
      lastPrice: Math.max(5, Math.round(Math.max(0, spotPrice - strikePrice) + Math.random() * 55)),
      change: (Math.random() * 10 - 5).toFixed(2),
      openInterest: Math.round(Math.random() * 100000),
      volume: Math.round(Math.random() * 50000)
    };
    
    const put = {
      symbol: `${symbol} ${strikePrice} PE`,
      type: 'PE',
      expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      strikePrice: strikePrice,
      bidPrice: Math.max(5, Math.round(Math.max(0, strikePrice - spotPrice) + Math.random() * 50)),
      askPrice: Math.max(5, Math.round(Math.max(0, strikePrice - spotPrice) + Math.random() * 60)),
      lastPrice: Math.max(5, Math.round(Math.max(0, strikePrice - spotPrice) + Math.random() * 55)),
      change: (Math.random() * 10 - 5).toFixed(2),
      openInterest: Math.round(Math.random() * 100000),
      volume: Math.round(Math.random() * 50000)
    };
    
    options.push({
      strikePrice,
      isATM,
      call,
      put
    });
  }
  
  return options;
}

// Helper function to generate mock option chain for stocks
function generateMockStockOptionChain(symbol, spotPrice) {
  const options = [];
  
  // Generate strikes around the spot price (typically in steps of 5% of spot for stocks)
  const step = Math.round(spotPrice * 0.025); // 2.5% steps
  
  for (let i = -6; i <= 6; i++) {
    const strikePrice = Math.round((spotPrice + i * step) / step) * step;
    const isATM = i === 0;
    
    // Generate option data
    const call = {
      symbol: `${symbol} ${strikePrice} CE`,
      type: 'CE',
      expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      strikePrice: strikePrice,
      bidPrice: Math.max(1, Math.round(Math.max(0, spotPrice - strikePrice) / 10 + Math.random() * 10)),
      askPrice: Math.max(1, Math.round(Math.max(0, spotPrice - strikePrice) / 10 + Math.random() * 12)),
      lastPrice: Math.max(1, Math.round(Math.max(0, spotPrice - strikePrice) / 10 + Math.random() * 11)),
      change: (Math.random() * 10 - 5).toFixed(2),
      openInterest: Math.round(Math.random() * 20000),
      volume: Math.round(Math.random() * 10000)
    };
    
    const put = {
      symbol: `${symbol} ${strikePrice} PE`,
      type: 'PE',
      expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      strikePrice: strikePrice,
      bidPrice: Math.max(1, Math.round(Math.max(0, strikePrice - spotPrice) / 10 + Math.random() * 10)),
      askPrice: Math.max(1, Math.round(Math.max(0, strikePrice - spotPrice) / 10 + Math.random() * 12)),
      lastPrice: Math.max(1, Math.round(Math.max(0, strikePrice - spotPrice) / 10 + Math.random() * 11)),
      change: (Math.random() * 10 - 5).toFixed(2),
      openInterest: Math.round(Math.random() * 20000),
      volume: Math.round(Math.random() * 10000)
    };
    
    options.push({
      strikePrice,
      isATM,
      call,
      put
    });
  }
  
  return options;
}

// Helper function to generate mock price
function generateMockPrice(symbol) {
  switch (symbol) {
    case 'NIFTY':
    case 'NIFTY50':
      return Math.round(22000 + Math.random() * 1000);
    case 'BANKNIFTY':
      return Math.round(48000 + Math.random() * 1000);
    case 'SENSEX':
      return Math.round(72000 + Math.random() * 2000);
    case 'RELIANCE':
      return Math.round(2400 + Math.random() * 100);
    case 'TCS':
      return Math.round(3500 + Math.random() * 100);
    case 'HDFCBANK':
      return Math.round(1650 + Math.random() * 100);
    default:
      return Math.round(1000 + Math.random() * 2000);
  }
}

/**
 * Get current market status
 * @route GET /api/market-data/market-status
 */
exports.getMarketStatus = async (req, res) => {
  try {
    // Since this is a mock implementation, always return open during market hours
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const day = now.getDay();
    
    // Indian market hours: 9:15 AM to 3:30 PM, Monday to Friday
    const isMarketHours = hours >= 9 && hours <= 15 && !(hours === 15 && minutes > 30);
    const isWeekday = day >= 1 && day <= 5;
    
    const isOpen = isMarketHours && isWeekday;
    
    res.status(200).json({
      success: true,
      data: {
        status: isOpen ? 'open' : 'closed',
        nextOpenTime: isOpen ? null : '09:15:00',
        nextCloseTime: isOpen ? '15:30:00' : null,
        note: 'Mock market status'
      }
    });
  } catch (error) {
    console.error('Error getting market status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch market status',
      error: error.message
    });
  }
};

/**
 * Get indices data
 * @route GET /api/market-data/indices
 */
exports.getIndices = async (req, res) => {
  try {
    const mockIndices = [
      {
        symbol: 'NIFTY',
        name: 'Nifty 50',
        price: 22500 + (Math.random() * 100 - 50),
        change: (Math.random() * 1 - 0.5).toFixed(2),
        percentChange: (Math.random() * 1 - 0.5).toFixed(2)
      },
      {
        symbol: 'BANKNIFTY',
        name: 'Bank Nifty',
        price: 48500 + (Math.random() * 150 - 75),
        change: (Math.random() * 1.5 - 0.75).toFixed(2),
        percentChange: (Math.random() * 1.5 - 0.75).toFixed(2)
      },
      {
        symbol: 'FINNIFTY',
        name: 'Fin Nifty',
        price: 21500 + (Math.random() * 80 - 40),
        change: (Math.random() * 1.2 - 0.6).toFixed(2),
        percentChange: (Math.random() * 1.2 - 0.6).toFixed(2)
      }
    ];
    
    res.status(200).json({
      success: true,
      data: mockIndices
    });
  } catch (error) {
    console.error('Error fetching indices data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch indices data',
      error: error.message
    });
  }
};

/**
 * Get prices for multiple symbols
 * @route GET /api/market-data/prices
 */
exports.getMultipleStockPrices = async (req, res) => {
  try {
    const { symbols } = req.query;
    
    if (!symbols) {
      return res.status(400).json({
        success: false,
        message: 'No symbols provided'
      });
    }
    
    const symbolsArray = symbols.split(',');
    const results = {};
    
    // Call the service for each symbol
    for (const symbol of symbolsArray) {
      results[symbol] = await marketDataService.getStockPrice(symbol);
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching multiple prices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch price data',
      error: error.message
    });
  }
};

/**
 * Get current price for a symbol
 * @route GET /api/market-data/price/:symbol
 */
exports.getStockPrice = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Call the service to get price data
    const priceData = await marketDataService.getStockPrice(symbol);
    
    res.status(200).json({
      success: true,
      data: priceData
    });
  } catch (error) {
    console.error(`Error fetching price for ${req.params.symbol}:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch price data',
      error: error.message
    });
  }
}; 