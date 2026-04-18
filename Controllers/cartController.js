const mongoose = require('mongoose');
const Cart = require('../Models/Cart');
const Product = require('../Models/Product');

const MAX_QTY_PER_ITEM = 20;

const resolveImage = (product) => {
  if (product?.img && String(product.img).trim()) return String(product.img);
  if (product?.imgBase64 && String(product.imgBase64).trim()) return String(product.imgBase64);
  if (Array.isArray(product?.images) && product.images.length > 0) {
    const first = product.images[0] || {};
    if (first.base64 && String(first.base64).trim()) return String(first.base64);
    if (first.url && String(first.url).trim()) return String(first.url);
  }
  return '/placeholder.svg';
};

// Serialize cart and enrich items with up-to-date product info (price, stock, image)
const serializeCart = async (cartDoc) => {
  const safeItems = Array.isArray(cartDoc?.items) ? cartDoc.items : [];
  const items = [];

  for (const item of safeItems) {
    const prodId = item.productId;
    let product = null;
    try {
      product = await Product.findById(prodId)
        .select('price stock img images name category variants')
        .populate({ path: 'variants.weight' })
        .lean();
    } catch (e) {
      product = null;
    }

    const price = Number(item.unitPrice) || (product ? Number(product.price) || 0 : 0);
    const quantity = Number(item.quantity) || 1;
    const image = item.image || (product ? (product.img || (Array.isArray(product.images) && product.images[0] && product.images[0].url) || '/placeholder.svg') : '/placeholder.svg');
    const stock = typeof (product && product.stock) === 'number' ? product.stock : 0;

    let displayName = item.name || (product ? product.name : '');
    
    // Repair name if it contains legacy residues or empty brackets
    if (displayName.includes('[object Object]') || displayName.endsWith('()')) {
        const baseName = product ? product.name : displayName.split(' (')[0];
        let flavorPart = '';
        
        // Try to extract flavor from existing name if present
        const flavorMatch = displayName.match(/\(([^,)]+)/);
        if (flavorMatch && flavorMatch[1] && !flavorMatch[1].includes('[object Object]')) {
            flavorPart = flavorMatch[1].trim();
        }

        // Try to extract weight from populated variant
        let weightPart = '';
        if (item.variantId && product && product.variants) {
            const variant = product.variants.find(v => String(v._id) === String(item.variantId));
            if (variant && variant.weight) {
                weightPart = variant.weight.name || variant.weight.label || '';
            }
        }

        const parts = [flavorPart, weightPart].filter(p => p && p.trim().length > 0 && p !== 'Original');
        displayName = parts.length > 0 ? `${baseName} (${parts.join(', ')})` : baseName;
    }

    items.push({
      id: String(prodId),
      variantId: item.variantId,
      name: displayName,
      category: item.category || (product ? product.category || 'Bakery' : 'Bakery'),
      image,
      price,
      stock,
      quantity,
      variants: product ? product.variants : [],
    });
  }

  const itemsCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return {
    items,
    summary: {
      itemsCount,
      subtotal,
    },
  };
};

const getOrCreateCart = async (customerId) => {
  let cart = await Cart.findOne({ customerId });
  if (!cart) {
    cart = await Cart.create({ customerId, items: [] });
  }
  return cart;
};

exports.getCart = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can access cart' });
    }

    const cart = await getOrCreateCart(req.user.id);
    const serialized = await serializeCart(cart);
    return res.json({ cart: serialized });
  } catch (error) {
    console.error('Get Cart Error:', error);
    return res.status(500).json({ error: 'Failed to fetch cart' });
  }
};

