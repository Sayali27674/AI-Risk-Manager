const prisma = require('../models/prisma');

// Create a new transaction
const createTransaction = async (transactionData) => {
    try {
        const transaction = await prisma.transaction.create({
            data: transactionData,
        });
        return transaction;
    } catch (error) {
        throw new Error('Error creating transaction: ' + error.message);
    }
};

// Get all transactions
const getAllTransactions = async () => {
    try {
        const transactions = await prisma.transaction.findMany();
        return transactions;
    } catch (error) {
        throw new Error('Error fetching transactions: ' + error.message);
    }
};

// Get a transaction by ID
const getTransactionById = async (id) => {
    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id: id },
        });
        return transaction;
    } catch (error) {
        throw new Error('Error fetching transaction: ' + error.message);
    }
};

// Update a transaction
const updateTransaction = async (id, transactionData) => {
    try {
        const updatedTransaction = await prisma.transaction.update({
            where: { id: id },
            data: transactionData,
        });
        return updatedTransaction;
    } catch (error) {
        throw new Error('Error updating transaction: ' + error.message);
    }
};

// Delete a transaction
const deleteTransaction = async (id) => {
    try {
        await prisma.transaction.delete({
            where: { id: id },
        });
        return { message: 'Transaction deleted successfully' };
    } catch (error) {
        throw new Error('Error deleting transaction: ' + error.message);
    }
};

module.exports = {
    createTransaction,
    getAllTransactions,
    getTransactionById,
    updateTransaction,
    deleteTransaction,
};