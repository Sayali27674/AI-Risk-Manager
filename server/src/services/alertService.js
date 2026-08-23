const prisma = require('../models/prisma');

// Create a new alert
const createAlert = async (alertData) => {
    try {
        const alert = await prisma.alert.create({
            data: alertData,
        });
        return alert;
    } catch (error) {
        throw new Error('Error creating alert: ' + error.message);
    }
};

// Get all alerts
const getAllAlerts = async () => {
    try {
        const alerts = await prisma.alert.findMany();
        return alerts;
    } catch (error) {
        throw new Error('Error fetching alerts: ' + error.message);
    }
};

// Get alert by ID
const getAlertById = async (id) => {
    try {
        const alert = await prisma.alert.findUnique({
            where: { id: id },
        });
        return alert;
    } catch (error) {
        throw new Error('Error fetching alert: ' + error.message);
    }
};

// Update an alert
const updateAlert = async (id, alertData) => {
    try {
        const alert = await prisma.alert.update({
            where: { id: id },
            data: alertData,
        });
        return alert;
    } catch (error) {
        throw new Error('Error updating alert: ' + error.message);
    }
};

// Delete an alert
const deleteAlert = async (id) => {
    try {
        await prisma.alert.delete({
            where: { id: id },
        });
        return { message: 'Alert deleted successfully' };
    } catch (error) {
        throw new Error('Error deleting alert: ' + error.message);
    }
};

module.exports = {
    createAlert,
    getAllAlerts,
    getAlertById,
    updateAlert,
    deleteAlert,
};