const { body } = require('express-validator');

const transactionValidators = [
    body('amount')
        .isNumeric()
        .withMessage('Amount must be a number.')
        .notEmpty()
        .withMessage('Amount is required.'),
    body('description')
        .isString()
        .withMessage('Description must be a string.')
        .notEmpty()
        .withMessage('Description is required.'),
    body('vendorId')
        .isUUID()
        .withMessage('Vendor ID must be a valid UUID.')
        .notEmpty()
        .withMessage('Vendor ID is required.'),
    body('date')
        .isISO8601()
        .withMessage('Date must be a valid date.')
        .notEmpty()
        .withMessage('Date is required.'),
];

module.exports = transactionValidators;