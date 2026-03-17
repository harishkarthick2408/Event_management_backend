const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    rating: { type: Number, min: 1, max: 5 },
    comments: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
