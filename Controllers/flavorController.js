const Flavor = require('../Models/Flavor');

exports.createFlavor = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const flavor = new Flavor({ name, description });
    await flavor.save();
    res.status(201).json(flavor);
  } catch (err) {
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Flavor with this name already exists';
    }
    next(err);
  }
};

exports.getFlavors = async (req, res, next) => {
  try {
    const flavors = await Flavor.find().sort({ createdAt: -1 });
    res.json(flavors);
  } catch (err) {
    next(err);
  }
};

exports.getFlavor = async (req, res, next) => {
  try {
    const flavor = await Flavor.findById(req.params.id);
    if (!flavor) {
      const err = new Error('Flavor not found');
      err.status = 404;
      return next(err);
    }
    res.json(flavor);
  } catch (err) {
    next(err);
  }
};

exports.updateFlavor = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const flavor = await Flavor.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true, runValidators: true }
    );
    if (!flavor) {
      const err = new Error('Flavor not found');
      err.status = 404;
      return next(err);
    }
    res.json(flavor);
  } catch (err) {
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Flavor with this name already exists';
    }
    next(err);
  }
};

exports.deleteFlavor = async (req, res, next) => {
  try {
    const flavor = await Flavor.findByIdAndDelete(req.params.id);
    if (!flavor) {
      const err = new Error('Flavor not found');
      err.status = 404;
      return next(err);
    }
    res.json({ ok: true, message: 'Flavor deleted' });
  } catch (err) {
    next(err);
  }
};
