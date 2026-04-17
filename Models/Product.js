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
  flavor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Flavor' }],
  type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Type' }],
  occasion: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Occasion' }],
  weight: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Weight' }],
  pricesByWeight: { type: [Number], default: [] },
  variants: [{
    weight: { type: mongoose.Schema.Types.ObjectId, ref: 'Weight' },
    price: Number,
    stock: { type: Number, default: 0 }
  }],
  delivery: { type: [String], default: [] },
  dietary: { type: [String], default: [] },
  shape: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shape' }],
  theme: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Theme' }],
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  ingredients: [{
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'IngredientDetail' },
    qty: { type: Number, default: 0 }
  }],
  tasteDescription: { type: String },
  totalNutrition: { type: mongoose.Schema.Types.ObjectId, ref: 'IngredientDetail' },
  lastStockAdjustmentReason: { type: String },
});

module.exports = mongoose.model('Product', ProductSchema);
