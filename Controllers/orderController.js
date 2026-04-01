const Order = require('../Models/Order');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { sendEmail } = require('../config/emailService');
const Customer = require('../Models/Customer');

exports.createOrder = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (req.file) {
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      // ensure uploads dir exists
      try { await fs.promises.mkdir(uploadsDir, { recursive: true }); } catch (e) {}

      const baseName = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const webpName = `${baseName}.webp`;
      const webpPath = path.join(uploadsDir, webpName);

      // convert and compress to webp buffer
      const buffer = await sharp(req.file.path)
        .rotate()
        .webp({ quality: 75 })
        .toBuffer();

      // write webp file to uploads
      await fs.promises.writeFile(webpPath, buffer);

      // remove original uploaded file
      try { await fs.promises.unlink(req.file.path); } catch (e) {}

      // store base64 data URL in DB (image field)
      payload.image = `data:image/webp;base64,${buffer.toString('base64')}`;
    }

    const order = new Order(payload);
    await order.save();
    res.status(201).json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

exports.listOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/orders/:id
exports.deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Order.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Order not found' });
    // Note: uploaded files may remain on disk depending on storage strategy.
    res.json({ success: true, deletedId: id });
  } catch (err) {
    next(err);
  }
};

// UPDATE ORDER STATUS
exports.updateOrderStatus = async (req, res, next) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({ success: false, error: 'Only admins can update order status' });
    }

    const { id } = req.params;
    const { status, deliveryPartner, deliveryPartnerPhone, deliveryEstimatedTime } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const validStatuses = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    // Validate delivery partner info for out_for_delivery status
    if (status === 'out_for_delivery' && (!deliveryPartner || !deliveryPartnerPhone)) {
      return res.status(400).json({ success: false, error: 'Delivery partner name and phone are required for out_for_delivery status' });
    }

    const updateData = { orderStatus: status };
    if (status === 'out_for_delivery') {
      updateData.deliveryPartner = String(deliveryPartner).trim();
      updateData.deliveryPartnerPhone = String(deliveryPartnerPhone).trim();
      updateData.deliveryEstimatedTime = String(deliveryEstimatedTime || '').trim();
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Send email notification to customer when out_for_delivery
    try {
      if (status === 'out_for_delivery') {
        // Try order-level email first
        let recipientEmail = updatedOrder.email || updatedOrder.customerEmail || '';

        // If no email on order, try to find customer by phone
        if (!recipientEmail && updatedOrder.mobile) {
          const cust = await Customer.findOne({ phone: String(updatedOrder.mobile).trim() });
          if (cust && cust.email) recipientEmail = cust.email;
        }

        if (recipientEmail) {
          const driverName = updatedOrder.deliveryPartner || 'Courier';
          const driverPhone = updatedOrder.deliveryPartnerPhone || 'N/A';
          const eta = updatedOrder.deliveryEstimatedTime || 'Pending';
          const orderIdShort = String(updatedOrder._id || updatedOrder.id).slice(-6);

          const subject = `Aapka order #ORD-${orderIdShort} ab delivery par hai`;
          const message = `Namaste ${updatedOrder.name || ''},\n\nAapke order #ORD-${orderIdShort} ke liye delivery partner assign ho gaya hai.\n\nDriver: ${driverName}\nPhone: ${driverPhone}\nETA: ${eta}\n\nDhanyavaad — Bakery Team`;
          const html = `<p>Namaste ${updatedOrder.name || ''},</p><p>Aapke order <strong>#ORD-${orderIdShort}</strong> ke liye delivery partner assign ho gaya hai.</p><ul><li><strong>Driver:</strong> ${driverName}</li><li><strong>Phone:</strong> ${driverPhone}</li><li><strong>ETA:</strong> ${eta}</li></ul><p>Dhanyavaad — <em>Bakery Team</em></p>`;

          await sendEmail({ email: recipientEmail, subject, message, html });
        } else {
          console.warn('No customer email found; skipping email notification for order', updatedOrder._id || id);
        }
      }
    } catch (emailErr) {
      console.error('Failed to send delivery email:', emailErr.message || emailErr);
    }

    res.json({ success: true, message: 'Order status updated successfully', order: updatedOrder });
  } catch (err) {
    next(err);
  }
};
