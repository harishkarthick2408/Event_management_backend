const express = require('express');
const router = express.Router();
const {
  getSeats,
  generateLayout,
  smartAllocate,
  holdSeats,
  confirmBooking,
  releaseSeats,
  getBooking,
  getUserBookings,
  checkInByQR,
  blockSeats,
  getSeatStats,
} = require('../controllers/seatController');

// Public routes
router.get('/event/:eventId', getSeats);
router.get('/booking/:bookingReference', getBooking);
router.get('/my-bookings/:userId', getUserBookings);
router.get('/stats/:eventId', getSeatStats);

// Booking flow routes
router.post('/smart-allocate', smartAllocate);
router.post('/hold', holdSeats);
router.post('/confirm', confirmBooking);
router.post('/release', releaseSeats);
router.post('/checkin', checkInByQR);

// Admin routes
router.post('/generate', generateLayout);
router.patch('/block', blockSeats);

module.exports = router;
