const express = require('express');
const router = express.Router();
const typeController = require('../Controllers/typeController');

router.post('/', typeController.createType);
router.get('/', typeController.getTypes);
router.get('/:id', typeController.getType);
router.put('/:id', typeController.updateType);
router.delete('/:id', typeController.deleteType);

module.exports = router;
