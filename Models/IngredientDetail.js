const mongoose = require('mongoose');

const IngredientDetailSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // unit for the ingredient value (string) e.g. 'g', 'per 100g', 'piece'
  unit: { type: String },
  // dynamic nutrition values per 100g — keys are nutrient names, values are numbers
  nutritionPer100g: { type: Map, of: Number, default: {} },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('IngredientDetail', IngredientDetailSchema);
