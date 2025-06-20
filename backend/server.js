const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const contestJobs = require('./jobs/contestJobs');
const AppError = require('./utils/appError');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const contestRoutes = require('./routes/contestRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const marketDataRoutes = require('./routes/marketDataRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const virtualWalletRoutes = require('./routes/virtualWalletRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Define routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/market-data', marketDataRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/virtual-wallets', virtualWalletRoutes);
app.use('/api/admin', adminRoutes);

// Basic route
app.use((req, res, next) => {
  const startTime = new Date();
  res.on('finish', () => {
    const endTime = new Date();
    const duration = endTime - startTime;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.get('/', (req, res) => {
  res.send('Trading Contest API is running');
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Handle 404 - Route not found
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  res.status(err.statusCode).json({ 
    success: false, 
    status: err.status,
    message: err.message || 'Server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/trading-contest', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('MongoDB connected');
    
    // Start scheduled jobs
    contestJobs.startJobs();
    
    // Define port and start server
    const PORT = process.env.PORT || 9877;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }); 