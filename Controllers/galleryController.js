const fs = require('fs');
const path = require('path');
const Gallery = require('../Models/Gallery');
const { saveBase64Image, deleteCloudinaryImage, cloudinaryConfigured } = require('../utils/cloudinary');

exports.listGallery = async (req, res, next) => {
  try {
    const items = await Gallery.find().sort({ createdAt: -1 });
    res.json({ data: items });
  } catch (e) { next(e); }
};

exports.getGalleryItem = async (req, res, next) => {
  try {
    const item = await Gallery.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Gallery item not found' });
    res.json({ data: item });
  } catch (e) { next(e); }
};

exports.createGalleryItem = async (req, res, next) => {
  try {
    const payload = { ...(req.body || {}) };
    if (payload.src && typeof payload.src === 'string' && payload.src.startsWith('data:')) {
      // Do NOT persist the original base64 string in the DB.
      const saved = await saveBase64Image(payload.src);
      if (saved && typeof saved === 'object') {
        payload.src = saved.url;
        if (saved.public_id) payload.cloudinaryPublicId = saved.public_id;
      } else {
        payload.src = saved;
      }
    }
    const g = new Gallery(payload);
    await g.save();
    res.status(201).json({ data: g });
  } catch (e) { next(e); }
};

exports.updateGalleryItem = async (req, res, next) => {
  try {
    const existing = await Gallery.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Gallery item not found' });
    const payload = { ...(req.body || {}) };
    let newPath = null;
    let newPublicId = null;
    if (payload.src && typeof payload.src === 'string' && payload.src.startsWith('data:')) {
      // Do NOT persist the original base64 string in the DB.
      const saved = await saveBase64Image(payload.src);
      if (saved && typeof saved === 'object') {
        newPath = saved.url;
        newPublicId = saved.public_id || null;
        payload.src = newPath;
        if (newPublicId) payload.cloudinaryPublicId = newPublicId;
      } else {
        newPath = saved;
        payload.src = newPath;
      }
    }
    const updated = await Gallery.findByIdAndUpdate(req.params.id, payload, { new: true });
    // remove old file if replaced
    // if we uploaded new asset to Cloudinary and existing had cloudinary id, try to remove old cloudinary asset
    if (newPublicId && existing.cloudinaryPublicId) {
      try {
        await deleteCloudinaryImage(existing.cloudinaryPublicId);
      } catch (er) { /* ignore */ }
    }
    // if replaced local file, remove old local file
    if (newPath && existing.src && existing.src.startsWith('/uploads/')) {
      try {
        const oldRel = existing.src.replace(/^\//, '');
        const oldPath = path.join(__dirname, '..', oldRel);
        await fs.promises.unlink(oldPath).catch(() => {});
      } catch (er) { /* ignore */ }
    }

    res.json({ data: updated });
  } catch (e) { next(e); }
};

exports.deleteGalleryItem = async (req, res, next) => {
  try {
    const removed = await Gallery.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Gallery item not found' });
    // delete stored file if any
    // if stored on cloudinary, attempt to delete remote asset
    if (removed.cloudinaryPublicId && cloudinaryConfigured) {
      try {
        await deleteCloudinaryImage(removed.cloudinaryPublicId);
      } catch (er) { /* ignore */ }
    }
    if (removed.src && removed.src.startsWith('/uploads/')) {
      try {
        const rel = removed.src.replace(/^\//, '');
        const p = path.join(__dirname, '..', rel);
        await fs.promises.unlink(p).catch(() => {});
      } catch (er) { /* ignore */ }
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
};
