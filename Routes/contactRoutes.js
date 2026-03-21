const express = require('express');
const router = express.Router();
const contactController = require('../Controllers/contactController');
const authMiddleware = require('../Middleware/authMiddleware');

// Public: create contact message
router.post('/', contactController.create);

// Admin: list, mark read, delete
// Require authentication but not a specific role for listing (allow any authenticated admin user)
router.get('/', authMiddleware(), contactController.list);
router.post('/:id/read', authMiddleware('admin'), contactController.markRead);
router.delete('/:id', authMiddleware('admin'), contactController.delete);

module.exports = router;
