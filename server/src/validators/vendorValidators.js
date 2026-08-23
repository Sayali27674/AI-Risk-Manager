const { body } = require('express-validator');

const vendorValidators = [
    body('name')
        .notEmpty()
        .withMessage('Vendor name is required.')
        .isString()
        .withMessage('Vendor name must be a string.'),
    body('contactEmail')
        .notEmpty()
        .withMessage('Contact email is required.')
        .isEmail()
        .withMessage('Contact email must be a valid email address.'),
    body('phoneNumber')
        .optional()
        .isString()
        .withMessage('Phone number must be a string.'),
    body('address')
        .optional()
        .isString()
        .withMessage('Address must be a string.'),
];

module.exports = vendorValidators;