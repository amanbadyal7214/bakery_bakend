const express = require('express');
const router = express.Router();
const valuesController = require('../Controllers/valuesController');
const authMiddleware = require('../Middleware/authMiddleware');

// Public GET - fetch values
router.get('/', valuesController.getValues);

// Protected PUT - update values (superadmin only)
router.put('/', authMiddleware('superadmin'), valuesController.updateValues);

module.exports = router;
