const Order = require('../Models/Order');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

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
