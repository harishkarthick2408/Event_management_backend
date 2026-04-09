const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorMiddleware = require('./middlewares/errorMiddleware');

dotenv.config();
connectDB();

const app = express();

/**
 * ✅ CORS CONFIGURATION (IMPORTANT)
 */
const corsOptions = {
  origin: ['http://localhost:5173'], // frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

/**
 * ✅ MIDDLEWARES
 */
app.use(express.json());

/**
 * ✅ ROUTES
 */
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/checkin', require('./routes/checkinRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/seats', require('./routes/seatRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

/**
 * ✅ BACKGROUND JOB (Seat Hold Release)
 */
const { releaseExpiredHolds } = require('./services/seatAllocationService');

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

/**
 * ✅ HEALTH CHECK
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * ✅ ERROR HANDLER (MUST BE LAST)
 */
app.use(errorMiddleware);

module.exports = app;
