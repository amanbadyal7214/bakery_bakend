const Category = require('../Models/Category');

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
    const removed = await Category.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Category not found' });
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
};
