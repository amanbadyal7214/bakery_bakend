const express = require('express');
const router = express.Router();
const originStoryController = require('../Controllers/originStoryController');
const authMiddleware = require('../Middleware/authMiddleware');

// Public GET - fetch origin story
router.get('/', originStoryController.getStory);

// Protected PUT - update origin story (superadmin only)
router.put('/', authMiddleware('superadmin'), originStoryController.updateStory);

module.exports = router;
