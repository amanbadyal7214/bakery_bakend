const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  stock: { type: Number, default: 0 },
  img: { type: String }, // Primary image web path
  imgBase64: { type: String }, // Primary image base64
  images: [{
    url: String,
    base64: String
  }], // Array for multiple images
  rating: { type: Number, default: 4.8 },
  badge: { type: String },
  flavor: { type: [String], default: [] },
  type: { type: [String], default: [] },
  occasion: { type: [String], default: [] },
  weight: { type: [String], default: [] },
  delivery: { type: [String], default: [] },
  dietary: { type: [String], default: [] },
  shape: { type: String },
  theme: { type: String },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  ingredients: { type: [String], default: [] },
  tasteDescription: { type: String },
});

module.exports = mongoose.model('Product', ProductSchema);
