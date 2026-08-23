require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const alertRoutes = require('./routes/alertRoutes');
const riskScoreRoutes = require('./routes/riskScoreRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/risk-scores', riskScoreRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(errorMiddleware);

module.exports = app;