const Cart = require('../Models/Cart');
const CheckoutOrder = require('../Models/CheckoutOrder');

const HOME_DELIVERY_FEE = 49;

const buildOrderNumber = () => {
  const ts = Date.now().toString().slice(-8);
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BK${ts}${rnd}`;
};

exports.placeOrder = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can place checkout orders' });
    }

    const {
      customerName,
      customerPhone,
      deliveryType = 'pickup',
      deliveryAddress = '',
      instructions = '',
      paymentMethod = 'upi',
    } = req.body;

    if (!customerName || !String(customerName).trim()) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    if (!customerPhone || !String(customerPhone).trim()) {
      return res.status(400).json({ error: 'Customer phone is required' });
    }

    const normalizedDeliveryType = deliveryType === 'home' ? 'home' : 'pickup';
    if (normalizedDeliveryType === 'home' && !String(deliveryAddress).trim()) {
      return res.status(400).json({ error: 'Delivery address is required for home delivery' });
    }

    const cart = await Cart.findOne({ customerId: req.user.id });
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const items = cart.items.map((item) => {
      const price = Number(item.unitPrice) || 0;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return {
        productId: item.productId,
        name: item.name,
        category: item.category || 'Bakery',
        image: item.image || '/placeholder.svg',
        price,
        quantity,
        lineTotal: price * quantity,
      };
    });

    const subtotal = items.reduce((acc, item) => acc + item.lineTotal, 0);
    const deliveryFee = normalizedDeliveryType === 'home' ? HOME_DELIVERY_FEE : 0;
    const totalAmount = subtotal + deliveryFee;
    const paymentStatus = paymentMethod === 'cod' ? 'pending' : 'paid';

    const order = await CheckoutOrder.create({
      orderNumber: buildOrderNumber(),
      customerId: req.user.id,
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      deliveryType: normalizedDeliveryType,
      deliveryAddress: normalizedDeliveryType === 'home' ? String(deliveryAddress).trim() : '',
      instructions: String(instructions || '').trim(),
      items,
      subtotal,
      deliveryFee,
      totalAmount,
      paymentStatus: paymentStatus,
      orderStatus: 'placed',
    });

    cart.items = [];
    await cart.save();

    return res.status(201).json({
      message: 'Order placed successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('Place Checkout Order Error:', error);
    return res.status(500).json({ error: 'Failed to place checkout order' });
  }
};

exports.listMyOrders = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can view checkout orders' });
    }

    const orders = await CheckoutOrder.find({ customerId: req.user.id }).sort({ createdAt: -1 });
    return res.json({ orders });
  } catch (error) {
    console.error('List Checkout Orders Error:', error);
    return res.status(500).json({ error: 'Failed to fetch checkout orders' });
  }
};