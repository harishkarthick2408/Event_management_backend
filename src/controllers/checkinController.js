const Ticket = require('../models/Ticket');

exports.checkIn = async (req, res, next) => {
  try {
    const { qrCode } = req.body;

    // Validate QR by matching it against a stored ticket in MongoDB
    const ticket = await Ticket.findOne({ qrCode });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (ticket.checkedIn) return res.status(400).json({ message: 'Already checked in' });

    ticket.checkedIn = true;
    ticket.checkedInAt = new Date();
    await ticket.save();

    res.json({ message: 'Check-in successful', ticket });
  } catch (err) {
    next(err);
  }
};
