const express = require('express');
const router = express.Router();
const weightController = require('../Controllers/weightController');

router.post('/', weightController.createWeight);
router.get('/', weightController.getWeights);
router.get('/:id', weightController.getWeight);
router.put('/:id', weightController.updateWeight);
router.delete('/:id', weightController.deleteWeight);

module.exports = router;
