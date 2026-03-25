const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const teamController = require('../Controllers/teamController');
const authMiddleware = require('../Middleware/authMiddleware');

// multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, safeName);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB limit

// Public list
router.get('/', teamController.list);

// Admin routes (require authentication - superadmin)
router.post('/', authMiddleware('superadmin'), upload.single('image'), teamController.create);
router.put('/:id', authMiddleware('superadmin'), upload.single('image'), teamController.update);
router.delete('/:id', authMiddleware('superadmin'), teamController.remove);

module.exports = router;
