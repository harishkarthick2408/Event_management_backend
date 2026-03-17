const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    location: { type: String },
    city: { type: String },
    category: { type: String },
    image: { type: String },
    price: { type: Number, default: 0 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    capacity: { type: Number },
    tags: [{ type: String }],
    status: {
      type: String,
      enum: ['draft', 'published', 'completed', 'cancelled'],
      default: 'draft',
    },
    ticketsSold: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
