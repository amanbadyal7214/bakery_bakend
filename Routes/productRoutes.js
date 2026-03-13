const express = require('express');
const router = express.Router();
const controller = require('../Controllers/productController');

// GET /api/products - list with optional query filters, search, pagination
router.get('/', controller.listProducts);

// GET /api/products/:id
router.get('/:id', controller.getProduct);

// POST /api/products
router.post('/', controller.createProduct);

// PUT /api/products/:id
router.put('/:id', controller.updateProduct);

// DELETE /api/products/:id
router.delete('/:id', controller.deleteProduct);

module.exports = router;
