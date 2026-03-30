const express = require('express');
const router = express.Router();
const authMiddleware = require('../Middleware/authMiddleware');
const checkoutOrderController = require('../Controllers/checkoutOrderController');

router.post('/', authMiddleware(), checkoutOrderController.placeOrder);
router.get('/my', authMiddleware(), checkoutOrderController.listMyOrders);

module.exports = router;