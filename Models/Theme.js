const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  subthemes: { type: [String], default: [] },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
}, { timestamps: true });

module.exports = mongoose.model('Theme', themeSchema);
