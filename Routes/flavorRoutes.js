const express = require('express');
const router = express.Router();
const flavorController = require('../Controllers/flavorController');

router.post('/', flavorController.createFlavor);
router.get('/', flavorController.getFlavors);
router.get('/:id', flavorController.getFlavor);
router.put('/:id', flavorController.updateFlavor);
router.delete('/:id', flavorController.deleteFlavor);

module.exports = router;
