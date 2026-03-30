const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Gallery = require('../Models/Gallery');

const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500KB

const assertImageWithinSizeLimit = (buffer) => {
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    const err = new Error('Image size must be 500KB or less');
    err.status = 400;
    throw err;
  }
};

// helper: save base64 data url to uploads and return web path
const saveBase64Image = async (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return dataUrl;
  const mime = m[1];
  const b64 = m[2];
  const buffer = Buffer.from(b64, 'base64');
  assertImageWithinSizeLimit(buffer);
  const uploadDir = path.join(__dirname, '..', 'uploads');
  await fs.promises.mkdir(uploadDir, { recursive: true });
  const filename = `${Date.now()}-${Math.round(Math.random()*1e9)}.webp`;
  const filePath = path.join(uploadDir, filename);
  try {
    const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();
    await fs.promises.writeFile(filePath, webpBuffer);
    return `/uploads/${filename}`;
  } catch (e) {
    const ext = (mime.split('/')[1] || 'png').split('+')[0];
    const fallbackName = `${Date.now()}-${Math.round(Math.random()*1e9)}.${ext}`;
    const fallbackPath = path.join(uploadDir, fallbackName);
    await fs.promises.writeFile(fallbackPath, buffer);
    return `/uploads/${fallbackName}`;
  }
};

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
      payload.imgBase64 = payload.src;
      payload.src = await saveBase64Image(payload.src);
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
    if (payload.src && typeof payload.src === 'string' && payload.src.startsWith('data:')) {
      payload.imgBase64 = payload.src;
      newPath = await saveBase64Image(payload.src);
      payload.src = newPath;
    }
    const updated = await Gallery.findByIdAndUpdate(req.params.id, payload, { new: true });
    // remove old file if replaced
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
