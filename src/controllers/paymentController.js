const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET,
});

exports.createOrder = async (req, res, next) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    const options = {
      amount: Math.round(amount), // amount in paise
      currency,
      receipt: receipt,
      notes: notes,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      key: process.env.RAZORPAY_API_KEY,
    });
  } catch (err) {
    // Handle Razorpay SDK normalized errors: { statusCode, error }
    if (err && err.statusCode && err.error) {
      return res.status(err.statusCode).json({
        message: err.error.description || 'Payment order creation failed',
      });
    }

    // Handle Razorpay SDK bug when err.response is undefined in normalizeError
    if (
      err &&
      typeof err.message === 'string' &&
      err.message.includes("Cannot read properties of undefined (reading 'status')")
    ) {
      return res.status(503).json({
        message: 'Payment gateway is currently unreachable. Please try again later.',
      });
    }

    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing Razorpay payment details' });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_API_SECRET || '')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // For now we just acknowledge success; booking/ticket creation is still handled in frontend flow
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
