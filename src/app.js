const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorMiddleware = require('./middlewares/errorMiddleware');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/checkin', require('./routes/checkinRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/seats', require('./routes/seatRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

const { releaseExpiredHolds } = require('./services/seatAllocationService');

// Run every 2 minutes to release expired seat holds
setInterval(async () => {
  try {
    const released = await releaseExpiredHolds();
    if (released > 0) {
      console.log(`Released ${released} expired seat hold(s)`);
    }
  } catch (err) {
    console.error('Auto-release error:', err);
  }
}, 2 * 60 * 1000);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use(errorMiddleware);

module.exports = app;
