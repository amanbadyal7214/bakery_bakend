const express = require('express');
const router = express.Router();
const eventController = require('../Controllers/eventController');
const authMiddleware = require('../Middleware/authMiddleware');

// Public route to get active event
router.get('/active', eventController.getActiveEvent);

// Admin-only routes (using 'admin' role which also allows 'superadmin' per middleware logic)
router.get('/', authMiddleware('admin'), eventController.getEvents);
router.post('/', authMiddleware('admin'), eventController.createEvent);
router.put('/:id', authMiddleware('admin'), eventController.updateEvent);
router.delete('/:id', authMiddleware('admin'), eventController.deleteEvent);
router.patch('/:id/toggle-active', authMiddleware('admin'), eventController.toggleActive);

module.exports = router;
