const express = require('express');
const router = express.Router();
const flavorController = require('../Controllers/flavorController');

const authMiddleware = require('../Middleware/authMiddleware');

router.post('/', authMiddleware(), flavorController.createFlavor);
router.get('/', flavorController.getFlavors);
router.get('/:id', flavorController.getFlavor);
router.put('/:id', authMiddleware(), flavorController.updateFlavor);
router.delete('/:id', authMiddleware(), flavorController.deleteFlavor);

module.exports = router;
