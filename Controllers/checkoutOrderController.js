const Cart = require('../Models/Cart');
const CheckoutOrder = require('../Models/CheckoutOrder');
const { sendEmail } = require('../config/emailService');
const Customer = require('../Models/Customer');

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

exports.listAllOrders = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Only admins can view all checkout orders' });
    }

    const orders = await CheckoutOrder.find().sort({ createdAt: -1 });
    return res.json({ orders });
  } catch (error) {
    console.error('List All Checkout Orders Error:', error);
    return res.status(500).json({ error: 'Failed to fetch checkout orders' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Only admins can update order status' });
    }

    const { orderId } = req.params;
    const { status, deliveryPartner, deliveryPartnerPhone, deliveryEstimatedTime } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Validate delivery partner info for out_for_delivery status
    if (status === 'out_for_delivery' && (!deliveryPartner || !deliveryPartnerPhone)) {
      return res.status(400).json({ error: 'Delivery partner name and phone are required for out_for_delivery status' });
    }

    const updateData = { orderStatus: status };
    if (status === 'out_for_delivery') {
      updateData.deliveryPartner = String(deliveryPartner).trim();
      updateData.deliveryPartnerPhone = String(deliveryPartnerPhone).trim();
      updateData.deliveryEstimatedTime = String(deliveryEstimatedTime || '').trim();
    }

    const order = await CheckoutOrder.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Send email notification to customer when out_for_delivery
    try {
      if (status === 'out_for_delivery') {
        // Try to find customer email from CheckoutOrder -> customerId -> Customer
        let recipientEmail = '';
        if (order.customerId) {
          try {
            const custById = await Customer.findById(order.customerId);
            if (custById && custById.email) recipientEmail = custById.email;
          } catch (e) {
            // ignore lookup errors
          }
        }

        // Fallback: find by phone
        if (!recipientEmail && order.customerPhone) {
          const custByPhone = await Customer.findOne({ phone: String(order.customerPhone).trim() });
          if (custByPhone && custByPhone.email) recipientEmail = custByPhone.email;
        }

        if (recipientEmail) {
          const driverName = order.deliveryPartner || 'Courier';
          const driverPhone = order.deliveryPartnerPhone || 'N/A';
          const eta = order.deliveryEstimatedTime || 'Pending';
          const orderRef = order.orderNumber || String(order._id).slice(-6);

          const subject = `Aapka order ${orderRef} ab delivery par hai`;
          const message = `Namaste ${order.customerName || ''},\n\nAapke order ${orderRef} ke liye delivery partner assign ho gaya hai.\n\nDriver: ${driverName}\nPhone: ${driverPhone}\nETA: ${eta}\n\nDhanyavaad — Bakery Team`;
          const html = `<p>Namaste ${order.customerName || ''},</p><p>Aapke order <strong>${orderRef}</strong> ke liye delivery partner assign ho gaya hai.</p><ul><li><strong>Driver:</strong> ${driverName}</li><li><strong>Phone:</strong> ${driverPhone}</li><li><strong>ETA:</strong> ${eta}</li></ul><p>Dhanyavaad — <em>Bakery Team</em></p>`;

          const info = await sendEmail({ email: recipientEmail, subject, message, html });
          console.log('Checkout delivery email send result:', info && (info.messageId || info.response || info));
        } else {
          console.warn('No customer email found for checkout order; skipping email notification for order', order._id || orderId);
        }
      }
    } catch (emailErr) {
      console.error('Failed to send delivery email for checkout order:', emailErr.message || emailErr);
    }

    return res.json({
      message: 'Order status updated successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        deliveryPartner: order.deliveryPartner,
        deliveryPartnerPhone: order.deliveryPartnerPhone,
        deliveryEstimatedTime: order.deliveryEstimatedTime,
      },
    });
  } catch (error) {
    console.error('Update Order Status Error:', error);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
};