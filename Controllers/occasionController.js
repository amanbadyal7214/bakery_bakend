const Occasion = require('../Models/Occasion');

exports.createOccasion = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const occasion = new Occasion({ name, description });
    await occasion.save();
    res.status(201).json(occasion);
  } catch (err) {
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Occasion with this name already exists';
    }
    next(err);
  }
};

exports.getOccasions = async (req, res, next) => {
  try {
    const occasions = await Occasion.find().sort({ createdAt: -1 });
    res.json(occasions);
  } catch (err) {
    next(err);
  }
};

exports.getOccasion = async (req, res, next) => {
  try {
    const occasion = await Occasion.findById(req.params.id);
    if (!occasion) {
      const err = new Error('Occasion not found');
      err.status = 404;
      return next(err);
    }
    res.json(occasion);
  } catch (err) {
    next(err);
  }
};

exports.updateOccasion = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const occasion = await Occasion.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true, runValidators: true }
    );
    if (!occasion) {
      const err = new Error('Occasion not found');
      err.status = 404;
      return next(err);
    }
    res.json(occasion);
  } catch (err) {
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Occasion with this name already exists';
    }
    next(err);
  }
};

exports.deleteOccasion = async (req, res, next) => {
  try {
    const occasion = await Occasion.findByIdAndDelete(req.params.id);
    if (!occasion) {
      const err = new Error('Occasion not found');
      err.status = 404;
      return next(err);
    }
    res.json({ ok: true, message: 'Occasion deleted' });
  } catch (err) {
    next(err);
  }
};
