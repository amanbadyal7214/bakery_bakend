const Category = require('../Models/Category');
const Flavor = require('../Models/Flavor');
const Type = require('../Models/Type');
const Shape = require('../Models/Shape');
const Occasion = require('../Models/Occasion');
const Weight = require('../Models/Weight');
const Theme = require('../Models/Theme');

exports.listCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
};

exports.getCategory = async (req, res, next) => {
  try {
    const c = await Category.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Category not found' });
    res.json({ data: c });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const payload = req.body;
    const c = new Category(payload);
    await c.save();
    res.status(201).json({ data: c });
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Category not found' });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;

    // Check if category is used in any of the sub-types
    const [flavors, types, shapes, occasions, weights, themes] = await Promise.all([
      Flavor.findOne({ categories: categoryId }),
      Type.findOne({ categories: categoryId }),
      Shape.findOne({ categories: categoryId }),
      Occasion.findOne({ categories: categoryId }),
      Weight.findOne({ categories: categoryId }),
      Theme.findOne({ categories: categoryId }),
    ]);

    const linkedItems = [];
    if (flavors) linkedItems.push('Flavor');
    if (types) linkedItems.push('Type');
    if (shapes) linkedItems.push('Shape');
    if (occasions) linkedItems.push('Occasion');
    if (weights) linkedItems.push('Weight');
    if (themes) linkedItems.push('Theme');

    if (linkedItems.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It is linked to the following sub-types: ${linkedItems.join(', ')}. Please delete or update those first.` 
      });
    }

    const removed = await Category.findByIdAndDelete(categoryId);
    if (!removed) return res.status(404).json({ error: 'Category not found' });
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
};

