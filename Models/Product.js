const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  stock: { type: Number, default: 0 },
  img: { type: String }, // Primary image URL (Cloudinary or remote)
  imgPublicId: { type: String }, // Cloudinary public_id for primary image
  images: [{
    url: String,
    public_id: String
  }], // Array for multiple images (no base64 stored)
  rating: { type: Number, default: 4.8 },
  badge: { type: String },
  flavor: { type: [String], default: [] },
  type: { type: [String], default: [] },
  occasion: { type: [String], default: [] },
  weight: { type: [String], default: [] },
  pricesByWeight: { type: [Number], default: [] },
  variants: [{
    weight: String,
    price: Number,
    stock: { type: Number, default: 0 }
  }],
  delivery: { type: [String], default: [] },
  dietary: { type: [String], default: [] },
  shape: { type: String },
  theme: { type: String },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  ingredients: { type: [String], default: [] },
  tasteDescription: { type: String },
  totalNutrition: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
});

module.exports = mongoose.model('Product', ProductSchema);
