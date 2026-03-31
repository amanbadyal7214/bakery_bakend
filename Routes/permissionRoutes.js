const express = require('express');
const router = express.Router();
const permissionController = require('../Controllers/permissionController');
const authMiddleware = require('../Middleware/authMiddleware');

router.get('/', authMiddleware('superadmin'), permissionController.list);
router.post('/', authMiddleware('superadmin'), permissionController.create);
router.patch('/:id', authMiddleware('superadmin'), permissionController.update);
router.delete('/:id', authMiddleware('superadmin'), permissionController.remove);

module.exports = router;
