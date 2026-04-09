const mongoose = require('mongoose');

const SeatSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true,
  },
  seatId: {
    type: String,
    required: true, // e.g. "A1", "B12"
  },
  row: {
    type: String,
    required: true, // e.g. "A", "B"
  },
  number: {
    type: Number,
    required: true, // e.g. 1, 12
  },
  section: {
    type: String,
    enum: ['VIP', 'Premium', 'Regular'],
    default: 'Regular',
  },
  status: {
    type: String,
    enum: ['available', 'held', 'booked', 'blocked'],
    default: 'available',
    index: true,
  },
  price: {
    type: Number,
    required: true,
  },
  heldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  heldUntil: {
    type: Date,
    default: null,
  },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  bookingId: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Compound unique index — no duplicate seats per event
SeatSchema.index({ eventId: 1, seatId: 1 }, { unique: true });

// Auto-release expired holds using TTL-like logic
SeatSchema.index({ heldUntil: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Seat', SeatSchema);
