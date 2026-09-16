const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const { PORT, CLIENT_URL, UPLOAD_DIR } = require('./config');

// Services that need Socket.io
const notificationService = require('./services/notificationService');
const assignmentEngine = require('./services/assignmentEngine');
const paymentService = require('./services/paymentService');
const bookingRoutes = require('./routes/booking.routes');
const messageRoutes = require('./routes/message.routes');

const app = express();
const server = http.createServer(app);

// Socket.io initialization
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

// Inject Socket.io into services
notificationService.setSocketIo(io);
assignmentEngine.setSocketIo(io);
paymentService.setSocketIo(io);
bookingRoutes.setSocketIo(io);
messageRoutes.setSocketIo(io);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (before/after photos, KYC docs, invoices)
app.use('/uploads', express.static(UPLOAD_DIR));

// Rate limiting for public auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/auth', authLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Sahaayak API', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/services', require('./routes/service.routes'));
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/workers', require('./routes/worker.routes'));
app.use('/api/bookings', bookingRoutes.router);
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/complaints', require('./routes/complaint.routes'));
app.use('/api/messages', messageRoutes.router);
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/reports', require('./routes/report.routes'));

// Global 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Unhandled Error]:', err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Socket.io Real-time event rooms
io.on('connection', (socket) => {
  // Join personal user room for private notifications & job alerts
  socket.on('join:user', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });

  // Join booking room for live chat & tracking
  socket.on('join:booking', (bookingId) => {
    if (bookingId) {
      socket.join(`booking_${bookingId}`);
    }
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` 🚀 SAHAAYAK BACKEND SERVER ONLINE ON PORT ${PORT}`);
  console.log(` 🌐 Health: http://localhost:${PORT}/api/health`);
  console.log(` 🔑 Demo Accounts: http://localhost:${PORT}/api/auth/demo-accounts`);
  console.log(`====================================================`);
});
