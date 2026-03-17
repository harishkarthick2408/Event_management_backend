const jwt = require('jsonwebtoken');

// Generate a signed JWT that will be embedded into a QR code.
// For Postman testing and check-in, we use this token directly.
exports.generateQRCode = async (payload) => {
  const token = jwt.sign(payload, process.env.QR_SECRET || process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  return token;
};

// Verify the JWT token that was read from the QR code.
exports.verifyQRCode = async (token) => {
  return jwt.verify(token, process.env.QR_SECRET || process.env.JWT_SECRET);
};
