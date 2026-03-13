const express = require('express');
const router = express.Router();
const shapeController = require('../Controllers/shapeController');

router.post('/', shapeController.createShape);
router.get('/', shapeController.getShapes);
router.get('/:id', shapeController.getShape);
router.put('/:id', shapeController.updateShape);
router.delete('/:id', shapeController.deleteShape);

module.exports = router;
