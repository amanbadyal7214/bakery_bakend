const Cart = require('../Models/Cart');
const CheckoutOrder = require('../Models/CheckoutOrder');
const sendEmail = require('../config/emailService');
const Customer = require('../Models/Customer');
const mongoose = require('mongoose');
const Product = require('../Models/Product');

const HOME_DELIVERY_FEE = 49;

const buildOrderNumber = () => {
  const ts = Date.now().toString().slice(-8);
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BK${ts}${rnd}`;
};

exports.placeOrder = async (req, res) => {
  let session;
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

    // Build items payload and validate stock availability
    const items = [];
    for (const item of cart.items) {
      const price = Number(item.unitPrice) || 0;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const productId = item.productId;
      // Fetch latest product stock along with variants
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ error: `Product not found for id ${productId}` });
      
      const requestedVariantName = item.name || product.name;
      let matchedVariantEarly = null;
      if (product.variants && product.variants.length > 0 && requestedVariantName) {
          const matchEarly = String(requestedVariantName).match(/\(([^,]+),\s*([^)]+)\)$/);
          if (matchEarly) {
              const srchWeight = matchEarly[2].trim();
              matchedVariantEarly = product.variants.find(v => String(v.weight).toLowerCase() === srchWeight.toLowerCase());
          } else {
              matchedVariantEarly = product.variants.find(v => String(requestedVariantName).includes(v.weight));
          }
      }

      const evalStock = matchedVariantEarly ? Number(matchedVariantEarly.stock) : Number(product.stock);
      if (typeof evalStock === 'number' && evalStock < quantity) {
        return res.status(400).json({ error: `Insufficient stock for product/variant "${requestedVariantName}". Requested ${quantity}, available ${evalStock}` });
      }

      items.push({
        productId,
        variantId: matchedVariantEarly ? matchedVariantEarly._id : null,
        name: requestedVariantName,
        price,
        quantity,
        lineTotal: price * quantity,
      });
    }

    const subtotal = items.reduce((acc, item) => acc + item.lineTotal, 0);
    const deliveryFee = normalizedDeliveryType === 'home' ? HOME_DELIVERY_FEE : 0;
    const totalAmount = subtotal + deliveryFee;
    const paymentStatus = paymentMethod === 'cod' ? 'pending' : 'paid';

    // Use mongoose transaction to atomically decrement stock and create order
    session = await mongoose.startSession();
    let createdOrder = null;
    await session.withTransaction(async () => {
      // Decrement stock for each item using a session-aware document retrieval and save process
      for (const it of items) {
        const prod = await Product.findById(it.productId).session(session);
        if (!prod) {
            throw new Error(`Product not found during checkout stock allocation for ${it.name}`);
        }

        let matchedVariant = null;
        if (it.variantId && prod.variants && prod.variants.length > 0) {
            matchedVariant = prod.variants.id(it.variantId);
        }

        // Validate constraint levels securely
        if (matchedVariant) {
            if (Number(matchedVariant.stock) < it.quantity) {
                 throw new Error(`Insufficient stock during update for variant "${it.name}". Requested ${it.quantity}, available ${matchedVariant.stock}`);
            }
            matchedVariant.stock -= it.quantity;
        } else {
            if (Number(prod.stock) < it.quantity) {
                 throw new Error(`Insufficient stock during update for product "${prod.name}". Requested ${it.quantity}, available ${prod.stock}`);
            }
        }
        
        prod.stock -= it.quantity;
        await prod.save({ session });
      }

      // Create order within the same session
      createdOrder = await CheckoutOrder.create([
        {
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
        }
      ], { session });

      // Clear cart within the transaction to avoid race conditions
      cart.items = [];
      await cart.save({ session });
    });

    if (!createdOrder || !createdOrder[0]) {
      return res.status(500).json({ error: 'Failed to create order' });
    }

    const order = createdOrder[0].toObject();
    // Add virtual names for frontend compatibility if productId is populated (it won't be here yet as it's fresh created)
    // but we can just use the product from the current loop context if we wanted.
    // For now, let's keep it simple as the client likely refreshes or we can populate it.
    
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
    // If error thrown during transaction due to insufficient stock, return helpful message
    if (session) {
      try { await session.abortTransaction(); } catch (e) {}
      session.endSession();
    }
    if (error && error.message && error.message.startsWith('Insufficient stock')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to place checkout order' });
  } finally {
    if (session) {
      try { session.endSession(); } catch (e) {}
    }
  }
};

exports.listMyOrders = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can view checkout orders' });
    }

    const ordersRaw = await CheckoutOrder.find({ customerId: req.user.id })
      .populate({
        path: 'items.productId',
        populate: { path: 'variants.weight' }
      })
      .sort({ createdAt: -1 });

    const orders = ordersRaw.map(order => {
      const o = order.toObject();
      o.items = o.items.map(item => {
        const product = item.productId || {};
        const productName = product.name || 'Bakery Item';
        
        let displayName = item.name;
        if (!displayName) {
          if (item.variantId && product.variants) {
            const v = product.variants.id(item.variantId);
            const weightVal = v?.weight ? (v.weight.name || v.weight.weight || '') : '';
            displayName = weightVal ? `${productName} (${weightVal})` : productName;
          } else {
            displayName = productName;
          }
        }

        return {
          ...item.toObject ? item.toObject() : item,
          name: displayName,
          category: product.category || 'Bakery',
          image: product.img || (product.images?.[0]?.url) || '/placeholder.svg'
        };
      });
      return o;
    });

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

    const ordersRaw = await CheckoutOrder.find()
      .populate({
        path: 'items.productId',
        populate: { path: 'variants.weight' }
      })
      .sort({ createdAt: -1 });

    const orders = ordersRaw.map(order => {
      const o = order.toObject();
      o.items = o.items.map(item => {
        const product = item.productId || {};
        const productName = product.name || 'Bakery Item';
        
        let displayName = item.name;
        if (!displayName) {
          if (item.variantId && product.variants) {
            const v = product.variants.id(item.variantId);
            const weightVal = v?.weight ? (v.weight.name || v.weight.weight || '') : '';
            displayName = weightVal ? `${productName} (${weightVal})` : productName;
          } else {
            displayName = productName;
          }
        }

        return {
          ...item.toObject ? item.toObject() : item,
          name: displayName,
          category: product.category || 'Bakery',
          image: product.img || (product.images?.[0]?.url) || '/placeholder.svg'
        };
      });
      return o;
    });

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
    const { status, deliveryPartner, deliveryPartnerPhone, deliveryEstimatedTime, cancelReason } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Resolve orderId: accept either ObjectId or orderNumber
    let resolvedOrderId = orderId;
    if (!mongoose.Types.ObjectId.isValid(String(orderId))) {
      // try find by orderNumber
      const byNumber = await CheckoutOrder.findOne({ orderNumber: String(orderId) });
      if (byNumber && byNumber._id) {
        resolvedOrderId = String(byNumber._id);
      } else {
        // try to strip common prefixes like '#ORD-'
        const stripped = String(orderId).replace(/^#?ORD-/i, '').trim();
        const byNumber2 = await CheckoutOrder.findOne({ orderNumber: new RegExp(stripped, 'i') });
        if (byNumber2 && byNumber2._id) {
          resolvedOrderId = String(byNumber2._id);
        } else {
          return res.status(400).json({ error: 'Invalid orderId' });
        }
      }
    }

    const validStatuses = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Validate delivery partner info for out_for_delivery status
    if (status === 'out_for_delivery' && (!deliveryPartner || !deliveryPartnerPhone)) {
      return res.status(400).json({ error: 'Delivery partner name and phone are required for out_for_delivery status' });
    }

    const existingOrder = await CheckoutOrder.findById(resolvedOrderId);
    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const isCancelling = existingOrder.orderStatus !== 'cancelled' && status === 'cancelled';

    const updateData = { orderStatus: status };
    if (status === 'out_for_delivery') {
      updateData.deliveryPartner = String(deliveryPartner).trim();
      updateData.deliveryPartnerPhone = String(deliveryPartnerPhone).trim();
      updateData.deliveryEstimatedTime = String(deliveryEstimatedTime || '').trim();
    }
    if (status === 'cancelled' && cancelReason) {
      updateData.cancelReason = String(cancelReason).trim();
    }
    
    // Track who updated the status
    if (req.user) {
      updateData.statusUpdatedBy = req.user.name || req.user.email || 'Admin';
    }

    const order = await CheckoutOrder.findByIdAndUpdate(
      resolvedOrderId,
      updateData,
      { new: true }
    );

    // Replenish stock upon cancellation
    if (isCancelling && order && Array.isArray(order.items)) {
        for (const it of order.items) {
           try {
             const prod = await Product.findById(it.productId);
             if (!prod) continue;

             let matchedVariant = null;
             if (it.variantId && prod.variants && prod.variants.length > 0) {
                 matchedVariant = prod.variants.id(it.variantId);
             }

             if (matchedVariant) {
                 matchedVariant.stock = Number(matchedVariant.stock) + it.quantity;
             }
             prod.stock = Number(prod.stock) + it.quantity;
             await prod.save();
           } catch (err) {
             console.error('Stock replenishment error on cancellation for product', it.productId, err);
           }
        }
    }

    // Send email notification to customer when out_for_delivery or delivered
    try {
      if (status === 'out_for_delivery' || status === 'delivered') {
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

          let subject, message, html;
          if (status === 'out_for_delivery') {
            subject = `Aapka order ${orderRef} ab delivery par hai`;
            message = `Namaste ${order.customerName || ''},\n\nAapke order ${orderRef} ke liye delivery partner assign ho gaya hai.\n\nDriver: ${driverName}\nPhone: ${driverPhone}\nETA: ${eta}\n\nDhanyavaad — Bakery Team`;
            html = `<p>Namaste ${order.customerName || ''},</p><p>Aapke order <strong>${orderRef}</strong> ke liye delivery partner assign ho gaya hai.</p><ul><li><strong>Driver:</strong> ${driverName}</li><li><strong>Phone:</strong> ${driverPhone}</li><li><strong>ETA:</strong> ${eta}</li></ul><p>Dhanyavaad — <em>Bakery Team</em></p>`;
          } else {
            subject = `Aapka order ${orderRef} deliver ho chuka hai`;
            message = `Namaste ${order.customerName || ''},\n\nAapka order ${orderRef} ab successfully deliver kar diya gaya hai.\n\nDriver: ${driverName}\nPhone: ${driverPhone}\n\nDhanyavaad — Bakery Team`;
            html = `<p>Namaste ${order.customerName || ''},</p><p>Aapka order <strong>${orderRef}</strong> ab successfully deliver kar diya gaya hai.</p><ul><li><strong>Driver:</strong> ${driverName}</li><li><strong>Phone:</strong> ${driverPhone}</li></ul><p>Dhanyavaad — <em>Bakery Team</em></p>`;
          }

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