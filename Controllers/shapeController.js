const Shape = require('../Models/Shape');

exports.createShape = async (req, res, next) => {
  try {
    const { name, shapeType, description, category } = req.body;
    const shape = new Shape({ name, shapeType, description, category });
    await shape.save();
    res.status(201).json(shape);
  } catch (err) {
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Shape with this name already exists';
    }
    next(err);
  }
};

exports.getShapes = async (req, res, next) => {
  try {
    const shapes = await Shape.find().populate('category').sort({ createdAt: -1 });
    res.json(shapes);
  } catch (err) {
    next(err);
  }
};

exports.getShape = async (req, res, next) => {
  try {
    const shape = await Shape.findById(req.params.id).populate('category');
    if (!shape) {
      const err = new Error('Shape not found');
      err.status = 404;
      return next(err);
    }
    res.json(shape);
  } catch (err) {
    next(err);
  }
};

exports.updateShape = async (req, res, next) => {
  try {
    const { name, shapeType, description, category } = req.body;
    const shape = await Shape.findByIdAndUpdate(
      req.params.id,
      { name, shapeType, description, category },
      { new: true, runValidators: true }
    );
    if (!shape) {
      const err = new Error('Shape not found');
      err.status = 404;
      return next(err);
    }
    res.json(shape);
  } catch (err) {
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Shape with this name already exists';
    }
    next(err);
  }
};

exports.deleteShape = async (req, res, next) => {
  try {
    const shape = await Shape.findByIdAndDelete(req.params.id);
    if (!shape) {
      const err = new Error('Shape not found');
      err.status = 404;
      return next(err);
    }
    res.json({ ok: true, message: 'Shape deleted' });
  } catch (err) {
    next(err);
  }
};
