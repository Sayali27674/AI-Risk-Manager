/**
 * socketService.js
 *
 * Centralized Socket.IO event service.
 * Holds the io instance and exposes typed emit helpers so no other file
 * needs to import or manipulate socket.io directly.
 *
 * Rooms used:
 *   role:ADMIN    — all connected ADMIN users
 *   role:ANALYST  — all connected ANALYST users
 *   user:<id>     — a single specific user (future use)
 */

let _io = null;

/**
 * Called once at startup (from server.js) with the Socket.IO server instance.
 */
function init(io) {
  _io = io;
}

/**
 * Returns the Socket.IO server instance (throws if init() not yet called).
 */
function io() {
  if (!_io) throw new Error('Socket.IO has not been initialised yet');
  return _io;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Emit an event to every room that should receive risk-management alerts
 * (i.e. ADMIN and ANALYST users).
 */
function emitToRiskRooms(event, payload) {
  if (!_io) return; // Socket.IO not yet started — silently skip
  _io.to('role:ADMIN').to('role:ANALYST').emit(event, payload);
  if (payload?.userId) {
    _io.to(`user:${payload.userId}`).emit(event, payload);
  }
}

// ── Public emit helpers ───────────────────────────────────────────────────────

/**
 * Emit a new HIGH/CRITICAL risk alert.
 *
 * @param {object} params
 * @param {number} params.alertId
 * @param {number} params.transactionId
 * @param {string} params.severity        e.g. "HIGH" | "CRITICAL"
 * @param {string} params.riskLevel       same value as severity
 * @param {number} params.riskScore
 * @param {string} params.message
 */
function emitRiskAlert({ alertId, transactionId, severity, riskLevel, riskScore, message, userId }) {
  emitToRiskRooms('risk:alert', {
    alertId,
    transactionId,
    severity,
    riskLevel,
    riskScore,
    message,
    userId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit when an existing transaction's risk is recalculated.
 *
 * @param {object} params
 * @param {number} params.transactionId
 * @param {string} params.previousRiskLevel
 * @param {string} params.newRiskLevel
 * @param {number} params.newRiskScore
 */
function emitRiskUpdated({ transactionId, previousRiskLevel, newRiskLevel, newRiskScore, userId }) {
  emitToRiskRooms('risk:updated', {
    transactionId,
    previousRiskLevel,
    newRiskLevel,
    newRiskScore,
    userId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit when an alert is resolved.
 *
 * @param {object} params
 * @param {number} params.alertId
 * @param {number} params.transactionId
 * @param {number} params.resolvedByUserId
 */
function emitAlertResolved({ alertId, transactionId, resolvedByUserId }) {
  emitToRiskRooms('alert:resolved', {
    alertId,
    transactionId,
    resolvedByUserId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit when an alert is dismissed.
 *
 * @param {object} params
 * @param {number} params.alertId
 * @param {number} params.transactionId
 * @param {number} params.dismissedByUserId
 */
function emitAlertDismissed({ alertId, transactionId, dismissedByUserId }) {
  emitToRiskRooms('alert:dismissed', {
    alertId,
    transactionId,
    dismissedByUserId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit a generic alert status update (used for INVESTIGATING etc.).
 *
 * @param {object} params
 * @param {number} params.alertId
 * @param {number} params.transactionId
 * @param {string} params.newStatus
 * @param {number} params.updatedByUserId
 */
function emitAlertStatusUpdated({ alertId, transactionId, newStatus, updatedByUserId }) {
  emitToRiskRooms('alert:status_updated', {
    alertId,
    transactionId,
    newStatus,
    updatedByUserId,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  init,
  io,
  emitRiskAlert,
  emitRiskUpdated,
  emitAlertResolved,
  emitAlertDismissed,
  emitAlertStatusUpdated,
};
