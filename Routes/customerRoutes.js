const express = require('express');
const router = express.Router();
const customerController = require('../Controllers/customerController');
const authMiddleware = require('../Middleware/authMiddleware');

router.post('/register', customerController.register);
router.post('/login', customerController.login);
router.get('/me', authMiddleware(), customerController.me);
router.get('/', authMiddleware(), customerController.getAllCustomers);

module.exports = router;
