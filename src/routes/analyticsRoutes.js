const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const authMiddleware = require('../middlewares/authMiddleware');

// Get overall dashboard analytics
router.get('/overview', authMiddleware, async (req, res, next) => {
  try {
    const stats = await analyticsService.getOverviewStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// Get basic analytics for a given event
router.get('/event/:eventId', authMiddleware, async (req, res, next) => {
  try {
    const stats = await analyticsService.getEventStats(req.params.eventId);
    if (!stats.event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
