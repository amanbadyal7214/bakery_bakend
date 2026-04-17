const mongoose = require('mongoose');

const weightSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
}, { timestamps: true });

module.exports = mongoose.model('Weight', weightSchema);
