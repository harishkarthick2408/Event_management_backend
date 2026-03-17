const Feedback = require('../models/Feedback');

exports.createFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.create(req.body);
    res.status(201).json(feedback);
  } catch (err) {
    next(err);
  }
};

exports.getFeedbackByEvent = async (req, res, next) => {
  try {
    const feedback = await Feedback.find({ event: req.params.eventId });
    res.json(feedback);
  } catch (err) {
    next(err);
  }
};
