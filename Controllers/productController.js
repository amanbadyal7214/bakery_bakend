const Product = require('../Models/Product');
const IngredientDetail = require('../Models/IngredientDetail');
const StockAdjustment = require('../Models/StockAdjustment');
const Event = require('../Models/Event');

// Best-effort: extract Cloudinary public_id from a Cloudinary URL
const extractCloudinaryPublicIdFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1) return null;
  const publicIdWithExt = parts.slice(uploadIndex + 2).join('/');
  return publicIdWithExt.split('.')[0];
};

exports.createProduct = async (req, res, next) => {
  try {
    const data = req.body;
    if (data.img && !data.imgPublicId) {
      data.imgPublicId = extractCloudinaryPublicIdFromUrl(data.img);
    }
    const product = new Product(data);
    await product.save();
    res.status(201).json({ data: product });
  } catch (err) {
    console.error('productController.createProduct error:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const data = req.body;
    if (data.img && !data.imgPublicId) {
      data.imgPublicId = extractCloudinaryPublicIdFromUrl(data.img);
    }
    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ data: product });
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
    let products = await Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));

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
          const productObj = p.toObject();
          const eventPrice = parseFloat(offer.price.replace(/[^0-9.]/g, ''));
          const discountRatio = eventPrice / p.price;

          productObj.eventDiscount = {
            active: true,
            salePrice: eventPrice,
            originalPrice: p.price,
            badge: offer.badge,
            discount: offer.discount,
            ratio: discountRatio
          };

          productObj.price = eventPrice;

          if (productObj.pricesByWeight && productObj.pricesByWeight.length > 0) {
            productObj.pricesByWeight = productObj.pricesByWeight.map(pw => Number((pw * discountRatio).toFixed(2)));
          }

          if (productObj.variants && productObj.variants.length > 0) {
            productObj.variants = productObj.variants.map(v => ({
              ...v,
              price: Number((v.price * discountRatio).toFixed(2))
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
    let p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Product not found' });

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
        const productObj = p.toObject();
        const eventPrice = parseFloat(offer.price.replace(/[^0-9.]/g, ''));
        const discountRatio = eventPrice / p.price;

        productObj.eventDiscount = {
          active: true,
          salePrice: eventPrice,
          originalPrice: p.price,
          badge: offer.badge,
          discount: offer.discount,
          ratio: discountRatio
        };

        productObj.price = eventPrice;

        if (productObj.pricesByWeight && productObj.pricesByWeight.length > 0) {
          productObj.pricesByWeight = productObj.pricesByWeight.map(pw => Number((pw * discountRatio).toFixed(2)));
        }

        if (productObj.variants && productObj.variants.length > 0) {
          productObj.variants = productObj.variants.map(v => ({
            ...v,
            price: Number((v.price * discountRatio).toFixed(2))
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
    const product = await Product.findByIdAndUpdate(id, {
      stock,
      lastStockAdjustmentReason: reason
    }, { new: true });

    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Log adjustment
    const adjustment = new StockAdjustment({
      productId: id,
      newStock: stock,
      reason: reason || 'Manual adjustment'
    });
    await adjustment.save();

    res.json({ data: product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
