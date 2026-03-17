const Ticket = require('../models/Ticket');
const qrService = require('../services/qrService');

exports.createTicket = async (req, res, next) => {
  try {
    const { event, attendeeName, attendeeEmail } = req.body;
    const qrCode = await qrService.generateQRCode({ event, attendeeEmail });
    const ticket = await Ticket.create({ event, attendeeName, attendeeEmail, qrCode });
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
