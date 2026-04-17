const Theme = require('../Models/Theme');

exports.createTheme = async (req, res, next) => {
  try {
    const { name, description, subthemes, subThemes, categories } = req.body;
    const incomingSubs = subthemes || subThemes;
    const subs = Array.isArray(incomingSubs)
      ? incomingSubs.map(s => String(s || '').trim()).filter(Boolean)
      : [];

    const theme = new Theme({ 
      name, 
      description, 
      categories: categories || [],
      subthemes: subs
    });
    await theme.save();
    res.status(201).json(theme);
  } catch (err) {
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Theme with this name already exists';
    }
    next(err);
  }
};

exports.getThemes = async (req, res, next) => {
  try {
    const themes = await Theme.find().populate('categories').sort({ createdAt: -1 });
    res.json(themes);
  } catch (err) {
    next(err);
  }
};

exports.getTheme = async (req, res, next) => {
  try {
    const theme = await Theme.findById(req.params.id).populate('categories');
    if (!theme) {
      const err = new Error('Theme not found');
      err.status = 404;
      return next(err);
    }
    res.json(theme);
  } catch (err) {
    next(err);
  }
};

exports.updateTheme = async (req, res, next) => {
  try {
    const { name, description, subthemes, subThemes, categories } = req.body;
    const update = { name, description, categories: categories || [] };
    const incomingSubs = subthemes || subThemes;
    if (Array.isArray(incomingSubs)) {
      update.subthemes = incomingSubs.map(s => String(s || '').trim()).filter(Boolean);
    }

    const theme = await Theme.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );
    if (!theme) {
      const err = new Error('Theme not found');
      err.status = 404;
      return next(err);
    }
    res.json(theme);
  } catch (err) {
    if (err.code === 11000) {
      err.status = 400;
      err.message = 'Theme with this name already exists';
    }
    next(err);
  }
};

exports.deleteTheme = async (req, res, next) => {
  try {
    const theme = await Theme.findByIdAndDelete(req.params.id);
    if (!theme) {
      const err = new Error('Theme not found');
      err.status = 404;
      return next(err);
    }
    res.json({ ok: true, message: 'Theme deleted' });
  } catch (err) {
    next(err);
  }
};
