const alertService = require('../services/alertService');
const socketService = require('../services/socketService');
const prisma = require('../models/prisma');

// ── Helper ────────────────────────────────────────────────────────────────────

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ── Controllers ───────────────────────────────────────────────────────────────

// Create a new alert
exports.createAlert = async (req, res) => {
  try {
    const alertData = req.body;
    const newAlert = await alertService.createAlert(alertData);
    res.status(201).json({ success: true, data: newAlert });
  } catch (error) {
    res.status(500).json({ message: 'Error creating alert', error: error.message });
  }
};

// Get all alerts — with optional filters (severity, status, page, limit)
exports.getAllAlerts = async (req, res) => {
  try {
    const { severity, status, page = 1, limit = 50 } = req.query;
    const take = Math.min(Number(limit) || 50, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where = {
      ...(severity ? { severity } : {}),
      ...(status ? { status } : {}),
    };

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          transaction: {
            select: {
              id: true,
              amount: true,
              currency: true,
              timestamp: true,
              vendor: { select: { id: true, name: true } },
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.alert.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: alerts,
      pagination: { page: Number(page), limit: take, total },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alerts', error: error.message });
  }
};

// Get alert by ID
exports.getAlertById = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid alert ID' });

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        transaction: {
          select: {
            id: true,
            amount: true,
            currency: true,
            timestamp: true,
            vendor: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alert', error: error.message });
  }
};

// Update alert status  — emits real-time Socket.IO events after DB write
exports.updateAlert = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid alert ID' });

    const existingAlert = await prisma.alert.findUnique({ where: { id } });
    if (!existingAlert) return res.status(404).json({ message: 'Alert not found' });

    const updatedAlert = await alertService.updateAlert(id, req.body);

    const newStatus = updatedAlert.status;
    const actorId = req.user?.id;

    // Emit the appropriate real-time event AFTER the DB write succeeds
    if (newStatus === 'RESOLVED') {
      socketService.emitAlertResolved({
        alertId: updatedAlert.id,
        transactionId: updatedAlert.transactionId,
        resolvedByUserId: actorId,
      });
    } else if (newStatus === 'DISMISSED') {
      socketService.emitAlertDismissed({
        alertId: updatedAlert.id,
        transactionId: updatedAlert.transactionId,
        dismissedByUserId: actorId,
      });
    } else {
      // INVESTIGATING, OPEN, or any other status
      socketService.emitAlertStatusUpdated({
        alertId: updatedAlert.id,
        transactionId: updatedAlert.transactionId,
        newStatus,
        updatedByUserId: actorId,
      });
    }

    res.status(200).json({ success: true, data: updatedAlert });
  } catch (error) {
    res.status(500).json({ message: 'Error updating alert', error: error.message });
  }
};

// Update alert status via a dedicated endpoint (PATCH /:id/status)
exports.updateAlertStatus = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid alert ID' });

    const { status } = req.body;
    const validStatuses = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Alert not found' });

    const updated = await alertService.updateAlert(id, { status });
    const actorId = req.user?.id;

    if (status === 'RESOLVED') {
      socketService.emitAlertResolved({
        alertId: updated.id,
        transactionId: updated.transactionId,
        resolvedByUserId: actorId,
      });
    } else if (status === 'DISMISSED') {
      socketService.emitAlertDismissed({
        alertId: updated.id,
        transactionId: updated.transactionId,
        dismissedByUserId: actorId,
      });
    } else {
      socketService.emitAlertStatusUpdated({
        alertId: updated.id,
        transactionId: updated.transactionId,
        newStatus: status,
        updatedByUserId: actorId,
      });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete an alert
exports.deleteAlert = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid alert ID' });

    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Alert not found' });

    await alertService.deleteAlert(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting alert', error: error.message });
  }
};