const express = require('express');
const router = express.Router();
const customerController = require('../Controllers/customerController');
const authMiddleware = require('../Middleware/authMiddleware');

router.post('/send-otp', customerController.sendOtp);
router.post('/register', customerController.register);
router.post('/login', customerController.login);
router.post('/send-reset-otp', customerController.sendResetOtp);
router.post('/verify-reset-otp', customerController.verifyResetOtp);
router.post('/reset-password', customerController.resetPassword);
router.get('/me', authMiddleware(), customerController.me);
router.get('/', authMiddleware(), customerController.getAllCustomers);

module.exports = router;
