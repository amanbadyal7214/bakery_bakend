const express = require('express');
const router = express.Router();
const controller = require('../Controllers/ingredientDetailController');

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.get);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
