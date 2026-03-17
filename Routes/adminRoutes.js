const express = require('express');
const router = express.Router();
const adminController = require('../Controllers/adminController');
const authMiddleware = require('../Middleware/authMiddleware');

// Only superadmin can manage admins
router.get('/', authMiddleware('superadmin'), adminController.list);
router.post('/', authMiddleware('superadmin'), adminController.create);
router.delete('/:id', authMiddleware('superadmin'), adminController.delete);

module.exports = router;
