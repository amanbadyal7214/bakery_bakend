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
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
