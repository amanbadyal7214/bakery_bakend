const User = require('../Models/User');
const { sanitizePermissions } = require('../config/permissions');

exports.list = async (req, res) => {
  const users = await User.find({ role: 'admin' }).select('-passwordHash');
  res.json({ users });
};

exports.create = async (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const user = new User({ email: email.toLowerCase().trim(), name, role: role === 'superadmin' ? 'superadmin' : 'admin' });
    await user.setPassword(password);
    await user.save();
    res.status(201).json({ ok: true, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  try {
    await User.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updatePermissions = async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body || {};
  
  if (!id) return res.status(400).json({ error: 'Missing id' });
  if (!Array.isArray(permissions)) return res.status(400).json({ error: 'Permissions must be an array' });
  const sanitizedPermissions = await sanitizePermissions(permissions);
  
  try {
    const user = await User.findByIdAndUpdate(
      id,
      { permissions: sanitizedPermissions },
      { new: true }
    ).select('-passwordHash');
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
