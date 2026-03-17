const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, ticketController.createTicket);
router.get('/event/:eventId', authMiddleware, ticketController.getTicketsByEvent);

module.exports = router;
