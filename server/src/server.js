require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const { PORT } = require('./config/env');
const socketService = require('./services/socketService');
const { registerSocketHandlers } = require('./services/socketHandler');

const port = Number(PORT) || 5000;

// Create a plain HTTP server wrapping the Express app
const httpServer = http.createServer(app);

// Attach Socket.IO to the HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Graceful disconnection timeout (ms)
  pingTimeout: 20000,
  pingInterval: 25000,
});

// Make the io instance available to the rest of the backend through socketService
socketService.init(io);

// Register JWT auth middleware and room-join logic
registerSocketHandlers(io);

// Start listening — now serves both REST and WebSocket on the same port
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Server (REST + Socket.IO) running on http://localhost:${port}`);
});

module.exports = app;