const IngredientDetail = require('../Models/IngredientDetail');

exports.list = async (req, res, next) => {
  try {
    const items = await IngredientDetail.find().sort({ name: 1 }).lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, unit, nutritionPer100g } = req.body;
    const ing = new IngredientDetail({ name, unit, nutritionPer100g });
    await ing.save();
    res.status(201).json(ing);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const ing = await IngredientDetail.findById(req.params.id).lean();
    if (!ing) return res.status(404).json({ error: 'Not found' });
    res.json(ing);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, unit, nutritionPer100g } = req.body;
    const ing = await IngredientDetail.findByIdAndUpdate(
      req.params.id,
      { name, unit, nutritionPer100g },
      { new: true }
    ).lean();
    if (!ing) return res.status(404).json({ error: 'Not found' });
    res.json(ing);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await IngredientDetail.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
