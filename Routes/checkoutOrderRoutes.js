const express = require('express');
const router = express.Router();
const authMiddleware = require('../Middleware/authMiddleware');
const checkoutOrderController = require('../Controllers/checkoutOrderController');

router.get('/', authMiddleware(), checkoutOrderController.listAllOrders);
router.post('/', authMiddleware(), checkoutOrderController.placeOrder);
router.get('/my', authMiddleware(), checkoutOrderController.listMyOrders);
router.patch('/:orderId/status', authMiddleware(), checkoutOrderController.updateOrderStatus);

module.exports = router;