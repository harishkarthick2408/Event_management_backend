const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');

router.post('/', feedbackController.createFeedback);
router.get('/event/:eventId', feedbackController.getFeedbackByEvent);

module.exports = router;
