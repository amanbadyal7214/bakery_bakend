const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  subthemes: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Theme', themeSchema);
