const express = require('express');
const router = express.Router();
const controller = require('../Controllers/orderController');
const multer = require('multer');
const path = require('path');

const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500KB

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: MAX_IMAGE_SIZE_BYTES } });

const authMiddleware = require('../Middleware/authMiddleware');

// POST /api/orders
router.post('/', authMiddleware(), upload.single('image'), controller.createOrder);

// GET /api/orders
router.get('/', controller.listOrders);

// GET /api/orders/:id
router.get('/:id', controller.getOrder);

// DELETE /api/orders/:id
router.delete('/:id', authMiddleware(), controller.deleteOrder);

module.exports = router;
