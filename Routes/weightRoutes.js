const express = require('express');
const router = express.Router();
const weightController = require('../Controllers/weightController');

const authMiddleware = require('../Middleware/authMiddleware');

router.post('/', authMiddleware(), weightController.createWeight);
router.get('/', weightController.getWeights);
router.get('/:id', weightController.getWeight);
router.put('/:id', authMiddleware(), weightController.updateWeight);
router.delete('/:id', authMiddleware(), weightController.deleteWeight);

module.exports = router;
