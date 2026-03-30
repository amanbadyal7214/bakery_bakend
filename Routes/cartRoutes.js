const express = require('express');
const router = express.Router();
const authMiddleware = require('../Middleware/authMiddleware');
const cartController = require('../Controllers/cartController');

router.get('/', authMiddleware(), cartController.getCart);
router.post('/items', authMiddleware(), cartController.addItem);
router.patch('/items/:productId', authMiddleware(), cartController.setItemQuantity);
router.delete('/items/:productId', authMiddleware(), cartController.removeItem);
router.delete('/', authMiddleware(), cartController.clearCart);

module.exports = router;