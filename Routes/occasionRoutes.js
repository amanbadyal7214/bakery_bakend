const express = require('express');
const router = express.Router();
const occasionController = require('../Controllers/occasionController');

router.post('/', occasionController.createOccasion);
router.get('/', occasionController.getOccasions);
router.get('/:id', occasionController.getOccasion);
router.put('/:id', occasionController.updateOccasion);
router.delete('/:id', occasionController.deleteOccasion);

module.exports = router;
