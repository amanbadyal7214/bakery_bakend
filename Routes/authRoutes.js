const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const authMiddleware = require('../Middleware/authMiddleware');

router.post('/login', authController.login);
router.get('/me', authMiddleware(), authController.me);

// example protected route for super admins only
router.get('/super-only', authMiddleware('superadmin'), (req, res) => {
  res.json({ ok: true, message: 'Super admin area', user: req.user });
});

module.exports = router;
