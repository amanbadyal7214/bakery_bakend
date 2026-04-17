const mongoose = require('mongoose');

const shapeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
}, { timestamps: true });

module.exports = mongoose.model('Shape', shapeSchema);
