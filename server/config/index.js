const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'sahaayak_super_secure_jwt_secret_key_2026_dev',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DEMO_MODE: process.env.DEMO_MODE !== 'false',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo_sahaayak',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'demo_secret_key_123',
  UPLOAD_DIR: path.join(__dirname, '..', 'uploads')
};
