const Alert = require('../models/prisma').Alert;
const alertService = require('../services/alertService');

// Create a new alert
exports.createAlert = async (req, res) => {
    try {
        const alertData = req.body;
        const newAlert = await alertService.createAlert(alertData);
        res.status(201).json(newAlert);
    } catch (error) {
        res.status(500).json({ message: 'Error creating alert', error: error.message });
    }
};

// Get all alerts
exports.getAllAlerts = async (req, res) => {
    try {
        const alerts = await alertService.getAllAlerts();
        res.status(200).json(alerts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching alerts', error: error.message });
    }
};

// Get alert by ID
exports.getAlertById = async (req, res) => {
    try {
        const alertId = req.params.id;
        const alert = await alertService.getAlertById(alertId);
        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }
        res.status(200).json(alert);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching alert', error: error.message });
    }
};

// Update an alert
exports.updateAlert = async (req, res) => {
    try {
        const alertId = req.params.id;
        const updatedData = req.body;
        const updatedAlert = await alertService.updateAlert(alertId, updatedData);
        if (!updatedAlert) {
            return res.status(404).json({ message: 'Alert not found' });
        }
        res.status(200).json(updatedAlert);
    } catch (error) {
        res.status(500).json({ message: 'Error updating alert', error: error.message });
    }
};

// Delete an alert
exports.deleteAlert = async (req, res) => {
    try {
        const alertId = req.params.id;
        const deletedAlert = await alertService.deleteAlert(alertId);
        if (!deletedAlert) {
            return res.status(404).json({ message: 'Alert not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting alert', error: error.message });
    }
};