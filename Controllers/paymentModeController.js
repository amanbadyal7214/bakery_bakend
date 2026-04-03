const PaymentMode = require('../Models/PaymentMode');

exports.getPaymentModes = async (req, res, next) => {
  try {
    const modes = await PaymentMode.find().sort({ createdAt: -1 });
    res.json({ data: modes });
  } catch (err) {
    next(err);
  }
};

// keep backward compatibility
exports.listPaymentModes = exports.getPaymentModes;

exports.getPaymentMode = async (req, res, next) => {
  try {
    const pm = await PaymentMode.findById(req.params.id);
    if (!pm) return res.status(404).json({ error: 'Payment mode not found' });
    res.json({ data: pm });
  } catch (err) {
    next(err);
  }
};

exports.createPaymentMode = async (req, res, next) => {
  try {
    const { name, description, isActive } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
    const payload = {
      name: String(name).trim(),
      key: String(name).trim().toLowerCase().replace(/\s+/g, '-'), // Automatically set key to be unique, mirroring the name
      description: description || '',
      isActive: isActive === undefined ? true : !!isActive,
    };

    // explicit uniqueness check to avoid E11000 duplicates (and give cleaner message)
    const exists = await PaymentMode.findOne({ name: payload.name });
    if (exists) return res.status(409).json({ error: 'name already exists' });

    const pm = new PaymentMode(payload);
    await pm.save();
    res.status(201).json({ data: pm });
  } catch (err) {
    // handle duplicate key error as fallback
    if (err && err.code === 11000) {
      const keyField = err.keyValue ? Object.keys(err.keyValue)[0] : 'name';
      const friendlyKey = keyField === 'key' ? 'name' : keyField;
      return res.status(409).json({ error: `${friendlyKey} already exists` });
    }
    // validation errors
    if (err && err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};

exports.updatePaymentMode = async (req, res, next) => {
  try {
    // if name provided, ensure it's not empty and update key
    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      const name = req.body.name;
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
      req.body.name = String(name).trim();
      req.body.key = String(req.body.name).toLowerCase().replace(/\s+/g, '-');
    }

    const updated = await PaymentMode.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true, context: 'query' });
    if (!updated) return res.status(404).json({ error: 'Payment mode not found' });
    res.json({ data: updated });
  } catch (err) {
    if (err && err.code === 11000) {
      const keyField = err.keyValue ? Object.keys(err.keyValue)[0] : 'name';
      const friendlyKey = keyField === 'key' ? 'name' : keyField;
      return res.status(409).json({ error: `${friendlyKey} already exists` });
    }
    if (err && err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};

exports.deletePaymentMode = async (req, res, next) => {
  try {
    const removed = await PaymentMode.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Payment mode not found' });
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
};
