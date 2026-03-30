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

const serializeCart = (cartDoc) => {
  const safeItems = Array.isArray(cartDoc?.items) ? cartDoc.items : [];
  const items = safeItems.map((item) => ({
    id: String(item.productId),
    name: item.name,
    category: item.category || 'Bakery',
    image: item.image || '/placeholder.svg',
    price: Number(item.unitPrice) || 0,
    stock: 999,
    quantity: Number(item.quantity) || 1,
  }));

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
    return res.json({ cart: serializeCart(cart) });
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

    const { productId, quantity = 1 } = req.body;
    if (!productId || !mongoose.Types.ObjectId.isValid(String(productId))) {
      return res.status(400).json({ error: 'Valid productId is required' });
    }

    const qtyToAdd = Math.max(1, Math.floor(Number(quantity) || 1));
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const cart = await getOrCreateCart(req.user.id);
    const existingIndex = cart.items.findIndex(
      (item) => String(item.productId) === String(product._id)
    );

    if (existingIndex >= 0) {
      const existing = cart.items[existingIndex];
      existing.quantity = Math.min(MAX_QTY_PER_ITEM, existing.quantity + qtyToAdd);
      existing.unitPrice = Number(product.price) || 0;
      existing.name = product.name;
      existing.category = product.category || 'Bakery';
      existing.image = resolveImage(product);
    } else {
      cart.items.push({
        productId: product._id,
        name: product.name,
        category: product.category || 'Bakery',
        image: resolveImage(product),
        unitPrice: Number(product.price) || 0,
        quantity: Math.min(MAX_QTY_PER_ITEM, qtyToAdd),
      });
    }

    await cart.save();
    return res.status(201).json({ message: 'Item added to cart', cart: serializeCart(cart) });
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

    if (normalizedQty <= 0) {
      cart.items.splice(index, 1);
    } else {
      cart.items[index].quantity = Math.min(MAX_QTY_PER_ITEM, normalizedQty);
    }

    await cart.save();
    return res.json({ message: 'Cart updated', cart: serializeCart(cart) });
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

    return res.json({ message: 'Item removed from cart', cart: serializeCart(cart) });
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

    return res.json({ message: 'Cart cleared', cart: serializeCart(cart) });
  } catch (error) {
    console.error('Clear Cart Error:', error);
    return res.status(500).json({ error: 'Failed to clear cart' });
  }
};