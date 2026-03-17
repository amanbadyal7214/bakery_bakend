const express = require('express');
const router = express.Router();
const ctrl = require('../Controllers/galleryController');

router.get('/', ctrl.listGallery);
router.get('/:id', ctrl.getGalleryItem);
router.post('/', ctrl.createGalleryItem);
router.put('/:id', ctrl.updateGalleryItem);
router.delete('/:id', ctrl.deleteGalleryItem);

module.exports = router;
