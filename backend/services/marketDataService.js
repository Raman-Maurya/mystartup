const axios = require('axios');
let redis;

// Simple in-memory cache implementation
const createInMemoryCache = () => {
  console.log('Using in-memory cache for market data');
  return {
    inMemoryCache: new Map(),
    get: async (key) => redis.inMemoryCache.get(key),
    set: async (key, value, ...args) => {
      redis.inMemoryCache.set(key, value);
      // Handle expiry for 'EX' command
      if (args.length >= 2 && args[0] === 'EX') {
        const ttlSeconds = args[1];
        setTimeout(() => {
          redis.inMemoryCache.delete(key);
        }, ttlSeconds * 1000);
      }
      return 'OK';
    }
  };
};

// Try to use Redis if available, otherwise use in-memory cache
try {
  if (process.env.USE_REDIS === 'true') {
    const Redis = require('ioredis');
    redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
      retryStrategy: () => null, // Disable automatic reconnection
      lazyConnect: true // Don't connect immediately
    });
    
    // Handle connection events
    redis.on('error', (err) => {
      console.warn('Redis connection error:', err.message);
      // If we get an error on the initial connection attempt, switch to in-memory cache
      if (!redis.status || redis.status === 'wait' || redis.status === 'reconnecting') {
        console.log('Falling back to in-memory cache');
        redis = createInMemoryCache();
      }
    });
    
    // Try connecting
    redis.connect().catch(() => {
      redis = createInMemoryCache();
    });
  } else {
    // Use in-memory cache if Redis is not enabled
    redis = createInMemoryCache();
  }
} catch (error) {
  console.warn('Redis error:', error.message);
  redis = createInMemoryCache();
}

// Cache TTL in seconds
const CACHE_TTL = 60;

