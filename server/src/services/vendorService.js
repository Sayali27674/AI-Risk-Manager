const prisma = require('../models/prisma');

// Create a new vendor
const createVendor = async (vendorData) => {
    try {
        const vendor = await prisma.vendor.create({
            data: vendorData,
        });
        return vendor;
    } catch (error) {
        throw new Error('Error creating vendor: ' + error.message);
    }
};

// Get all vendors
const getAllVendors = async () => {
    try {
        const vendors = await prisma.vendor.findMany();
        return vendors;
    } catch (error) {
        throw new Error('Error fetching vendors: ' + error.message);
    }
};

// Get a vendor by ID
const getVendorById = async (id) => {
    try {
        const vendor = await prisma.vendor.findUnique({
            where: { id: id },
        });
        return vendor;
    } catch (error) {
        throw new Error('Error fetching vendor: ' + error.message);
    }
};

// Update a vendor
const updateVendor = async (id, vendorData) => {
    try {
        const vendor = await prisma.vendor.update({
            where: { id: id },
            data: vendorData,
        });
        return vendor;
    } catch (error) {
        throw new Error('Error updating vendor: ' + error.message);
    }
};

// Delete a vendor
const deleteVendor = async (id) => {
    try {
        await prisma.vendor.delete({
            where: { id: id },
        });
        return { message: 'Vendor deleted successfully' };
    } catch (error) {
        throw new Error('Error deleting vendor: ' + error.message);
    }
};

module.exports = {
    createVendor,
    getAllVendors,
    getVendorById,
    updateVendor,
    deleteVendor,
};