const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    attendeeName: { type: String, required: true },
    attendeeEmail: { type: String, required: true },
    qrCode: { type: String, required: true },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
