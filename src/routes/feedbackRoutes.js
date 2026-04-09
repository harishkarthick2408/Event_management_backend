const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');

router.post('/', feedbackController.createFeedback);
router.get('/event/:eventId', feedbackController.getFeedbackByEvent);
router.get('/event/:eventId/summary', feedbackController.getFeedbackSummaryByEvent);

module.exports = router;
