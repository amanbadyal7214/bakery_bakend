const mongoose = require('mongoose');

const StoreProfileSchema = new mongoose.Schema({
  name: { type: String, default: 'My Bakery' },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String },
  address: { type: String },
  currency: { type: String, default: 'USD ($)' },
  timezone: { type: String, default: '(GMT-05:00) Eastern Time' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

module.exports = mongoose.model('StoreProfile', StoreProfileSchema);
