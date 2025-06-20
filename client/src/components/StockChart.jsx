import React, { useEffect, useRef, useState } from 'react';
import { Card, Spinner, ButtonGroup, Button } from 'react-bootstrap';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import axios from 'axios';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const timeframes = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' }
];

const StockChart = ({ symbol = 'NIFTY', initialTimeframe = '1d' }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const chartRef = useRef(null);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [percentChange, setPercentChange] = useState(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const endpoint = `/api/market-data/historical/${symbol}?timeframe=${timeframe}`;
        const response = await axios.get(endpoint);
        
        if (response.data && response.data.success) {
          const data = response.data.data;
          
          // Format data for chart
          setChartData({
            labels: data.map(item => item.date),
            datasets: [
              {
                label: 'Close',
                data: data.map(item => item.close),
                fill: false,
                borderColor: '#4e73df',
                tension: 0.1,
                pointRadius: 0,
                borderWidth: 2,
                yAxisID: 'y'
              },
              {
                label: 'Volume',
                data: data.map(item => item.volume),
                backgroundColor: data.map(item => (item.close >= item.open ? 'rgba(40, 167, 69, 0.5)' : 'rgba(220, 53, 69, 0.5)')),
                borderColor: data.map(item => (item.close >= item.open ? 'rgba(40, 167, 69, 0.8)' : 'rgba(220, 53, 69, 0.8)')),
                borderWidth: 1,
                yAxisID: 'y1',
                type: 'bar',
              }
            ]
          });
          
          if (data.length > 0) {
            const latest = data[data.length - 1];
            const previous = data.length > 1 ? data[data.length - 2] : latest;
            
            setCurrentPrice(latest.close);
            setPriceChange(latest.close - previous.close);
            setPercentChange(((latest.close - previous.close) / previous.close) * 100);
          }
          
        } else {
          throw new Error('Invalid data format');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError('Failed to load chart data. Using mock data.');
        
        // Generate mock data if API fails
        const mockData = generateMockChartData(symbol, timeframe);
        setChartData(mockData.chartData);
        setCurrentPrice(mockData.currentPrice);
        setPriceChange(mockData.priceChange);
        setPercentChange(mockData.percentChange);
        setLoading(false);
      }
    };
    
    fetchChartData();
  }, [symbol, timeframe]);
  
  // Generate mock data for development purposes
  const generateMockChartData = (symbol, timeframe) => {
    const basePrice = symbol === 'NIFTY' ? 22500 : 
                     symbol === 'BANKNIFTY' ? 48500 :
                     symbol === 'RELIANCE' ? 2450 : 1000;
    
    const volatility = 0.01; // 1% price movement
    const periods = timeframe === '1d' ? 78 : // 5-min bars for 6.5hrs
                   timeframe === '1w' ? 5 :
                   timeframe === '1m' ? 22 :
                   timeframe === '3m' ? 66 :
                   timeframe === '6m' ? 130 :
                   timeframe === '1y' ? 250 : 30;
    
    const now = new Date();
    let mockPrices = [];
    let currentP = basePrice;
    
    for (let i = periods; i >= 0; i--) {
      const date = new Date();
      
      if (timeframe === '1d') {
        // For 1d, use 5-minute intervals during trading hours
        date.setHours(9, 15 + (i * 5), 0, 0);
      } else {
        // For other timeframes, use daily intervals
        date.setDate(date.getDate() - i);
      }
      
      // Skip weekends for non-1d timeframes
      if (timeframe !== '1d' && (date.getDay() === 0 || date.getDay() === 6)) {
        continue;
      }
      
      // Random price movement
      const change = currentP * volatility * (Math.random() * 2 - 1);
      const open = currentP;
      currentP = open + change;
      const high = Math.max(open, currentP) + (Math.random() * open * 0.005);
      const low = Math.min(open, currentP) - (Math.random() * open * 0.005);
      const close = currentP;
      
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
    
    // Calculate current price and changes
    const latest = mockPrices[mockPrices.length - 1];
    const previous = mockPrices.length > 1 ? mockPrices[mockPrices.length - 2] : latest;
    
    const latestPrice = latest.close;
    const priceChange = latest.close - previous.close;
    const percentChange = ((latest.close - previous.close) / previous.close) * 100;
    
    return {
      chartData: {
        labels: mockPrices.map(item => item.date),
        datasets: [
          {
            label: 'Close',
            data: mockPrices.map(item => item.close),
            fill: false,
            borderColor: '#4e73df',
            tension: 0.1,
            pointRadius: 0,
            borderWidth: 2,
            yAxisID: 'y'
          },
          {
            label: 'Volume',
            data: mockPrices.map(item => item.volume),
            backgroundColor: mockPrices.map(item => (item.close >= item.open ? 'rgba(40, 167, 69, 0.5)' : 'rgba(220, 53, 69, 0.5)')),
            borderColor: mockPrices.map(item => (item.close >= item.open ? 'rgba(40, 167, 69, 0.8)' : 'rgba(220, 53, 69, 0.8)')),
            borderWidth: 1,
            yAxisID: 'y1',
            type: 'bar',
          }
        ]
      },
      currentPrice: latestPrice,
      priceChange,
      percentChange
    };
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeframe === '1d' ? 'minute' : 'day',
          displayFormats: {
            minute: 'HH:mm',
            day: 'MMM d'
          }
        },
        grid: {
          display: false,
        },
      },
      y: {
        position: 'right',
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      y1: {
        position: 'left',
        grid: {
          display: false,
        },
        display: true,
        ticks: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            const label = context[0].label;
            // Format the date for display
            const date = new Date(label);
            return timeframe === '1d'
              ? date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          },
        },
      },
    },
  };
  
  return (
    <Card className="shadow-sm mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">{symbol}</h5>
          {currentPrice && (
            <div className="d-flex align-items-center">
              <span className="h4 mb-0 me-2">₹{currentPrice.toFixed(2)}</span>
              <span className={`small ${priceChange >= 0 ? 'text-success' : 'text-danger'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
        
        <ButtonGroup size="sm">
          {timeframes.map((tf) => (
            <Button 
              key={tf.value}
              variant={timeframe === tf.value ? 'primary' : 'outline-primary'}
              onClick={() => setTimeframe(tf.value)}
            >
              {tf.label}
            </Button>
          ))}
        </ButtonGroup>
      </Card.Header>
      
      <Card.Body>
        <div style={{ height: '350px', position: 'relative' }}>
          {loading ? (
            <div className="d-flex justify-content-center align-items-center h-100">
              <Spinner animation="border" role="status" variant="primary">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : error ? (
            <div className="text-center text-danger h-100 d-flex flex-column justify-content-center">
              <p>{error}</p>
              <p className="mb-0">Using simulated data.</p>
            </div>
          ) : chartData ? (
            <Line ref={chartRef} options={chartOptions} data={chartData} />
          ) : (
            <div className="text-center text-muted h-100 d-flex align-items-center justify-content-center">
              <p className="mb-0">No chart data available</p>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default StockChart; 