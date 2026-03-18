const express = require('express');
const router = express.Router();
const shapeController = require('../Controllers/shapeController');

const authMiddleware = require('../Middleware/authMiddleware');

router.post('/', authMiddleware(), shapeController.createShape);
router.get('/', shapeController.getShapes);
router.get('/:id', shapeController.getShape);
router.put('/:id', authMiddleware(), shapeController.updateShape);
router.delete('/:id', authMiddleware(), shapeController.deleteShape);

module.exports = router;
