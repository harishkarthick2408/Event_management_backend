const crypto = require('crypto');

// Generate unique booking reference
const generateBookingReference = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BK-${timestamp}-${random}`;
};

// Calculate pricing with GST
const calculatePricing = (seats) => {
  const subtotal = seats.reduce((sum, seat) => sum + seat.price, 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;
  return { subtotal, gst, total };
};

// Format seat list for display
const formatSeatList = (seats) => seats.map((s) => s.seatId).join(', ');

// Group seats by section
const groupBySections = (seats) =>
  seats.reduce((acc, seat) => {
    if (!acc[seat.section]) acc[seat.section] = [];
    acc[seat.section].push(seat);
    return acc;
  }, {});

// Validate seat IDs format (e.g. A1, B12)
const validateSeatId = (seatId) => /^[A-Z][0-9]{1,2}$/.test(seatId);

module.exports = {
  generateBookingReference,
  calculatePricing,
  formatSeatList,
  groupBySections,
  validateSeatId,
};
