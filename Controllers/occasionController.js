const Occasion = require('../Models/Occasion');

exports.createOccasion = async (req, res, next) => {
  try {
    const { name, description, suboccasions, subOccasions, categories } = req.body;
    const incomingSubs = suboccasions || subOccasions;
    const subs = Array.isArray(incomingSubs)
      ? incomingSubs.map(s => String(s || '').trim()).filter(Boolean)
      : [];

    const occasion = new Occasion({ 
      name, 
      description, 
      categories: categories || [],
      subOccasions: subs
    });
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
    const occasions = await Occasion.find().populate('categories').sort({ createdAt: -1 });
    res.json(occasions);
  } catch (err) {
    next(err);
  }
};

exports.getOccasion = async (req, res, next) => {
  try {
    const occasion = await Occasion.findById(req.params.id).populate('categories');
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
    const { name, description, suboccasions, subOccasions, categories } = req.body;
    const update = { name, description, categories: categories || [] };
    const incomingSubs = suboccasions || subOccasions;
    if (Array.isArray(incomingSubs)) {
      update.subOccasions = incomingSubs.map(s => String(s || '').trim()).filter(Boolean);
    }

    const occasion = await Occasion.findByIdAndUpdate(
      req.params.id,
      update,
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
