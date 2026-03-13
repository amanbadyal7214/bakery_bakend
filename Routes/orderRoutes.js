const express = require('express');
const router = express.Router();
const controller = require('../Controllers/orderController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// POST /api/orders
router.post('/', upload.single('image'), controller.createOrder);

// GET /api/orders
router.get('/', controller.listOrders);

// GET /api/orders/:id
router.get('/:id', controller.getOrder);

// DELETE /api/orders/:id
router.delete('/:id', controller.deleteOrder);

module.exports = router;
