const express = require('express');
const router = express.Router();
const occasionController = require('../Controllers/occasionController');

const authMiddleware = require('../Middleware/authMiddleware');

router.post('/', authMiddleware(), occasionController.createOccasion);
router.get('/', occasionController.getOccasions);
router.get('/:id', occasionController.getOccasion);
router.put('/:id', authMiddleware(), occasionController.updateOccasion);
router.delete('/:id', authMiddleware(), occasionController.deleteOccasion);

module.exports = router;
