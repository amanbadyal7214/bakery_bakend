const express = require('express');
const router = express.Router();
const themeController = require('../Controllers/themeController');

const authMiddleware = require('../Middleware/authMiddleware');

router.post('/', authMiddleware(), themeController.createTheme);
router.get('/', themeController.getThemes);
router.get('/:id', themeController.getTheme);
router.put('/:id', authMiddleware(), themeController.updateTheme);
router.delete('/:id', authMiddleware(), themeController.deleteTheme);

module.exports = router;
