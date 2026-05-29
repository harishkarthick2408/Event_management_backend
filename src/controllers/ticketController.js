const Ticket = require('../models/Ticket');
const qrService = require('../services/qrService');

exports.createTicket = async (req, res, next) => {
  try {
    const { event, attendeeName, attendeeEmail, ticketType } = req.body;
    const qrCode = await qrService.generateQRCode({ event, attendeeEmail });
    const ticket = await Ticket.create({
      event,
      attendeeName,
      attendeeEmail,
      ticketType,
      qrCode,
    });
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
};

exports.getTicketsByEvent = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ event: req.params.eventId });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
};

exports.updateCheckInStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { checkedIn } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const isCheckedIn = !!checkedIn;
    ticket.checkedIn = isCheckedIn;
    ticket.checkedInAt = isCheckedIn ? new Date() : null;

    await ticket.save();

    res.json(ticket);
  } catch (err) {
    next(err);
  }
};
