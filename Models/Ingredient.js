const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // unit for the ingredient value (string) e.g. 'g', 'per 100g', 'piece'
  unit: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Ingredient', IngredientSchema);
