/**
 * socketHandler.js
 *
 * Registers Socket.IO middleware and connection logic.
 * Called once from server.js after Socket.IO is initialised.
 *
 * Security guarantees:
 *  - JWT verified server-side on every connection (handshake auth).
 *  - role / userId are extracted from the verified token only.
 *  - Users are placed into role-based rooms server-side.
 *  - Clients cannot join rooms themselves.
 *  - Unauthenticated connections are rejected immediately.
 */

const jwt = require('jsonwebtoken');

function registerSocketHandlers(io) {
  // ── Authentication middleware ─────────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);

      // Attach verified identity — never trust client-supplied role/id
      socket.user = {
        id: Number(payload.sub),
        role: payload.role,
      };

      return next();
    } catch {
      return next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;

    // Join role room — used for broadcasting risk alerts to ADMIN/ANALYST
    socket.join(`role:${role}`);

    // Join user-specific room — for future targeted notifications
    socket.join(`user:${userId}`);

    // Prevent clients from emitting trusted server events
    socket.onAny((event) => {
      const reserved = [
        'risk:alert',
        'risk:updated',
        'alert:resolved',
        'alert:dismissed',
        'alert:status_updated',
      ];
      if (reserved.includes(event)) {
        // Silently ignore — clients must never be able to spoof server events
        socket.disconnect(true);
      }
    });

    socket.on('disconnect', () => {
      // Clean-up is automatic — Socket.IO removes the socket from all rooms
    });
  });
}

module.exports = { registerSocketHandlers };
