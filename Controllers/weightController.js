const Weight = require('../Models/Weight');

exports.createWeight = async (req, res, next) => {
  try {
    const { name, description, categories } = req.body;
    const weight = new Weight({ name, description, categories });
    await weight.save();
    res.status(201).json(weight);
  } catch (err) {
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Weight with this name already exists';
    }
    next(err);
  }
};

exports.getWeights = async (req, res, next) => {
  try {
    const weights = await Weight.find().populate('categories').sort({ createdAt: -1 });
    res.json(weights);
  } catch (err) {
    next(err);
  }
};

exports.getWeight = async (req, res, next) => {
  try {
    const weight = await Weight.findById(req.params.id).populate('categories');
    if (!weight) {
      const err = new Error('Weight not found');
      err.status = 404;
      return next(err);
    }
    res.json(weight);
  } catch (err) {
    next(err);
  }
};

exports.updateWeight = async (req, res, next) => {
  try {
    const { name, description, categories } = req.body;
    const weight = await Weight.findByIdAndUpdate(
      req.params.id,
      { name, description, categories },
      { new: true, runValidators: true }
    );
    if (!weight) {
      const err = new Error('Weight not found');
      err.status = 404;
      return next(err);
    }
    res.json(weight);
  } catch (err) {
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Weight with this name already exists';
    }
    next(err);
  }
};

exports.deleteWeight = async (req, res, next) => {
  try {
    const weight = await Weight.findByIdAndDelete(req.params.id);
    if (!weight) {
      const err = new Error('Weight not found');
      err.status = 404;
      return next(err);
    }
    res.json({ ok: true, message: 'Weight deleted' });
  } catch (err) {
    next(err);
  }
};
