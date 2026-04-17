const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FlavorSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  // reference to Category (optional)
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Flavor', FlavorSchema);
