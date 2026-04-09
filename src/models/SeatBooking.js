const mongoose = require('mongoose');

const SeatBookingSchema = new mongoose.Schema({
  bookingReference: {
    type: String,
    required: true,
    unique: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  seats: [
    {
      seatId: String,
      row: String,
      number: Number,
      section: String,
      price: Number,
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  gstAmount: {
    type: Number,
    required: true,
  },
  grandTotal: {
    type: Number,
    required: true,
  },
  ticketType: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'expired'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  qrCode: {
    type: String,
    default: null,
  },
  checkedIn: {
    type: Boolean,
    default: false,
  },
  checkedInAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 min
  },
}, {
  timestamps: true,
});

SeatBookingSchema.index({ bookingReference: 1 });
SeatBookingSchema.index({ userId: 1, eventId: 1 });
SeatBookingSchema.index({ eventId: 1, status: 1 });

module.exports = mongoose.model('SeatBooking', SeatBookingSchema);
