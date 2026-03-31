const Permission = require('../Models/Permission');
const User = require('../Models/User');
const { ensureDefaultPermissions, normalizePath } = require('../config/permissions');

exports.list = async (req, res) => {
  try {
    await ensureDefaultPermissions();
    const permissions = await Permission.find().sort({ name: 1 }).lean();
    res.json({ permissions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  const { name, url, group } = req.body || {};
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedUrl = normalizePath(url);
  const normalizedGroup = typeof group === 'string' && group.trim() ? group.trim() : 'custom';

  if (!normalizedName) return res.status(400).json({ error: 'Permission name is required' });
  if (!normalizedUrl) return res.status(400).json({ error: 'Permission URL is required' });

  try {
    const existing = await Permission.findOne({ $or: [{ name: normalizedName }, { url: normalizedUrl }] });
    if (existing) return res.status(409).json({ error: 'Permission already exists' });

    const permission = await Permission.create({ name: normalizedName, url: normalizedUrl, group: normalizedGroup });
    res.status(201).json({ permission });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, url, group } = req.body || {};
  const update = {};

  if (typeof name === 'string') {
    const normalizedName = name.trim();
    if (!normalizedName) return res.status(400).json({ error: 'Permission name cannot be empty' });
    update.name = normalizedName;
  }

  if (typeof group === 'string') {
    update.group = group.trim() || 'custom';
  }

  if (typeof url === 'string') {
    const normalizedUrl = normalizePath(url);
    if (!normalizedUrl) return res.status(400).json({ error: 'Permission URL cannot be empty' });
    update.url = normalizedUrl;
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  update.updatedAt = new Date();

  try {
    const permission = await Permission.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!permission) return res.status(404).json({ error: 'Permission not found' });
    res.json({ permission });
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ error: 'Permission already exists' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;

  try {
    const permission = await Permission.findByIdAndDelete(id);
    if (!permission) return res.status(404).json({ error: 'Permission not found' });
    await User.updateMany({}, { $pull: { permissions: permission.url } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
