const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    attendeeName: { type: String },
    attendeeEmail: { type: String },
    overallRating: { type: Number, min: 1, max: 5 },
    venueRating: { type: Number, min: 1, max: 5 },
    contentRating: { type: Number, min: 1, max: 5 },
    organizationRating: { type: Number, min: 1, max: 5 },
    speakerRating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
