const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');

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

// Get high-level dashboard analytics across all events
exports.getOverviewStats = async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  const [events, totalTickets, checkedInTodayTickets, ticketsByEvent, ticketTypesAgg, feedbackAgg] =
    await Promise.all([
      Event.find(),
      Ticket.countDocuments(),
      Ticket.countDocuments({
        checkedIn: true,
        checkedInAt: { $gte: startOfToday, $lt: startOfTomorrow },
      }),
      Ticket.aggregate([
        {
          $group: {
            _id: '$event',
            tickets: { $sum: 1 },
            attended: {
              $sum: {
                $cond: [{ $eq: ['$checkedIn', true] }, 1, 0],
              },
            },
          },
        },
      ]),
      Ticket.aggregate([
        {
          $group: {
            _id: '$ticketType',
            value: { $sum: 1 },
          },
        },
      ]),
      Feedback.aggregate([
        {
          $group: {
            _id: '$event',
            avgRating: { $avg: '$overallRating' },
          },
        },
      ]),
    ]);

  const ticketsByEventMap = new Map(
    ticketsByEvent.map((doc) => [String(doc._id), doc.tickets])
  );

  const attendanceByEventMap = new Map(
    ticketsByEvent.map((doc) => [String(doc._id), doc.attended || 0])
  );

  const totalEvents = events.length;

  const totalRevenue = events.reduce((sum, event) => {
    const tickets = ticketsByEventMap.get(String(event._id)) || 0;
    return sum + tickets * (event.price || 0);
  }, 0);

  // Daily ticket sales for the last 7 days (including today)
  const startOfRange = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

  const salesAgg = await Ticket.aggregate([
    { $match: { createdAt: { $gte: startOfRange } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        tickets: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const salesMap = new Map(salesAgg.map((doc) => [doc._id, doc.tickets]));
  const salesByDay = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const isoDate = date.toISOString().slice(0, 10);
    salesByDay.push({ date: isoDate, tickets: salesMap.get(isoDate) || 0 });
  }

  // Events by category (count of events per category)
  const categoryCounts = events.reduce((acc, event) => {
    const category = event.category || 'Other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const eventsByCategory = Object.entries(categoryCounts).map(
    ([name, value]) => ({ name, value })
  );

  const ticketBreakdown = ticketTypesAgg.map((doc) => ({
    name: doc._id || 'Standard',
    value: doc.value,
  }));

  const feedbackMap = new Map(
    feedbackAgg.map((doc) => [String(doc._id), doc.avgRating || 0])
  );

  // Recent registrations (latest tickets with event info)
  const recentTickets = await Ticket.find()
    .sort({ createdAt: -1 })
    .limit(6)
    .populate('event', 'name city startTime endTime capacity price');

  const recentRegistrations = recentTickets.map((ticket) => ({
    id: ticket._id,
    name: ticket.attendeeName,
    email: ticket.attendeeEmail,
    checkedIn: ticket.checkedIn,
    checkedInAt: ticket.checkedInAt,
    ticketType: ticket.ticketType || 'Standard',
    event: ticket.event
      ? {
          id: ticket.event._id,
          title: ticket.event.name,
          city: ticket.event.city,
        }
      : null,
  }));

  // Upcoming events (future events sorted by start time)
  const upcomingEventsDocs = await Event.find({ startTime: { $gte: now } })
    .sort({ startTime: 1 })
    .limit(5);

  const upcomingEvents = upcomingEventsDocs.map((event) => ({
    id: event._id,
    title: event.name,
    date: event.startTime.toISOString().slice(0, 10),
    city: event.city,
    capacity: event.capacity || 0,
    ticketsSold:
      ticketsByEventMap.get(String(event._id)) ?? event.ticketsSold ?? 0,
  }));

  // Per-event performance for analytics reports
  const perEventPerformance = events.map((event) => {
    const idStr = String(event._id);
    const ticketsForEvent = ticketsByEventMap.get(idStr) || 0;
    const attendedForEvent = attendanceByEventMap.get(idStr) || 0;
    const capacity = event.capacity || 0;
    const rate = capacity
      ? Math.round((attendedForEvent / capacity) * 100)
      : 0;
    const revenueForEvent = ticketsForEvent * (event.price || 0);
    const avgRatingRaw = feedbackMap.get(idStr);
    const feedbackScore =
      typeof avgRatingRaw === 'number'
        ? Number(avgRatingRaw.toFixed(1))
        : null;

    return {
      id: event._id,
      name: event.name,
      date: event.startTime.toISOString().slice(0, 10),
      registrations: ticketsForEvent,
      attended: attendedForEvent,
      rate,
      revenue: revenueForEvent,
      feedback: feedbackScore,
    };
  });

  return {
    totals: {
      events: totalEvents,
      tickets: totalTickets,
      revenue: totalRevenue,
      checkedInToday: checkedInTodayTickets,
    },
    charts: {
      salesByDay,
      eventsByCategory,
      ticketBreakdown,
    },
    recentRegistrations,
    upcomingEvents,
    perEventPerformance,
  };
};
