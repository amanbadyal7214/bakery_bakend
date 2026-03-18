const express = require('express');
const router = express.Router();
const ctrl = require('../Controllers/galleryController');

const authMiddleware = require('../Middleware/authMiddleware');

router.get('/', ctrl.listGallery);
router.get('/:id', ctrl.getGalleryItem);
router.post('/', authMiddleware(), ctrl.createGalleryItem);
router.put('/:id', authMiddleware(), ctrl.updateGalleryItem);
router.delete('/:id', authMiddleware(), ctrl.deleteGalleryItem);

module.exports = router;
