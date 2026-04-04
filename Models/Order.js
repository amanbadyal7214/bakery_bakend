const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  occasion: String,
  weight: String,
  servingCount: String,
  flavor: String,
  shape: String,
  designTheme: String,
  image: String, // path to uploaded image
  message: String,
  frosting: String,
  isEggless: { type: String, enum: ['egg', 'eggless'], default: 'egg' },
  deliveryType: { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
  deliveryDate: String,
  deliveryTime: String,
  name: String,
  mobile: String,
  address: String,
  pincode: String,
  orderStatus: { type: String, enum: ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'], default: 'placed' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  deliveryPartner: { type: String, trim: true, default: '' },
  deliveryPartnerPhone: { type: String, trim: true, default: '' },
  deliveryEstimatedTime: { type: String, trim: true, default: '' },
  cancelReason: { type: String, trim: true, default: '' },
  statusUpdatedBy: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
