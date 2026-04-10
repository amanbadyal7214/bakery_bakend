const Type = require('../Models/Type');

exports.createType = async (req, res, next) => {
  try {
    const { name, description, category } = req.body;
    const type = new Type({ name, description, category: category || null });
    await type.save();
    res.status(201).json(type);
  } catch (err) {
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Type with this name already exists';
    }
    next(err);
  }
};

exports.getTypes = async (req, res, next) => {
  try {
    const types = await Type.find()
      .populate('category', 'name')
      .sort({ createdAt: -1 });
    res.json(types);
  } catch (err) {
    next(err);
  }
};

exports.getType = async (req, res, next) => {
  try {
    const type = await Type.findById(req.params.id).populate('category', 'name');
    if (!type) {
      const err = new Error('Type not found');
      err.status = 404;
      return next(err);
    }
    res.json(type);
  } catch (err) {
    next(err);
  }
};

exports.updateType = async (req, res, next) => {
  try {
    const { name, description, category } = req.body;
    const type = await Type.findByIdAndUpdate(
      req.params.id,
      { name, description, category: category || null },
      { new: true, runValidators: true }
    ).populate('category', 'name');
    if (!type) {
      const err = new Error('Type not found');
      err.status = 404;
      return next(err);
    }
    res.json(type);
  } catch (err) {
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Type with this name already exists';
    }
    next(err);
  }
};

exports.deleteType = async (req, res, next) => {
  try {
    const type = await Type.findByIdAndDelete(req.params.id);
    if (!type) {
      const err = new Error('Type not found');
      err.status = 404;
      return next(err);
    }
    res.json({ ok: true, message: 'Type deleted' });
  } catch (err) {
    next(err);
  }
};
