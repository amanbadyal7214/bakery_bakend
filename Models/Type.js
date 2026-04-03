const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TypeSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Type', TypeSchema);
