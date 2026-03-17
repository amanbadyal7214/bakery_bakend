const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema({
  title: { type: String, required: true },
  alt: { type: String },
  category: { type: String, default: 'Misc' },
  src: { type: String }, // Primary image web path
  imgBase64: { type: String }, // original base64 if provided
  badge: { type: String },
  price: { type: String },
  desc: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Gallery', GallerySchema);