exports.addItem = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can modify cart' });
    }

    const { productId, variantId, quantity = 1, name, stock: reqStock, price: reqPrice } = req.body;
    if (!productId || !mongoose.Types.ObjectId.isValid(String(productId))) {
      return res.status(400).json({ error: 'Valid productId is required' });
    }

    const qtyToAdd = Math.max(1, Math.floor(Number(quantity) || 1));
    const product = await Product.findById(productId).select('price stock name img images category variants');
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Handle variant-specific stock if variantId is provided
    let limitStock = product.stock;
    if (variantId && product.variants) {
      const variant = product.variants.id(variantId);
      if (variant) limitStock = variant.stock;
    } else if (typeof reqStock === 'number') {
      limitStock = reqStock;
    }

    // Disallow adding when out of stock
    if (typeof limitStock === 'number' && limitStock <= 0) {
      return res.status(400).json({ error: `Product "${name || product.name || productId}" is out of stock` });
    }

    const cart = await getOrCreateCart(req.user.id);
    const existingIndex = cart.items.findIndex(
      (item) => String(item.productId) === String(product._id) && 
                (!variantId || String(item.variantId) === String(variantId)) &&
                (!name || item.name === name)
    );

    if (existingIndex >= 0) {
      const existing = cart.items[existingIndex];
      const newQty = Math.min(MAX_QTY_PER_ITEM, existing.quantity + qtyToAdd);
      // Prevent increasing beyond available stock
      if (typeof limitStock === 'number' && newQty > limitStock) {
        return res.status(400).json({ error: `Only ${limitStock} unit(s) available for "${name || product.name || productId}"` });
      }
      existing.quantity = newQty;
      // if price wasn't originally overridden, use backend price
      existing.unitPrice = reqPrice !== undefined ? Number(reqPrice) : (Number(product.price) || 0);
      existing.name = name || product.name;
      existing.category = product.category || 'Bakery';
      existing.image = resolveImage(product);
    } else {
      // Ensure requested quantity does not exceed stock
      if (typeof limitStock === 'number' && qtyToAdd > limitStock) {
        return res.status(400).json({ error: `Only ${limitStock} unit(s) available for "${name || product.name || productId}"` });
      }
      cart.items.push({
        productId: product._id,
        variantId: variantId || null,
        name: name || product.name,
        category: product.category || 'Bakery',
        image: resolveImage(product),
        unitPrice: reqPrice !== undefined ? Number(reqPrice) : (Number(product.price) || 0),
        quantity: Math.min(MAX_QTY_PER_ITEM, qtyToAdd),
      });
    }

    await cart.save();
    const serialized = await serializeCart(cart);
    return res.status(201).json({ message: 'Item added to cart', cart: serialized });
  } catch (error) {
    console.error('Add Item Error:', error);
    return res.status(500).json({ error: 'Failed to add item to cart' });
  }
};

exports.setItemQuantity = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can modify cart' });
    }

    const { productId } = req.params;
    const { quantity } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(String(productId))) {
      return res.status(400).json({ error: 'Valid productId is required' });
    }

    const normalizedQty = Math.floor(Number(quantity) || 0);
    const cart = await getOrCreateCart(req.user.id);
    const index = cart.items.findIndex((item) => String(item.productId) === String(productId));

    if (index === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    // Identify the specific item to see if it has a variant name indicating actual limits
    const targetItem = cart.items[index];
    const itemTargetName = targetItem.name;

    // Fetch current product stock
    const product = await Product.findById(productId).select('stock name variants');
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let limitStock = product.stock;
    if (targetItem.variantId && product.variants) {
        const variant = product.variants.id(targetItem.variantId);
        if (variant) limitStock = variant.stock;
    } else if (product.variants && product.variants.length > 0 && itemTargetName) {
        // Fallback to regex if variantId is missing (for legacy items)
        const match = itemTargetName.match(/\(([^,]+),\s*([^)]+)\)$/);
        if (match) {
            const variantWeight = match[2].trim();
            const variant = product.variants.find(v => String(v.weight).toLowerCase() === variantWeight.toLowerCase());
            if (variant && typeof variant.stock !== 'undefined') limitStock = variant.stock;
        } else {
            const variant = product.variants.find(v => itemTargetName.includes(String(v.weight)));
            if (variant && typeof variant.stock !== 'undefined') limitStock = variant.stock;
        }
    }

    if (normalizedQty <= 0) {
      cart.items.splice(index, 1);
    } else {
      // Prevent setting quantity beyond stock
      if (typeof limitStock === 'number' && normalizedQty > limitStock) {
        return res.status(400).json({ error: `Only ${limitStock} unit(s) available for "${itemTargetName || product.name}"` });
      }
      cart.items[index].quantity = Math.min(MAX_QTY_PER_ITEM, normalizedQty);
    }

    await cart.save();
    const serialized = await serializeCart(cart);
    return res.json({ message: 'Cart updated', cart: serialized });
  } catch (error) {
    console.error('Set Quantity Error:', error);
    return res.status(500).json({ error: 'Failed to update item quantity' });
  }
};

exports.removeItem = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can modify cart' });
    }

    const { productId } = req.params;
    if (!productId || !mongoose.Types.ObjectId.isValid(String(productId))) {
      return res.status(400).json({ error: 'Valid productId is required' });
    }

    const cart = await getOrCreateCart(req.user.id);
    cart.items = cart.items.filter((item) => String(item.productId) !== String(productId));
    await cart.save();

    const serialized = await serializeCart(cart);
    return res.json({ message: 'Item removed from cart', cart: serialized });
  } catch (error) {
    console.error('Remove Item Error:', error);
    return res.status(500).json({ error: 'Failed to remove item from cart' });
  }
};

exports.clearCart = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can modify cart' });
    }

    const cart = await getOrCreateCart(req.user.id);
    cart.items = [];
    await cart.save();

    const serialized = await serializeCart(cart);
    return res.json({ message: 'Cart cleared', cart: serialized });
  } catch (error) {
    console.error('Clear Cart Error:', error);
    return res.status(500).json({ error: 'Failed to clear cart' });
  }
};