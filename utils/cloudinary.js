const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

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

/**
 * Saves a base64 data URL to Cloudinary (if configured) or local storage.
 * @param {string} dataUrl 
 * @param {string} folder Cloudinary folder name
 * @returns {Promise<{url: string, public_id: string|null, provider: 'cloudinary'|'local'}>}
 */
const saveBase64Image = async (dataUrl, folder = 'uploads') => {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) {
      // If it's already a URL, return it
      if (dataUrl.startsWith('http')) return { url: dataUrl, public_id: null, provider: 'external' };
      return null;
  }
  
  const mime = m[1];
  const b64 = m[2];
  const buffer = Buffer.from(b64, 'base64');
  assertImageWithinSizeLimit(buffer);

  // If Cloudinary is configured, upload there (convert to webp for consistency).
  if (cloudinaryConfigured) {
    try {
      const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();
      const webpDataUrl = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
      const res = await cloudinary.uploader.upload(webpDataUrl, {
        folder: folder,
        resource_type: 'image',
        format: 'webp',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      });
      if (res && (res.secure_url || res.url)) {
          return { url: (res.secure_url || res.url), public_id: res.public_id, provider: 'cloudinary' };
      }
    } catch (err) {
      console.warn(`Cloudinary upload failed for ${folder}, falling back to local storage:`, err.message || err);
    }
  }

  // Local uploads fallback
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

const deleteCloudinaryImage = async (publicId) => {
    if (!publicId || !cloudinaryConfigured) return;
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => {});
    } catch (e) {}
};

module.exports = {
    cloudinary,
    cloudinaryConfigured,
    saveBase64Image,
    deleteCloudinaryImage
};
