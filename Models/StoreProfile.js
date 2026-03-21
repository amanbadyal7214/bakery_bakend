const mongoose = require('mongoose');

const StoreProfileSchema = new mongoose.Schema({
  name: { type: String, default: 'My Bakery' },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String },
  address: { type: String },
  // Opening/closing times and human-friendly hours string
  openingTime: { type: String, default: '7:00 AM' },
  closingTime: { type: String, default: '8:00 PM' },
  hours: { type: String, default: 'Mon – Sat: 7 AM – 8 PM\nSun: 8 AM – 5 PM' },
  currency: { type: String, default: 'USD ($)' },
  timezone: { type: String, default: '(GMT-05:00) Eastern Time' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

module.exports = mongoose.model('StoreProfile', StoreProfileSchema);
