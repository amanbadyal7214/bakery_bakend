const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Gallery = require('../Models/Gallery');
const cloudinary = require('cloudinary').v2;
const cloudinaryConfigured = !!(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);
if (cloudinaryConfigured) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ url: process.env.CLOUDINARY_URL });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
}

const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500KB

const assertImageWithinSizeLimit = (buffer) => {
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    const err = new Error('Image size must be 500KB or less');
    err.status = 400;
    throw err;
  }
};

// helper: save base64 data url to Cloudinary when configured, otherwise to local uploads.
const saveBase64Image = async (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return dataUrl;
  const mime = m[1];
  const b64 = m[2];
  const buffer = Buffer.from(b64, 'base64');
  assertImageWithinSizeLimit(buffer);

  // If Cloudinary is configured, upload there (convert to webp for consistency).
  if (cloudinaryConfigured) {
    try {
      const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();
      // build a data url for cloudinary upload
      const webpDataUrl = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
      const res = await cloudinary.uploader.upload(webpDataUrl, {
        folder: 'gallery',
        resource_type: 'image',
        format: 'webp',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      });
      if (res && (res.secure_url || res.url)) return { url: (res.secure_url || res.url), public_id: res.public_id, provider: 'cloudinary' };
      // fallback to local if Cloudinary didn't return a URL
    } catch (err) {
      // If Cloudinary upload fails, fall through to local save
      console.warn('Cloudinary upload failed for gallery image, falling back to local storage:', err && err.message ? err.message : err);
    }
  }

  // Local uploads fallback: save converted webp if possible, otherwise original buffer
  const uploadDir = path.join(__dirname, '..', 'uploads');
  await fs.promises.mkdir(uploadDir, { recursive: true });
  const filename = `${Date.now()}-${Math.round(Math.random()*1e9)}.webp`;
  const filePath = path.join(uploadDir, filename);
  try {
    const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();
    await fs.promises.writeFile(filePath, webpBuffer);
    return { url: `/uploads/${filename}`, public_id: null, provider: 'local' };
  } catch (e) {
    const ext = (mime.split('/')[1] || 'png').split('+')[0];
    const fallbackName = `${Date.now()}-${Math.round(Math.random()*1e9)}.${ext}`;
    const fallbackPath = path.join(uploadDir, fallbackName);
    await fs.promises.writeFile(fallbackPath, buffer);
    return { url: `/uploads/${fallbackName}`, public_id: null, provider: 'local' };
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
        await cloudinary.uploader.destroy(existing.cloudinaryPublicId, { resource_type: 'image' }).catch(() => {});
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
        await cloudinary.uploader.destroy(removed.cloudinaryPublicId, { resource_type: 'image' }).catch(() => {});
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
