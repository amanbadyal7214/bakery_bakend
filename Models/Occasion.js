const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OccasionSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  category: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  suboccasions: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Occasion', OccasionSchema);
