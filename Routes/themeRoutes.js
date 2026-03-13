const express = require('express');
const router = express.Router();
const themeController = require('../Controllers/themeController');

router.post('/', themeController.createTheme);
router.get('/', themeController.getThemes);
router.get('/:id', themeController.getTheme);
router.put('/:id', themeController.updateTheme);
router.delete('/:id', themeController.deleteTheme);

module.exports = router;
