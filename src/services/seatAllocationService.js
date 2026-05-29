const Seat = require('../models/Seat');

// =============================================
// GENERATE SEAT LAYOUT FOR AN EVENT
// =============================================
const generateSeatLayout = async (eventId, config) => {
  const {
    rows = 10,
    seatsPerRow = 20,
    vipRows = 2,
    premiumRows = 3,
    prices = { VIP: 2999, Premium: 1499, Regular: 999 },
  } = config;

  const seats = [];

  for (let r = 0; r < rows; r++) {
    const rowLabel = String.fromCharCode(65 + r);
    const section =
      r < vipRows ? 'VIP' :
      r < vipRows + premiumRows ? 'Premium' : 'Regular';

    for (let s = 1; s <= seatsPerRow; s++) {
      seats.push({
        eventId,
        seatId: rowLabel + s,
        row: rowLabel,
        number: s,
        section,
        status: 'available',
        price: prices[section],
      });
    }
  }

  // Use insertMany with ordered:false to skip duplicates
  await Seat.insertMany(seats, { ordered: false }).catch((err) => {
    if (err.code !== 11000) throw err; // ignore duplicate key errors
  });

  return seats;
};

// =============================================
// RELEASE EXPIRED HOLDS
// =============================================
const releaseExpiredHolds = async () => {
  const result = await Seat.updateMany(
    {
      status: 'held',
      heldUntil: { $lt: new Date() },
    },
    {
      $set: {
        status: 'available',
        heldBy: null,
        heldUntil: null,
      },
    }
  );
  return result.modifiedCount;
};

// =============================================
// CHECK ISOLATION — would booking these seats
// leave a single isolated seat?
// =============================================
const checkIsolation = async (eventId, seatsToBook) => {
  const bookingIds = new Set(seatsToBook.map((s) => s.seatId));

  for (const seat of seatsToBook) {
    const leftId = seat.row + (seat.number - 1);
    const rightId = seat.row + (seat.number + 1);

    const [leftSeat, rightSeat] = await Promise.all([
      Seat.findOne({ eventId, seatId: leftId }),
      Seat.findOne({ eventId, seatId: rightId }),
    ]);

    const leftTaken =
      !leftSeat ||
      leftSeat.status !== 'available' ||
      bookingIds.has(leftId);

    const rightTaken =
      !rightSeat ||
      rightSeat.status !== 'available' ||
      bookingIds.has(rightId);

    if (leftTaken && rightTaken) return true;
  }
  return false;
};

// =============================================
// CORE SMART ALLOCATION ALGORITHM
// =============================================
const allocateSeats = async (eventId, quantity, preferredSection = 'Regular') => {
  // Release any expired holds first
  await releaseExpiredHolds();

  // Get all available seats in preferred section
  const available = await Seat.find({
    eventId,
    status: 'available',
    section: preferredSection,
  }).sort({ row: 1, number: 1 });

  if (available.length < quantity) {
    // Try other sections as fallback
    const fallback = await Seat.find({
      eventId,
      status: 'available',
    })
      .sort({ row: 1, number: 1 })
      .limit(quantity * 3);

    if (fallback.length < quantity) {
      return { success: false, message: 'Not enough seats available' };
    }
    return findBestGroup(fallback, quantity, eventId);
  }

  return findBestGroup(available, quantity, eventId);
};

// Find best group from available seats
const findBestGroup = async (available, quantity, eventId) => {
  // Group by row
  const byRow = {};
  available.forEach((seat) => {
    if (!byRow[seat.row]) byRow[seat.row] = [];
    byRow[seat.row].push(seat);
  });

  // PRIORITY 1: Find consecutive seats in same row
  if (quantity > 1) {
    for (const row in byRow) {
      const rowSeats = byRow[row].sort((a, b) => a.number - b.number);

      for (let i = 0; i <= rowSeats.length - quantity; i++) {
        const slice = rowSeats.slice(i, i + quantity);

        // Check consecutive
        const isConsecutive = slice.every((s, idx) =>
          idx === 0 || s.number === slice[idx - 1].number + 1
        );

        if (isConsecutive) {
          // Check isolation
          const wouldIsolate = await checkIsolation(eventId, slice);
          if (!wouldIsolate) {
            return {
              success: true,
              seats: slice,
              message: `Found ${quantity} consecutive seats in Row ${row}`,
              isConsecutive: true,
              row,
            };
          }
        }
      }
    }
  }

  // PRIORITY 2: Single seat — find best non-isolating seat
  if (quantity === 1) {
    for (const seat of available) {
      const wouldIsolate = await checkIsolation(eventId, [seat]);
      if (!wouldIsolate) {
        return {
          success: true,
          seats: [seat],
          message: `Found best seat ${seat.seatId}`,
          isConsecutive: true,
          row: seat.row,
        };
      }
    }
    return {
      success: true,
      seats: [available[0]],
      message: `Assigned seat ${available[0].seatId}`,
      isConsecutive: true,
      row: available[0].row,
    };
  }

  // PRIORITY 3: Fallback — closest proximity group
  const proximityGroup = available.slice(0, quantity);
  return {
    success: true,
    seats: proximityGroup,
    message: `Assigned ${quantity} nearest available seats` ,
    isConsecutive: false,
    row: null,
  };
};

// =============================================
// HOLD SEATS (temporary lock during booking)
// =============================================
const holdSeats = async (eventId, seatIds, userId) => {
  const holdUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Use atomic findOneAndUpdate with condition to prevent race conditions
  const results = [];

  for (const seatId of seatIds) {
    const seat = await Seat.findOneAndUpdate(
      {
        eventId,
        seatId,
        status: 'available', // Only hold if still available
      },
      {
        $set: {
          status: 'held',
          heldBy: userId,
          heldUntil: holdUntil,
        },
      },
      { new: true }
    );

    if (!seat) {
      // Seat was taken — release any seats already held in this transaction
      await Seat.updateMany(
        { eventId, seatId: { $in: results.map((s) => s.seatId) }, heldBy: userId },
        { $set: { status: 'available', heldBy: null, heldUntil: null } }
      );
      return {
        success: false,
        message: `Seat ${seatId} is no longer available`,
      };
    }
    results.push(seat);
  }

  return {
    success: true,
    seats: results,
    heldUntil: holdUntil,
    message: `${seatIds.length} seat(s) held for 5 minutes`,
  };
};

// =============================================
// CONFIRM SEATS (after successful payment)
// =============================================
const confirmSeats = async (eventId, seatIds, userId, bookingReference) => {
  await Seat.updateMany(
    {
      eventId,
      seatId: { $in: seatIds },
      heldBy: userId,
      status: 'held',
    },
    {
      $set: {
        status: 'booked',
        bookedBy: userId,
        bookingId: bookingReference,
        heldBy: null,
        heldUntil: null,
      },
    }
  );
};

// =============================================
// RELEASE HELD SEATS (on cancel/timeout)
// =============================================
const releaseSeats = async (eventId, seatIds, userId) => {
  await Seat.updateMany(
    {
      eventId,
      seatId: { $in: seatIds },
      heldBy: userId,
    },
    {
      $set: {
        status: 'available',
        heldBy: null,
        heldUntil: null,
      },
    }
  );
};

module.exports = {
  generateSeatLayout,
  allocateSeats,
  holdSeats,
  confirmSeats,
  releaseSeats,
  releaseExpiredHolds,
  checkIsolation,
};
