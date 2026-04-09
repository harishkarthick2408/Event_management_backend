const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect payment routes so only logged-in users can create/verify orders
router.post('/order', authMiddleware, createOrder);
router.post('/verify', authMiddleware, verifyPayment);

module.exports = router;
