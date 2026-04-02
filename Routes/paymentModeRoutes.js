const express = require('express');
const router = express.Router();
const paymentModeController = require('../Controllers/paymentModeController');
const authMiddleware = require('../Middleware/authMiddleware');

router.post('/', authMiddleware(), paymentModeController.createPaymentMode);
router.get('/', paymentModeController.getPaymentModes);
router.get('/:id', paymentModeController.getPaymentMode);
router.put('/:id', authMiddleware(), paymentModeController.updatePaymentMode);
router.delete('/:id', authMiddleware(), paymentModeController.deletePaymentMode);

module.exports = router;
