const mongoose = require('mongoose');
const Product = require('../Models/Product');
const IngredientDetail = require('../Models/IngredientDetail');
const StockAdjustment = require('../Models/StockAdjustment');
const Event = require('../Models/Event');
const { saveBase64Image, deleteCloudinaryImage } = require('../utils/cloudinary');

const splitMixed = (arr) => {
  const ids = [];
  const labels = [];
  if (Array.isArray(arr)) {
    arr.forEach(item => {
      const val = (item && (item._id || item.id)) || item;
      if (val && typeof val === 'string' && mongoose.Types.ObjectId.isValid(val)) {
        ids.push(val);
      } else if (val) {
        labels.push(String(val));
      }
    });
  }
  return { ids, labels };
};

const manualPopulate = async (products, field, modelName) => {
  if (!products) return;
  const list = Array.isArray(products) ? products : [products];
  const allIds = new Set();
  
  list.forEach(p => {
    const arr = p[field];
    if (Array.isArray(arr)) {
      arr.forEach(id => {
        const idStr = (id && (id._id || id.id || id))?.toString();
        if (idStr && mongoose.Types.ObjectId.isValid(idStr)) {
          allIds.add(idStr);
        }
      });
    }
  });

  if (allIds.size === 0) return;

  try {
    const docs = await mongoose.model(modelName).find({ _id: { $in: Array.from(allIds) } });
    const map = new Map(docs.map(d => [d._id.toString(), d]));

    list.forEach(p => {
      if (Array.isArray(p[field])) {
        p[field] = p[field].map(id => {
          const idStr = (id && (id._id || id.id || id))?.toString();
          return map.get(idStr) || id;
        });
      }
    });
  } catch (err) {
    console.error(`Manual populate failed for ${field}:`, err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const data = req.body;

    // Primary image handle
    if (data.img && typeof data.img === 'string' && data.img.startsWith('data:')) {
      const saved = await saveBase64Image(data.img, 'products');
      if (saved) {
        data.img = saved.url;
        data.imgPublicId = saved.public_id;
      }
    }

    // Gallery images handle
    if (Array.isArray(data.images)) {
      data.images = await Promise.all(
        data.images.map(async (img) => {
          if (img.base64 && img.base64.startsWith('data:')) {
            const saved = await saveBase64Image(img.base64, 'products/gallery');
            return saved ? { url: saved.url, public_id: saved.public_id } : { url: img.url };
          }
          return img;
        })
      );
    }

    // Split mixed fields
    ['flavor', 'type', 'occasion', 'shape', 'theme'].forEach(field => {
      if (data[field]) {
        const { ids, labels } = splitMixed(data[field]);
        data[field] = ids;
        data[`${field}Labels`] = labels;
      }
    });

    const product = new Product(data);
    await product.save();

    // Populate before returning
    const populated = await Product.findById(product._id)
      .populate('weight')
      .populate('ingredients.ingredient')
      .populate('totalNutrition')
      .populate('variants.weight');

    const productObj = populated.toObject();
    await Promise.all([
      manualPopulate(productObj, 'flavor', 'Flavor'),
      manualPopulate(productObj, 'type', 'Type'),
      manualPopulate(productObj, 'occasion', 'Occasion'),
      manualPopulate(productObj, 'shape', 'Shape'),
      manualPopulate(productObj, 'theme', 'Theme'),
    ]);

    res.status(201).json({ data: productObj });
  } catch (err) {
    console.error('productController.createProduct error:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const data = req.body;
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    // Primary image handle
    if (data.img && typeof data.img === 'string' && data.img.startsWith('data:')) {
      // Delete old if exists
      if (existing.imgPublicId) await deleteCloudinaryImage(existing.imgPublicId);

      const saved = await saveBase64Image(data.img, 'products');
      if (saved) {
        data.img = saved.url;
        data.imgPublicId = saved.public_id;
      }
    }

    // Gallery images handle
    if (Array.isArray(data.images)) {
      data.images = await Promise.all(
        data.images.map(async (img) => {
          if (img.base64 && img.base64.startsWith('data:')) {
            const saved = await saveBase64Image(img.base64, 'products/gallery');
            return saved ? { url: saved.url, public_id: saved.public_id } : { url: img.url };
          }
          return img;
        })
      );
    }

    // Split mixed fields
    ['flavor', 'type', 'occasion', 'shape', 'theme'].forEach(field => {
      if (data[field]) {
        const { ids, labels } = splitMixed(data[field]);
        data[field] = ids;
        data[`${field}Labels`] = labels;
      }
    });

    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true })
      .populate('weight')
      .populate('ingredients.ingredient')
      .populate('totalNutrition')
      .populate('variants.weight');

    const productObj = product.toObject();
    await Promise.all([
      manualPopulate(productObj, 'flavor', 'Flavor'),
      manualPopulate(productObj, 'type', 'Type'),
      manualPopulate(productObj, 'occasion', 'Occasion'),
      manualPopulate(productObj, 'shape', 'Shape'),
      manualPopulate(productObj, 'theme', 'Theme'),
    ]);

    res.json({ data: productObj });
  } catch (err) {
    console.error('productController.updateProduct error:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('productController.deleteProduct error:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.listProducts = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(filter);
    let productsQuery = Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
      .populate('weight')
      .populate('ingredients.ingredient')
      .populate('totalNutrition')
      .populate('variants.weight');

    let products = await productsQuery.lean();

    await Promise.all([
      manualPopulate(products, 'flavor', 'Flavor'),
      manualPopulate(products, 'type', 'Type'),
      manualPopulate(products, 'occasion', 'Occasion'),
      manualPopulate(products, 'shape', 'Shape'),
      manualPopulate(products, 'theme', 'Theme'),
    ]);

    // --- Dynamic Event Discount Logic ---
    const activeEvent = await Event.findOne({ isActive: true });

    // Check if event is actually running based on dates
    let isCurrentlyRunning = false;
    if (activeEvent && activeEvent.startDate && activeEvent.endDate) {
      const now = new Date();
      const start = new Date(activeEvent.startDate);
      const end = new Date(activeEvent.endDate);
      end.setHours(23, 59, 59, 999);
      if (now >= start && now <= end) isCurrentlyRunning = true;
    }

    if (activeEvent && isCurrentlyRunning && activeEvent.offers && activeEvent.offers.length > 0) {
      products = products.map(p => {
        const offer = activeEvent.offers.find(o => o.productId && o.productId.toString() === p._id.toString());
        if (offer) {
          const productObj = p;
          const eventPrice = parseFloat(offer.price.replace(/[^0-9.]/g, ''));
          // Use variant[0].mrp or p.price as base if needed
          const baseForRatio = productObj.variants?.[0]?.mrp || productObj.price || 1;
          const discountRatio = eventPrice / baseForRatio;

          productObj.eventDiscount = {
            active: true,
            salePrice: eventPrice,
            originalPrice: baseForRatio,
            badge: offer.badge,
            discount: offer.discount,
            ratio: discountRatio
          };

          productObj.price = eventPrice;
          productObj.sellingPrice = eventPrice;

          if (productObj.variants && productObj.variants.length > 0) {
            productObj.variants = productObj.variants.map(v => ({
              ...v,
              sellingPrice: Number((v.mrp * discountRatio).toFixed(2))
            }));
          }

          return productObj;
        }
        return p;
      });
    }

    res.json({ data: products, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    console.error('productController.listProducts error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    let pDoc = await Product.findById(req.params.id)
      .populate('weight')
      .populate('ingredients.ingredient')
      .populate('totalNutrition')
      .populate('variants.weight');

    if (!pDoc) return res.status(404).json({ error: 'Product not found' });

    let p = pDoc.toObject();
    await Promise.all([
      manualPopulate(p, 'flavor', 'Flavor'),
      manualPopulate(p, 'type', 'Type'),
      manualPopulate(p, 'occasion', 'Occasion'),
      manualPopulate(p, 'shape', 'Shape'),
      manualPopulate(p, 'theme', 'Theme'),
    ]);

    // --- Dynamic Event Discount Logic ---
    const activeEvent = await Event.findOne({ isActive: true });

    let isCurrentlyRunning = false;
    if (activeEvent && activeEvent.startDate && activeEvent.endDate) {
      const now = new Date();
      const start = new Date(activeEvent.startDate);
      const end = new Date(activeEvent.endDate);
      end.setHours(23, 59, 59, 999);
      if (now >= start && now <= end) isCurrentlyRunning = true;
    }

    if (activeEvent && isCurrentlyRunning && activeEvent.offers) {
      const offer = activeEvent.offers.find(o => o.productId && o.productId.toString() === p._id.toString());
      if (offer) {
        const productObj = p;
        const eventPrice = parseFloat(offer.price.replace(/[^0-9.]/g, ''));
        const baseForRatio = productObj.variants?.[0]?.mrp || productObj.mrp || productObj.price || 1;
        const discountRatio = eventPrice / baseForRatio;

        productObj.eventDiscount = {
          active: true,
          salePrice: eventPrice,
          originalPrice: baseForRatio,
          badge: offer.badge,
          discount: offer.discount,
          ratio: discountRatio
        };

        productObj.sellingPrice = eventPrice;
        productObj.price = eventPrice;

        if (productObj.variants && productObj.variants.length > 0) {
          productObj.variants = productObj.variants.map(v => ({
            ...v,
            sellingPrice: Number((v.mrp * discountRatio).toFixed(2))
          }));
        }

        p = productObj;
      }
    }

    res.json({ data: p });
  } catch (err) {
    console.error('productController.getProduct error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stock, reason } = req.body;

    const existing = await Product.findById(id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const oldStock = Number(existing.stock) || 0;
    const newStock = Number(stock);
    const difference = newStock - oldStock;

    existing.stock = newStock;
    existing.lastStockAdjustmentReason = reason || 'Manual adjustment';
    await existing.save();

    // Log adjustment - all fields required by StockAdjustment model
    const adjustment = new StockAdjustment({
      productId: id,
      productName: existing.name,
      oldStock,
      newStock,
      difference,
      reason: reason || 'Manual adjustment'
    });
    await adjustment.save();

    res.json({ data: existing });
  } catch (err) {
    console.error('productController.updateStock error:', err);
    res.status(400).json({ error: err.message });
  }
};
