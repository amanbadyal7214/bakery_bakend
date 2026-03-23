const mongoose = require('mongoose');

const ValueItemSchema = new mongoose.Schema({
  icon: { type: String },
  title: { type: String, required: true },
  desc: { type: String },
  accent: { type: String },
  bg: { type: String },
  border: { type: String },
});

const ValuesSchema = new mongoose.Schema({
  values: { type: [ValueItemSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

module.exports = mongoose.model('Values', ValuesSchema);
