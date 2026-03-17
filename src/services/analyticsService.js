const Ticket = require('../models/Ticket');
const Event = require('../models/Event');

exports.getEventStats = async (eventId) => {
  const [event, totalTickets, checkedInTickets] = await Promise.all([
    Event.findById(eventId),
    Ticket.countDocuments({ event: eventId }),
    Ticket.countDocuments({ event: eventId, checkedIn: true }),
  ]);

  return {
    event,
    totalTickets,
    checkedInTickets,
    checkinRate: totalTickets ? checkedInTickets / totalTickets : 0,
  };
};
