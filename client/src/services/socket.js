/**
 * socket.js — Centralised Socket.IO client service.
 *
 * One managed connection per authenticated session.
 * Pages/contexts import { socketService } and call connect/disconnect/on/off.
 *
 * Security:
 *  - JWT is sent in handshake auth (not in URL query string).
 *  - Socket is disconnected on logout (call disconnect()).
 *  - Clients never emit reserved server events.
 */

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

/**
 * Connect (or reconnect) with a fresh JWT.
 * Safe to call multiple times — existing socket is disconnected first.
 */
function connect(token) {
  if (!token) return;

  // Tear down any stale connection first
  disconnect();

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 8000,
    timeout: 10000,
  });

  return socket;
}

/**
 * Disconnect and clean up.
 */
function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Register a listener for a Socket.IO event.
 * Returns a cleanup function.
 */
function on(event, handler) {
  if (!socket) return () => {};
  socket.on(event, handler);
  return () => socket?.off(event, handler);
}

/**
 * Remove a listener.
 */
function off(event, handler) {
  socket?.off(event, handler);
}

/**
 * Returns true when the socket is currently connected.
 */
function isConnected() {
  return socket?.connected ?? false;
}

/**
 * Returns the raw socket instance (for advanced use).
 */
function getSocket() {
  return socket;
}

export const socketService = {
  connect,
  disconnect,
  on,
  off,
  isConnected,
  getSocket,
};
