const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // Roles: admin (full access), organizer (manages events), attendee (regular user)
    role: {
      type: String,
      enum: ['admin', 'organizer', 'attendee'],
      default: 'attendee',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
