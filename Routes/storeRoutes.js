const express = require('express');
const router = express.Router();
const storeController = require('../Controllers/storeController');
const authMiddleware = require('../Middleware/authMiddleware');

// Public GET - returns store profile
router.get('/', storeController.getProfile);

// Protected PUT - update profile (superadmin only)
router.put('/', authMiddleware('superadmin'), storeController.updateProfile);

module.exports = router;
