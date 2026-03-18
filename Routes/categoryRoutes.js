const express = require('express');
const router = express.Router();
const controller = require('../Controllers/categoryController');

const authMiddleware = require('../Middleware/authMiddleware');

router.get('/', controller.listCategories);
router.get('/:id', controller.getCategory);
router.post('/', authMiddleware(), controller.createCategory);
router.put('/:id', authMiddleware(), controller.updateCategory);
router.delete('/:id', authMiddleware(), controller.deleteCategory);

module.exports = router;
