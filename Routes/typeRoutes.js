const express = require('express');
const router = express.Router();
const typeController = require('../Controllers/typeController');

const authMiddleware = require('../Middleware/authMiddleware');

router.post('/', authMiddleware(), typeController.createType);
router.get('/', typeController.getTypes);
router.get('/:id', typeController.getType);
router.put('/:id', authMiddleware(), typeController.updateType);
router.delete('/:id', authMiddleware(), typeController.deleteType);

module.exports = router;
