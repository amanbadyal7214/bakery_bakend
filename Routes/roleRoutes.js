const express = require('express');
const router = express.Router();
const roleController = require('../Controllers/roleController');
const authMiddleware = require('../Middleware/authMiddleware');

// Only superadmin can manage roles
router.get('/', authMiddleware('superadmin'), roleController.list);
router.get('/:id', authMiddleware('superadmin'), roleController.getById);
router.post('/', authMiddleware('superadmin'), roleController.create);
router.patch('/:id', authMiddleware('superadmin'), roleController.update);
router.delete('/:id', authMiddleware('superadmin'), roleController.delete);
router.post('/:id/permissions', authMiddleware('superadmin'), roleController.addPermissions);
router.delete('/:id/permissions', authMiddleware('superadmin'), roleController.removePermissions);

module.exports = router;
