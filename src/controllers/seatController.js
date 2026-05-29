const Seat = require('../models/Seat');
const SeatBooking = require('../models/SeatBooking');
const seatAllocationService = require('../services/seatAllocationService');
const { generateBookingReference, calculatePricing } = require('../utils/seatHelpers');

// =============================================
// GET /api/seats/event/:eventId
// Get all seats for an event with current status
// =============================================
const getSeats = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Release expired holds first
    await seatAllocationService.releaseExpiredHolds();

    let seats = await Seat.find({ eventId })
      .select('-heldBy -bookedBy -__v')
      .lean();

    // If no seats exist yet, generate default layout
    if (seats.length === 0) {
      const defaultConfig = {
        rows: 10,
        seatsPerRow: 20,
        vipRows: 2,
        premiumRows: 3,
        prices: { VIP: 2999, Premium: 1499, Regular: 999 },
      };
      await seatAllocationService.generateSeatLayout(eventId, defaultConfig);
      seats = await Seat.find({ eventId }).select('-heldBy -bookedBy -__v').lean();
    }

    // Stats
    const stats = {
      total: seats.length,
      available: seats.filter((s) => s.status === 'available').length,
      held: seats.filter((s) => s.status === 'held').length,
      booked: seats.filter((s) => s.status === 'booked').length,
      blocked: seats.filter((s) => s.status === 'blocked').length,
      bySection: {
        VIP: {
          total: seats.filter((s) => s.section === 'VIP').length,
          available: seats.filter((s) => s.section === 'VIP' && s.status === 'available').length,
        },
        Premium: {
          total: seats.filter((s) => s.section === 'Premium').length,
          available: seats.filter((s) => s.section === 'Premium' && s.status === 'available').length,
        },
        Regular: {
          total: seats.filter((s) => s.section === 'Regular').length,
          available: seats.filter((s) => s.section === 'Regular' && s.status === 'available').length,
        },
      },
    };

    res.status(200).json({
      success: true,
      eventId,
      seats,
      stats,
    });
  } catch (error) {
    console.error('getSeats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// POST /api/seats/generate
// Admin: Generate seat layout for an event
// =============================================
const generateLayout = async (req, res) => {
  try {
    const { eventId, config } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'eventId is required' });
    }

    // Delete existing seats for this event before regenerating
    await Seat.deleteMany({ eventId, status: 'available' });

    const seats = await seatAllocationService.generateSeatLayout(eventId, config || {});

    res.status(201).json({
      success: true,
      message: `Generated ${seats.length} seats for event`,
      totalSeats: seats.length,
      config: config || {},
    });
  } catch (error) {
    console.error('generateLayout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// POST /api/seats/smart-allocate
// Smart allocate best seats for user
// =============================================
const smartAllocate = async (req, res) => {
  try {
    const { eventId, quantity, preferredSection, ticketType } = req.body;

    if (!eventId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'eventId and quantity are required',
      });
    }

    const section =
      preferredSection ||
      (ticketType === 'VIP'
        ? 'VIP'
        : ticketType === 'Premium'
        ? 'Premium'
        : 'Regular');

    const result = await seatAllocationService.allocateSeats(
      eventId,
      parseInt(quantity, 10),
      section
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      allocatedSeats: result.seats.map((s) => ({
        seatId: s.seatId,
        row: s.row,
        number: s.number,
        section: s.section,
        price: s.price,
      })),
      isConsecutive: result.isConsecutive,
      row: result.row,
      message: result.message,
    });
  } catch (error) {
    console.error('smartAllocate error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// POST /api/seats/hold
// Temporarily hold selected seats (5 min)
// =============================================
const holdSeats = async (req, res) => {
  try {
    const { eventId, seatIds, userId } = req.body;

    if (!eventId || !seatIds || !seatIds.length) {
      return res.status(400).json({
        success: false,
        message: 'eventId and seatIds are required',
      });
    }

    const uid = userId || req.user?._id || 'anonymous';

    const result = await seatAllocationService.holdSeats(eventId, seatIds, uid);

    if (!result.success) {
      return res.status(409).json(result); // 409 Conflict
    }

    res.status(200).json({
      success: true,
      heldSeats: result.seats.map((s) => ({
        seatId: s.seatId,
        row: s.row,
        number: s.number,
        section: s.section,
        price: s.price,
        heldUntil: s.heldUntil,
      })),
      heldUntil: result.heldUntil,
      message: result.message,
    });
  } catch (error) {
    console.error('holdSeats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// POST /api/seats/confirm
// Confirm booking after payment success
// =============================================
const confirmBooking = async (req, res) => {
  try {
    const { eventId, seatIds, userId, ticketType, quantity, attendeeDetails } = req.body;

    if (!eventId || !seatIds || !userId) {
      return res.status(400).json({
        success: false,
        message: 'eventId, seatIds, and userId are required',
      });
    }

    // Get seat details for pricing
    const seats = await Seat.find({
      eventId,
      seatId: { $in: seatIds },
      status: 'held',
    });

    if (seats.length !== seatIds.length) {
      return res.status(409).json({
        success: false,
        message: 'Some seats are no longer held. Please restart booking.',
      });
    }

    const { subtotal, gst, total } = calculatePricing(seats);
    const bookingReference = generateBookingReference();

    // Confirm seats in DB
    await seatAllocationService.confirmSeats(eventId, seatIds, userId, bookingReference);

    // Create booking record
    const booking = await SeatBooking.create({
      bookingReference,
      eventId,
      userId,
      seats: seats.map((s) => ({
        seatId: s.seatId,
        row: s.row,
        number: s.number,
        section: s.section,
        price: s.price,
      })),
      totalAmount: subtotal,
      gstAmount: gst,
      grandTotal: total,
      ticketType: ticketType || 'General',
      quantity: quantity || seatIds.length,
      status: 'confirmed',
      paymentStatus: 'completed',
      qrCode: bookingReference,
    });

    res.status(201).json({
      success: true,
      bookingReference,
      booking: {
        id: booking._id,
        bookingReference,
        seats: booking.seats,
        totalAmount: subtotal,
        gstAmount: gst,
        grandTotal: total,
        status: 'confirmed',
        qrCode: bookingReference,
      },
      message: 'Booking confirmed successfully!',
    });
  } catch (error) {
    console.error('confirmBooking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// POST /api/seats/release
// Release held seats (cancel or timeout)
// =============================================
const releaseSeats = async (req, res) => {
  try {
    const { eventId, seatIds, userId } = req.body;

    await seatAllocationService.releaseSeats(eventId, seatIds, userId);

    res.status(200).json({
      success: true,
      message: `${seatIds.length} seat(s) released successfully`,
    });
  } catch (error) {
    console.error('releaseSeats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// GET /api/seats/booking/:bookingReference
// Get booking details by reference
// =============================================
const getBooking = async (req, res) => {
  try {
    const { bookingReference } = req.params;

    const booking = await SeatBooking.findOne({ bookingReference })
      .populate('eventId', 'name startTime endTime location city')
      .populate('userId', 'name email')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error('getBooking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// GET /api/seats/my-bookings/:userId
// Get all bookings for a user
// =============================================
const getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await SeatBooking.find({ userId })
      .populate('eventId', 'name startTime endTime location city image')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('getUserBookings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// POST /api/seats/checkin
// Check in attendee by booking reference QR scan
// =============================================
const checkInByQR = async (req, res) => {
  try {
    const { bookingReference, eventId } = req.body;

    const booking = await SeatBooking.findOne({
      bookingReference,
      eventId,
      status: 'confirmed',
    }).populate('userId', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        type: 'invalid',
        message: 'Invalid booking reference or wrong event',
      });
    }

    if (booking.checkedIn) {
      return res.status(409).json({
        success: false,
        type: 'already_checked_in',
        message: 'Already checked in',
        checkedInAt: booking.checkedInAt,
        attendee: {
          name: booking.userId.name,
          email: booking.userId.email,
          seats: booking.seats.map((s) => s.seatId).join(', '),
          ticketType: booking.ticketType,
        },
      });
    }

    // Mark as checked in
    booking.checkedIn = true;
    booking.checkedInAt = new Date();
    await booking.save();

    // Update seat status
    await Seat.updateMany(
      {
        eventId,
        seatId: { $in: booking.seats.map((s) => s.seatId) },
      },
      { $set: { status: 'booked' } }
    );

    res.status(200).json({
      success: true,
      type: 'success',
      message: 'Check-in successful!',
      attendee: {
        name: booking.userId.name,
        email: booking.userId.email,
        seats: booking.seats.map((s) => s.seatId).join(', '),
        section: booking.seats[0]?.section,
        ticketType: booking.ticketType,
        bookingReference,
      },
    });
  } catch (error) {
    console.error('checkInByQR error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// PATCH /api/seats/block
// Admin: Block specific seats
// =============================================
const blockSeats = async (req, res) => {
  try {
    const { eventId, seatIds } = req.body;

    await Seat.updateMany(
      { eventId, seatId: { $in: seatIds }, status: 'available' },
      { $set: { status: 'blocked' } }
    );

    res.status(200).json({
      success: true,
      message: `${seatIds.length} seat(s) blocked successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// GET /api/seats/stats/:eventId
// Admin: Get seat stats for an event
// =============================================
const getSeatStats = async (req, res) => {
  try {
    const { eventId } = req.params;

    await seatAllocationService.releaseExpiredHolds();

    const seats = await Seat.find({ eventId }).lean();

    const stats = {
      total: seats.length,
      available: seats.filter((s) => s.status === 'available').length,
      held: seats.filter((s) => s.status === 'held').length,
      booked: seats.filter((s) => s.status === 'booked').length,
      blocked: seats.filter((s) => s.status === 'blocked').length,
      occupancyRate:
        seats.length > 0
          ? Math.round(
              (seats.filter((s) => s.status === 'booked').length / seats.length) *
                100
            )
          : 0,
      revenue: seats
        .filter((s) => s.status === 'booked')
        .reduce((sum, s) => sum + s.price, 0),
      bySection: ['VIP', 'Premium', 'Regular'].map((section) => ({
        section,
        total: seats.filter((s) => s.section === section).length,
        available: seats.filter(
          (s) => s.section === section && s.status === 'available'
        ).length,
        booked: seats.filter(
          (s) => s.section === section && s.status === 'booked'
        ).length,
        revenue: seats
          .filter((s) => s.section === section && s.status === 'booked')
          .reduce((sum, s) => sum + s.price, 0),
      })),
    };

    res.status(200).json({ success: true, eventId, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSeats,
  generateLayout,
  smartAllocate,
  holdSeats,
  confirmBooking,
  releaseSeats,
  getBooking,
  getUserBookings,
  checkInByQR,
  blockSeats,
  getSeatStats,
};