class MarketDataService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    // Update with the real API URL
    this.baseUrl = process.env.MARKET_API_URL || 'https://api.example.com/v1';
  }

  /**
   * Get option chain data for an instrument
   * @param {string} symbol - Instrument symbol (NIFTY, BANKNIFTY, or stock symbol)
   * @returns {Promise<Object>} - Option chain data
   */
  async getOptionChain(symbol) {
    const cacheKey = `optionchain:${symbol}`;
    
    // Try to get from cache first
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    // If not in cache, fetch from API
    try {
      let endpoint = `/options/${symbol}`;
      
      // For NIFTY and BANKNIFTY, use indices endpoint
      if (symbol === 'NIFTY' || symbol === 'BANKNIFTY') {
        endpoint = `/indices/options/${symbol}`;
      }
      
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Process the raw API response to our expected format
      const processedData = this.processOptionChainResponse(response.data, symbol);
      
      // Store in cache
      await redis.set(cacheKey, JSON.stringify(processedData), 'EX', CACHE_TTL);
      
      return processedData;
    } catch (error) {
      console.error(`Error fetching option chain for ${symbol}:`, error);
      // Return fallback data for development/demo purposes
      return this.getFallbackOptionChain(symbol);
    }
  }

  /**
   * Process the raw API response to a standardized format
   * @param {Object} apiResponse - Raw API response
   * @param {string} symbol - Instrument symbol
   * @returns {Object} - Processed option chain data
   */
  processOptionChainResponse(apiResponse, symbol) {
    try {
      // The structure here will depend on your actual API response
      // This is a sample implementation that should be adjusted based on real API
      
      const spotPrice = apiResponse.spotPrice || apiResponse.underlyingValue || 0;
      
      // Extract the options data
      let options = [];
      if (apiResponse.data && Array.isArray(apiResponse.data.options)) {
        options = apiResponse.data.options;
      } else if (Array.isArray(apiResponse.options)) {
        options = apiResponse.options;
      } else {
        options = [];
      }
      
      // Group options by strike price and option type
      const groupedOptions = {};
      options.forEach(option => {
        const strikePrice = option.strikePrice;
        const optionType = option.optionType || (option.callOrPut === 'C' ? 'CE' : 'PE');
        
        if (!groupedOptions[strikePrice]) {
          groupedOptions[strikePrice] = { call: null, put: null };
        }
        
        if (optionType === 'CE' || optionType === 'CALL') {
          groupedOptions[strikePrice].call = {
            symbol: `${symbol} ${strikePrice} CE`,
            premium: option.lastPrice || option.ltp || 0,
            change: option.pctChange || 0,
            openInterest: option.openInterest || option.oi || 0,
            volume: option.volume || option.tradedVolume || 0,
            bidPrice: option.bidPrice || 0,
            askPrice: option.askPrice || 0
          };
        } else {
          groupedOptions[strikePrice].put = {
            symbol: `${symbol} ${strikePrice} PE`,
            premium: option.lastPrice || option.ltp || 0,
            change: option.pctChange || 0,
            openInterest: option.openInterest || option.oi || 0,
            volume: option.volume || option.tradedVolume || 0,
            bidPrice: option.bidPrice || 0,
            askPrice: option.askPrice || 0
          };
        }
      });
      
      // Convert to array and sort by strike price
      const strikeKeys = Object.keys(groupedOptions).map(Number).sort((a, b) => a - b);
      
      // Identify ATM strike
      let atmStrike = strikeKeys.reduce((closest, strike) => {
        return Math.abs(strike - spotPrice) < Math.abs(closest - spotPrice) 
          ? strike 
          : closest;
      }, strikeKeys[0] || 0);
      
      // Mark strikes as ATM or not and build final array
      const optionChain = strikeKeys.map(strike => {
        const isATM = strike === atmStrike;
        return {
          strikePrice: strike,
          isATM,
          call: groupedOptions[strike].call || {
            symbol: `${symbol} ${strike} CE`,
            premium: 0,
            change: 0,
            openInterest: 0,
            volume: 0
          },
          put: groupedOptions[strike].put || {
            symbol: `${symbol} ${strike} PE`,
            premium: 0,
            change: 0,
            openInterest: 0,
            volume: 0
          }
        };
      });
      
      return {
        symbol,
        spotPrice,
        timestamp: new Date().toISOString(),
        options: optionChain
      };
    } catch (error) {
      console.error('Error processing option chain response:', error);
      return this.getFallbackOptionChain(symbol);
    }
  }

  /**
   * Get fallback option chain data (for development/demo)
   * @param {string} symbol - Instrument symbol
   * @returns {Object} - Fallback option chain data
   */
  getFallbackOptionChain(symbol) {
    let spotPrice, strikes;
    
    if (symbol === 'NIFTY') {
      spotPrice = 22450;
      strikes = Array.from({length: 11}, (_, i) => Math.round((spotPrice - 500) + i * 100));
    } else if (symbol === 'BANKNIFTY') {
      spotPrice = 48320;
      strikes = Array.from({length: 11}, (_, i) => Math.round((spotPrice - 1000) + i * 200));
    } else {
      // For individual stocks, use a reasonable dummy price
      spotPrice = 1500;
      strikes = Array.from({length: 7}, (_, i) => Math.round((spotPrice * 0.9) + i * (spotPrice * 0.025)));
    }
    
    const options = strikes.map(strike => {
      const isATM = Math.abs(strike - spotPrice) < (symbol === 'BANKNIFTY' ? 100 : 50);
      
      // Calculate reasonable option prices based on strike and spot
      const callPremium = Math.max(10, Math.round((Math.random() * 0.1 + 0.9) * Math.max(0, spotPrice - strike + 200)));
      const putPremium = Math.max(10, Math.round((Math.random() * 0.1 + 0.9) * Math.max(0, strike - spotPrice + 200)));
      
      return {
        strikePrice: strike,
        isATM,
        call: {
          symbol: `${symbol} ${strike} CE`,
          premium: callPremium,
          change: Math.round((Math.random() * 6 - 3) * 100) / 100,
          openInterest: Math.round(Math.random() * 10000),
          volume: Math.round(Math.random() * 5000),
          bidPrice: Math.max(1, callPremium - 5),
          askPrice: callPremium + 5
        },
        put: {
          symbol: `${symbol} ${strike} PE`,
          premium: putPremium,
          change: Math.round((Math.random() * 6 - 3) * 100) / 100,
          openInterest: Math.round(Math.random() * 10000),
          volume: Math.round(Math.random() * 5000),
          bidPrice: Math.max(1, putPremium - 5),
          askPrice: putPremium + 5
        }
      };
    });
    
    return {
      symbol,
      spotPrice,
      timestamp: new Date().toISOString(),
      options
    };
  }

  /**
   * Get stock price data
   * @param {string} symbol - Stock symbol
   * @returns {Promise<Object>} - Stock price data
   */
  async getStockPrice(symbol) {
    const cacheKey = `stockprice:${symbol}`;
    
    // Try to get from cache first
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    // If not in cache, fetch from API
    try {
      const endpoint = symbol === 'NIFTY' || symbol === 'BANKNIFTY' 
        ? `/indices/${symbol}`
        : `/quotes/${symbol}`;
        
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Process the response
      const processedData = {
        symbol,
        lastPrice: response.data.lastPrice || response.data.ltp || 0,
        change: response.data.change || 0,
        percentChange: response.data.percentChange || response.data.pctChange || 0,
        openPrice: response.data.openPrice || response.data.open || 0,
        highPrice: response.data.highPrice || response.data.high || 0,
        lowPrice: response.data.lowPrice || response.data.low || 0,
        previousClose: response.data.previousClose || response.data.prevClose || 0,
        volume: response.data.volume || response.data.tradedVolume || 0,
        timestamp: new Date().toISOString()
      };
      
      // Store in cache with shorter TTL for price data
      await redis.set(cacheKey, JSON.stringify(processedData), 'EX', 15); // 15 seconds TTL
      
      return processedData;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      
      // Return fallback data
      return {
        symbol,
        lastPrice: symbol === 'NIFTY' ? 22450 : symbol === 'BANKNIFTY' ? 48320 : 1500,
        change: Math.round((Math.random() * 200) - 100) / 10,
        percentChange: Math.round((Math.random() * 4) - 2) / 10,
        openPrice: symbol === 'NIFTY' ? 22400 : symbol === 'BANKNIFTY' ? 48250 : 1490,
        highPrice: symbol === 'NIFTY' ? 22500 : symbol === 'BANKNIFTY' ? 48400 : 1520,
        lowPrice: symbol === 'NIFTY' ? 22350 : symbol === 'BANKNIFTY' ? 48200 : 1480,
        previousClose: symbol === 'NIFTY' ? 22380 : symbol === 'BANKNIFTY' ? 48100 : 1495,
        volume: Math.round(Math.random() * 10000000),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get historical OHLC data for a symbol
   * @param {string} symbol - The symbol to fetch data for (e.g. 'NIFTY', 'RELIANCE')
   * @param {string} timeframe - Timeframe for the data (e.g. '1d', '1w', '1m')
   * @returns {Promise<Array>} - Array of OHLC data objects
   */
  async getHistoricalData(symbol, timeframe = '1d') {
    try {
      const cacheKey = `historicaldata:${symbol}:${timeframe}`;
      
      // Try to get from cache first
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      // In a real implementation, you would fetch from your data vendor here
      // Example API call (commented out):
      /*
      const response = await axios.get(`${this.baseUrl}/historical/${symbol}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        params: {
          timeframe,
          limit: 100
        }
      });
      
      const data = response.data;
      // Cache the data
      await redis.set(cacheKey, JSON.stringify(data), 'EX', CACHE_TTL);
      return data;
      */
      
      // For now, generate mock historical data
      const mockData = this.generateMockHistoricalData(symbol, timeframe);
      
      // Cache the mock data
      await redis.set(cacheKey, JSON.stringify(mockData), 'EX', CACHE_TTL);
      
      return mockData;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      // Return mock data as fallback
      return this.generateMockHistoricalData(symbol, timeframe);
    }
  }
  
  /**
   * Generate mock historical OHLC data
   * @param {string} symbol - Symbol to generate data for
   * @param {string} timeframe - Timeframe ('1d', '1w', '1m', etc)
   * @returns {Array} - Array of OHLC data points
   */
  generateMockHistoricalData(symbol, timeframe) {
    // Base price depends on the symbol
    const basePrice = this.getBasePrice(symbol);
    
    // Number of data points to generate based on timeframe
    const periods = this.getPeriodsForTimeframe(timeframe);
    
    let mockPrices = [];
    let currentPrice = basePrice;
    
    // Volatility depends on the symbol type
    const volatility = this.getVolatilityForSymbol(symbol);
    
    const now = new Date();
    
    for (let i = periods; i >= 0; i--) {
      const date = new Date();
      
      if (timeframe === '1d') {
        // For 1d, use 5-minute intervals during trading hours
        date.setHours(9);
        date.setMinutes(15 + (i * 5));
        date.setSeconds(0);
        date.setMilliseconds(0);
      } else {
        // For other timeframes, use daily intervals
        date.setDate(date.getDate() - i);
        date.setHours(15);
        date.setMinutes(30);
        date.setSeconds(0);
        date.setMilliseconds(0);
      }
      
      // Skip weekends for non-1d timeframes
      if (timeframe !== '1d' && (date.getDay() === 0 || date.getDay() === 6)) {
        continue;
      }
      
      // Random price movement
      const change = currentPrice * volatility * (Math.random() * 2 - 1);
      const open = currentPrice;
      currentPrice = open + change;
      const high = Math.max(open, currentPrice) + (Math.random() * open * volatility / 2);
      const low = Math.min(open, currentPrice) - (Math.random() * open * volatility / 2);
      const close = currentPrice;
      
      // Random volume
      const volume = Math.floor(Math.random() * 10000000) + 500000;
      
      mockPrices.push({
        date: date.toISOString(),
        open,
        high,
        low,
        close,
        volume
      });
    }
    
    return mockPrices;
  }
  
  /**
   * Get base price for a symbol
   * @param {string} symbol 
   * @returns {number}
   */
  getBasePrice(symbol) {
    const symbolUpper = symbol.toUpperCase();
    switch (symbolUpper) {
      case 'NIFTY':
      case 'NIFTY50':
        return 22500;
      case 'BANKNIFTY':
        return 48500;
      case 'FINNIFTY':
        return 21500;
      case 'RELIANCE':
        return 2450;
      case 'TCS':
        return 3540;
      case 'HDFCBANK':
        return 1680;
      case 'INFY':
        return 1450;
      case 'ICICIBANK':
        return 950;
      default:
        return 1000; // Default price
    }
  }
  
  /**
   * Get number of periods to generate for a timeframe
   */
  getPeriodsForTimeframe(timeframe) {
    switch (timeframe) {
      case '1d':
        return 78; // 6.5 hours of trading / 5 min bars = 78 bars
      case '1w':
        return 5; // 5 trading days
      case '1m':
        return 22; // 22 trading days
      case '3m':
        return 66; // 66 trading days
      case '6m':
        return 125; // ~125 trading days
      case '1y':
        return 250; // ~250 trading days
      default:
        return 30;
    }
  }
  
  /**
   * Get volatility for a symbol
   */
  getVolatilityForSymbol(symbol) {
    const symbolUpper = symbol.toUpperCase();
    
    if (symbolUpper === 'NIFTY' || symbolUpper === 'NIFTY50') {
      return 0.005; // 0.5% average move
    } else if (symbolUpper === 'BANKNIFTY') {
      return 0.008; // 0.8% average move
    } else {
      return 0.01; // 1% average move for stocks
    }
  }
}

module.exports = MarketDataService;