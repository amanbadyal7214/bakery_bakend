const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;
const cloudinaryConfigured = !!(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);
if (cloudinaryConfigured) {
  if (process.env.CLOUDINARY_URL) {
    // CLOUDINARY_URL covers all config
    cloudinary.config({ url: process.env.CLOUDINARY_URL });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
}
// Helper: upload a local file (e.g., saved by multer under /uploads) to Cloudinary and remove the local file.
const uploadLocalFileToCloudinary = async (localPath) => {
  if (!cloudinaryConfigured) throw new Error('Cloudinary is not configured');
  if (!localPath) throw new Error('No local path provided');
  // Accept either absolute path or application-relative '/uploads/...' path
  const rel = localPath.startsWith('/') ? localPath.replace(/^\//, '') : localPath;
  const abs = path.isAbsolute(rel) ? rel : path.join(__dirname, '..', rel);
  try {
    const res = await cloudinary.uploader.upload(abs, {
      folder: 'products',
      resource_type: 'image',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });
    // remove the local file if upload succeeded
    try { await fs.promises.unlink(abs).catch(() => {}); } catch (e) {}
    return { url: res.secure_url || res.url, public_id: res.public_id };
  } catch (err) {
    // do not leave local file removed if upload failed; rethrow
    throw err;
  }
};

const Product = require('../Models/Product');
const IngredientDetail = require('../Models/IngredientDetail');

// Best-effort: extract Cloudinary public_id from a Cloudinary URL
const extractCloudinaryPublicIdFromUrl = (url) => {
  try {
    if (!url || typeof url !== 'string') return null;
    const marker = '/upload/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    let path = url.slice(idx + marker.length);
    // remove version prefix like v123456/
    path = path.replace(/^v\d+\//, '');
    // remove file extension if present
    path = path.replace(/\.[a-zA-Z0-9]+(\?.*)?$/, '');
    // decode and return
    return decodeURIComponent(path);
  } catch (e) {
    return null;
  }
};

const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500KB

const assertImageWithinSizeLimit = (buffer) => {
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    const err = new Error('Image size must be 500KB or less');
    err.status = 400;
    throw err;
  }
};

// helper: save data URL (base64) image to uploads and return web path
const saveBase64Image = async (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;
  const m = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!m) return dataUrl;
  const mime = m[1];
  const b64 = m[2];
  const buffer = Buffer.from(b64, 'base64');
  // validate original size (before conversion)
  assertImageWithinSizeLimit(buffer);

  // We only support Cloudinary storage now. Throw if not configured.
  if (!cloudinaryConfigured) throw new Error('Cloudinary is not configured; images must be uploaded to Cloudinary');
  try {
    // convert to webp for consistent storage and possibly smaller size
    const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();
    // re-check size after conversion (we allow slightly larger but still check)
    try { assertImageWithinSizeLimit(webpBuffer); } catch (e) { /* ignore size delta */ }

    const webpDataUrl = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
    const res = await cloudinary.uploader.upload(webpDataUrl, {
      folder: 'products',
      resource_type: 'image',
      format: 'webp',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });
    if (res) return { url: (res.secure_url || res.url), public_id: res.public_id };
    throw new Error('Cloudinary upload did not return result');
  } catch (err) {
    // Propagate error so caller can handle; do not persist locally
    throw err;
  }
};

// helper: calculate total nutrition for a product based on its ingredients
const calculateProductNutrition = async (ingredients) => {
  const finalTotals = {}; // key -> { value, unit }
  const cache = new Map();

  const resolve = async (name, grams) => {
    const cacheKey = `${name}_${grams}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const detail = await IngredientDetail.findOne({ name });
    if (!detail || !detail.nutritionPer100g) return {};

    const totals = {};
    const nutrients = detail.nutritionPer100g instanceof Map ? Object.fromEntries(detail.nutritionPer100g) : detail.nutritionPer100g;

    for (const [nutrientName, val] of Object.entries(nutrients || {})) {
      let num = 0;
      let unit = '';
      if (typeof val === 'number') {
        num = val;
      } else if (val && typeof val === 'object') {
        num = typeof val.value === 'number' ? val.value : 0;
        unit = val.unit || '';
      }

      const scaled = (num / 100) * grams;

      // Check if this 'nutrientName' is actually another ingredient
      const subDetail = await IngredientDetail.findOne({ name: nutrientName });
      if (subDetail) {
        // Compound: recursively resolve
        const subResult = await resolve(nutrientName, scaled);
        for (const [sn, sv] of Object.entries(subResult)) {
          if (!totals[sn]) totals[sn] = { value: 0, unit: sv.unit };
          totals[sn].value += sv.value;
        }
      } else {
        // Base nutrient (e.g. calories, protein)
        if (!totals[nutrientName]) totals[nutrientName] = { value: 0, unit: unit };
        totals[nutrientName].value += scaled;
      }
    }
    
    cache.set(cacheKey, totals);
    return totals;
  };

  if (!ingredients || !Array.isArray(ingredients)) return finalTotals;

  for (const entry of ingredients) {
    const match = String(entry).match(/^(.+)\s*\((\d+(?:\.\d+)?)\s*g\)$/i);
    if (!match) continue;

    const name = match[1].trim();
    const grams = parseFloat(match[2]);
    if (isNaN(grams)) continue;

    const res = await resolve(name, grams);
    for (const [k, v] of Object.entries(res)) {
      if (!finalTotals[k]) finalTotals[k] = { value: 0, unit: v.unit };
      finalTotals[k].value += v.value;
    }
  }

  // Round results
  for (const k in finalTotals) {
    finalTotals[k].value = Math.round(finalTotals[k].value * 100) / 100;
  }
  return finalTotals;
};

exports.listProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, minPrice, maxPrice, rating } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (category) filter.category = category;
    if (minPrice || maxPrice) filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
    if (rating) filter.rating = { $gte: Number(rating) };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));

    res.json({ data: products, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    console.error('productController.listProducts error:', err);
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Product not found' });
    // return single product wrapped in { data: ... }
    res.json({ data: p });
  } catch (err) {
    console.error('productController.getProduct error:', err);
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const payload = { ...(req.body || {}) };

    // Normalize common fields so backend stores exactly what was added from frontend
    const ensureArray = (val) => {
      if (val === undefined || val === null) return [];
      if (Array.isArray(val)) return val.map(String);
      // if comma-separated string, split; otherwise wrap single value
      if (typeof val === 'string') {
        // try comma split if contains comma
        if (val.includes(',')) return val.split(',').map(s => s.trim()).filter(Boolean);
        return val === '' ? [] : [val];
      }
      return [String(val)];
    };

    // Coerce specific fields
    payload.category = payload.category !== undefined && payload.category !== null ? String(payload.category) : '';
    payload.flavor = ensureArray(payload.flavor);
    payload.type = ensureArray(payload.type);
    payload.occasion = ensureArray(payload.occasion);
    payload.weight = ensureArray(payload.weight);
    payload.delivery = ensureArray(payload.delivery);
    payload.dietary = ensureArray(payload.dietary);
    payload.ingredients = ensureArray(payload.ingredients);

    // Coerce shape/theme to string if arrays were sent (frontend can send single-value arrays)
    if (Array.isArray(payload.shape)) payload.shape = payload.shape.length ? String(payload.shape[0]) : '';
    else if (payload.shape === undefined || payload.shape === null) payload.shape = '';
    if (Array.isArray(payload.theme)) payload.theme = payload.theme.length ? String(payload.theme[0]) : '';
    else if (payload.theme === undefined || payload.theme === null) payload.theme = '';

    // Handle primary image
    if (payload.img && typeof payload.img === 'string') {
      if (payload.img.startsWith('data:')) {
        payload.imgBase64 = payload.img;
        const imgResult = await saveBase64Image(payload.img);
        payload.img = imgResult.url;
        payload.imgPublicId = imgResult.public_id || imgResult.publicId || null;
      } else if (payload.img.startsWith('/uploads/') || payload.img.includes('uploads')) {
        // File saved by multer locally - upload to Cloudinary and remove local copy
        const uploadRes = await uploadLocalFileToCloudinary(payload.img);
        payload.img = uploadRes.url;
        payload.imgPublicId = uploadRes.public_id || null;
      } else if (cloudinaryConfigured) {
        // Remote URL: ensure it's stored on Cloudinary. If already a Cloudinary URL, try extract public id.
        if (payload.img.includes('res.cloudinary.com')) {
          if (!payload.imgPublicId) {
            const extracted = extractCloudinaryPublicIdFromUrl(payload.img);
            if (extracted) payload.imgPublicId = extracted;
          }
          // leave payload.img as-is (already on Cloudinary)
        } else {
          // Not a Cloudinary URL; upload remote URL to Cloudinary so we store a Cloudinary-hosted image
          try {
            const res = await cloudinary.uploader.upload(payload.img, {
              folder: 'products',
              resource_type: 'image',
              format: 'webp',
              use_filename: true,
              unique_filename: true,
              overwrite: false,
            });
            if (res) {
              payload.img = res.secure_url || res.url;
              payload.imgPublicId = res.public_id || null;
            }
          } catch (e) {
            // if upload fails, keep original URL and continue
            console.warn('Failed to migrate primary image to Cloudinary:', e.message || e);
          }
        }
      }
    }

    // Handle multiple images array
    if (payload.images && Array.isArray(payload.images)) {
      const processedImages = [];
      for (const item of payload.images) {
        if (item && item.base64 && typeof item.base64 === 'string' && item.base64.startsWith('data:')) {
          const urlRes = await saveBase64Image(item.base64);
          processedImages.push({ url: urlRes.url, public_id: urlRes.public_id || null });
        } else if (item && item.url) {
          // If local multer file path -> upload
          if (typeof item.url === 'string' && (item.url.startsWith('/uploads/') || item.url.includes('uploads'))) {
            const up = await uploadLocalFileToCloudinary(item.url);
            processedImages.push({ url: up.url, public_id: up.public_id || null });
          } else if (typeof item.url === 'string' && cloudinaryConfigured) {
            // If already a Cloudinary URL, extract public id if missing
            if (item.url.includes('res.cloudinary.com')) {
              const pub = item.public_id || extractCloudinaryPublicIdFromUrl(item.url) || null;
              processedImages.push({ url: item.url, public_id: pub });
            } else {
              // Remote non-Cloudinary URL -> upload it to Cloudinary so all images are Cloudinary-hosted
              try {
                const res = await cloudinary.uploader.upload(item.url, {
                  folder: 'products',
                  resource_type: 'image',
                  format: 'webp',
                  use_filename: true,
                  unique_filename: true,
                  overwrite: false,
                });
                if (res) processedImages.push({ url: res.secure_url || res.url, public_id: res.public_id || null });
                else processedImages.push({ url: item.url || null, public_id: item.public_id || null });
              } catch (e) {
                // fallback: keep original url if upload fails
                console.warn('Failed to migrate gallery image to Cloudinary:', e.message || e);
                processedImages.push({ url: item.url || null, public_id: item.public_id || null });
              }
            }
          } else {
            // Cloudinary not configured or unknown type -> keep as-is
            let pub = item.public_id || null;
            processedImages.push({ url: item.url || null, public_id: pub });
          }
        }
      }
      payload.images = processedImages;
    }

    // Calculate total nutrition
    payload.totalNutrition = await calculateProductNutrition(payload.ingredients);

    const p = new Product(payload);
    await p.save();
    res.status(201).json({ data: p });
  } catch (err) {
    console.error('productController.createProduct error:', err);
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const payload = { ...(req.body || {}) };

    // Normalize common fields on update as well
    const ensureArray = (val) => {
      if (val === undefined || val === null) return [];
      if (Array.isArray(val)) return val.map(String);
      if (typeof val === 'string') {
        if (val.includes(',')) return val.split(',').map(s => s.trim()).filter(Boolean);
        return val === '' ? [] : [val];
      }
      return [String(val)];
    };

    // Coerce numeric fields if provided and validate
    if (payload.price !== undefined) {
      const pnum = Number(payload.price);
      if (Number.isNaN(pnum)) return res.status(400).json({ error: 'Invalid price' });
      payload.price = pnum;
    }
    if (payload.stock !== undefined) {
      const snum = Number(payload.stock);
      if (Number.isNaN(snum)) return res.status(400).json({ error: 'Invalid stock' });
      payload.stock = snum;
    }

    payload.category = payload.category !== undefined && payload.category !== null ? String(payload.category) : existing.category;
    if (payload.flavor !== undefined) payload.flavor = ensureArray(payload.flavor);
    if (payload.type !== undefined) payload.type = ensureArray(payload.type);
    if (payload.occasion !== undefined) payload.occasion = ensureArray(payload.occasion);
    if (payload.weight !== undefined) payload.weight = ensureArray(payload.weight);
    if (payload.delivery !== undefined) payload.delivery = ensureArray(payload.delivery);
    if (payload.dietary !== undefined) payload.dietary = ensureArray(payload.dietary);
    if (payload.ingredients !== undefined) payload.ingredients = ensureArray(payload.ingredients);

    // Coerce shape/theme to string if arrays or comma-separated values were sent
    if (payload.shape !== undefined) {
      if (Array.isArray(payload.shape)) payload.shape = payload.shape.length ? String(payload.shape[0]) : '';
      else if (typeof payload.shape === 'string') {
        // if frontend sent comma-separated values, take first as primary
        payload.shape = payload.shape.includes(',') ? payload.shape.split(',').map(s => s.trim()).filter(Boolean)[0] || '' : payload.shape;
      } else if (payload.shape === null) payload.shape = '';
      else payload.shape = String(payload.shape);
    } else {
      // preserve existing if not provided
      payload.shape = existing.shape || '';
    }

    if (payload.theme !== undefined) {
      if (Array.isArray(payload.theme)) payload.theme = payload.theme.length ? String(payload.theme[0]) : '';
      else if (typeof payload.theme === 'string') {
        payload.theme = payload.theme.includes(',') ? payload.theme.split(',').map(s => s.trim()).filter(Boolean)[0] || '' : payload.theme;
      } else if (payload.theme === null) payload.theme = '';
      else payload.theme = String(payload.theme);
    } else {
      payload.theme = existing.theme || '';
    }

    let newImgPath = null;
    let newImgPublicId = null;

    // Handle primary image update
    if (payload.img && typeof payload.img === 'string') {
      if (payload.img.startsWith('data:')) {
        payload.imgBase64 = payload.img;
        const imgRes = await saveBase64Image(payload.img);
        newImgPath = imgRes.url; newImgPublicId = imgRes.public_id || null;
        payload.img = newImgPath; if (newImgPublicId) payload.imgPublicId = newImgPublicId;
      } else if (payload.img.startsWith('/uploads/') || payload.img.includes('uploads')) {
        const up = await uploadLocalFileToCloudinary(payload.img);
        newImgPath = up.url; newImgPublicId = up.public_id || null;
        payload.img = newImgPath; if (newImgPublicId) payload.imgPublicId = newImgPublicId;
      } else if (cloudinaryConfigured) {
        // Remote URL: ensure it's stored on Cloudinary. If already a Cloudinary URL, try extract public id.
        if (payload.img.includes('res.cloudinary.com')) {
          if (!payload.imgPublicId) {
            const extracted = extractCloudinaryPublicIdFromUrl(payload.img);
            if (extracted) payload.imgPublicId = extracted;
          }
          // leave payload.img as-is (already on Cloudinary)
        } else {
          // Not a Cloudinary URL; upload remote URL to Cloudinary so we store a Cloudinary-hosted image
          try {
            const res = await cloudinary.uploader.upload(payload.img, {
              folder: 'products',
              resource_type: 'image',
              format: 'webp',
              use_filename: true,
              unique_filename: true,
              overwrite: false,
            });
            if (res) {
              payload.img = res.secure_url || res.url;
              payload.imgPublicId = res.public_id || null;
            }
          } catch (e) {
            // if upload fails, keep original URL and continue
            console.warn('Failed to migrate primary image to Cloudinary:', e.message || e);
          }
        }
      }
    }

    // Handle multiple images array update
    if (payload.images && Array.isArray(payload.images)) {
      const processedImages = [];
      for (const item of payload.images) {
        if (item && item.base64 && typeof item.base64 === 'string' && item.base64.startsWith('data:')) {
          const urlRes = await saveBase64Image(item.base64);
          processedImages.push({ url: urlRes.url, public_id: urlRes.public_id || null });
        } else if (item && item.url) {
          // If local multer file path -> upload
          if (typeof item.url === 'string' && (item.url.startsWith('/uploads/') || item.url.includes('uploads'))) {
            const up = await uploadLocalFileToCloudinary(item.url);
            processedImages.push({ url: up.url, public_id: up.public_id || null });
          } else if (typeof item.url === 'string' && cloudinaryConfigured) {
            // If already a Cloudinary URL, extract public id if missing
            if (item.url.includes('res.cloudinary.com')) {
              const pub = item.public_id || extractCloudinaryPublicIdFromUrl(item.url) || null;
              processedImages.push({ url: item.url, public_id: pub });
            } else {
              // Remote non-Cloudinary URL -> upload it to Cloudinary so all images are Cloudinary-hosted
              try {
                const res = await cloudinary.uploader.upload(item.url, {
                  folder: 'products',
                  resource_type: 'image',
                  format: 'webp',
                  use_filename: true,
                  unique_filename: true,
                  overwrite: false,
                });
                if (res) processedImages.push({ url: res.secure_url || res.url, public_id: res.public_id || null });
                else processedImages.push({ url: item.url || null, public_id: item.public_id || null });
              } catch (e) {
                // fallback: keep original url if upload fails
                console.warn('Failed to migrate gallery image to Cloudinary:', e.message || e);
                processedImages.push({ url: item.url || null, public_id: item.public_id || null });
              }
            }
          } else {
            // Cloudinary not configured or unknown type -> keep as-is
            let pub = item.public_id || null;
            processedImages.push({ url: item.url || null, public_id: pub });
          }
        }
      }
      payload.images = processedImages;
    }

    // Recalculate nutrition on update
    if (payload.ingredients !== undefined) {
      payload.totalNutrition = await calculateProductNutrition(payload.ingredients);
    }

    // Run validators on update to catch bad data early
    const updated = await Product.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true, context: 'query' });

    // Cleanup old primary image if replaced
    if (newImgPath && existing.img && typeof existing.img === 'string') {
      try {
        // if existing image was stored locally, remove file
        if (existing.img.startsWith('/uploads/')) {
          const oldRel = existing.img.replace(/^\//, '');
          const oldPath = path.join(__dirname, '..', oldRel);
          await fs.promises.unlink(oldPath).catch(() => {});
        }
        // if existing image was on Cloudinary and we have its public id, try deleting it when replaced
        if (cloudinaryConfigured && existing.imgPublicId) {
          try { await cloudinary.uploader.destroy(existing.imgPublicId, { resource_type: 'image' }); } catch (e) { /* ignore */ }
        }
      } catch (e) { /* ignore */ }
    }

    res.json({ data: updated });
  } catch (err) {
    console.error('productController.updateProduct error:', err);
    if (err && err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: err.message });
    }
    return res.status(500).json({ error: 'Failed to update product', details: err.message });
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const removed = await Product.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Product not found' });
    // keep consistent wrapper for delete as well
    res.json({ data: { success: true } });
  } catch (err) {
    console.error('productController.deleteProduct error:', err);
    next(err);
  }
};
