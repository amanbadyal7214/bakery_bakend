const mongoose = require('mongoose');

const paymentModeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    key: { type: String, trim: true }, // Added to handle potentially defunct unique indexes in DB
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentMode', paymentModeSchema);
