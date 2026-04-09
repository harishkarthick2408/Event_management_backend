const Feedback = require('../models/Feedback');

exports.createFeedback = async (req, res, next) => {
  try {
    const {
      event,
      rating,
      comments,
      attendeeName,
      attendeeEmail,
      name,
      ratings,
      comment,
    } = req.body;

    const payload = { event };

    // Support detailed ratings shape from frontend (ratings.overall, etc.)
    if (ratings && typeof ratings === 'object') {
      if (typeof ratings.overall === 'number') payload.overallRating = ratings.overall;
      if (typeof ratings.venue === 'number') payload.venueRating = ratings.venue;
      if (typeof ratings.content === 'number') payload.contentRating = ratings.content;
      if (typeof ratings.organization === 'number') payload.organizationRating = ratings.organization;
      if (typeof ratings.speakers === 'number') payload.speakerRating = ratings.speakers;
    }

    // Backwards compatibility for simple rating/comments payloads
    if (typeof rating === 'number' && payload.overallRating == null) {
      payload.overallRating = rating;
    }
    if ((comments || comment) && !payload.comment) {
      payload.comment = comments || comment;
    }

    // Attach attendee identity if provided
    if (attendeeName || name) {
      payload.attendeeName = attendeeName || name;
    }
    if (attendeeEmail) {
      payload.attendeeEmail = attendeeEmail;
    }

    const feedback = await Feedback.create(payload);
    res.status(201).json(feedback);
  } catch (err) {
    next(err);
  }
};

exports.getFeedbackByEvent = async (req, res, next) => {
  try {
    const feedback = await Feedback.find({ event: req.params.eventId }).sort({ createdAt: -1 });
    res.json(feedback);
  } catch (err) {
    next(err);
  }
};

// Optional: aggregate basic stats server-side if needed later
exports.getFeedbackSummaryByEvent = async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    const feedback = await Feedback.find({ event: eventId });

    const totalReviews = feedback.length;
    const avgField = (key) => {
      if (!totalReviews) return 0;
      const sum = feedback.reduce((acc, f) => acc + (f[key] || 0), 0);
      return totalReviews ? sum / totalReviews : 0;
    };

    const overallAvg = avgField('overallRating');

    const ratingDist = [5, 4, 3, 2, 1].map((stars) => {
      const count = feedback.filter((f) => f.overallRating === stars).length;
      return {
        stars,
        count,
        pct: totalReviews ? Math.round((count / totalReviews) * 100) : 0,
      };
    });

    const positive = feedback.filter((f) => f.overallRating >= 4).length;
    const neutral = feedback.filter((f) => f.overallRating === 3).length;
    const negative = feedback.filter((f) => f.overallRating <= 2).length;

    res.json({
      totalReviews,
      averages: {
        overallRating: overallAvg,
        venueRating: avgField('venueRating'),
        contentRating: avgField('contentRating'),
        organizationRating: avgField('organizationRating'),
        speakerRating: avgField('speakerRating'),
      },
      ratingDist,
      sentiment: {
        positive,
        neutral,
        negative,
      },
    });
  } catch (err) {
    next(err);
  }
};
