const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const { getAllPermissions, normalizePath } = require('../config/permissions');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

async function normalizeUserPermissions(user) {
  const catalog = await getAllPermissions();
  const allowedByUrl = new Set(catalog.map((item) => item.url));
  const nameToUrl = new Map(catalog.map((item) => [item.name, item.url]));
  const current = Array.isArray(user.permissions) ? user.permissions : [];

  const normalized = Array.from(
    new Set(
      current
        .map((value) => {
          if (typeof value !== 'string') return '';
          const trimmed = value.trim();
          if (!trimmed) return '';
          if (trimmed.startsWith('/')) return normalizePath(trimmed);
          return nameToUrl.get(trimmed) || '';
        })
        .filter((value) => value && allowedByUrl.has(value))
    )
  );

  const hasChanged = normalized.length !== current.length || normalized.some((item, index) => item !== current[index]);
  if (hasChanged) {
    user.permissions = normalized;
    await user.save();
  }

  return normalized;
}

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const normalized = email.toLowerCase().trim();

    // First, allow the environment superadmin (fallback)
    const superEmail = process.env.SUPER_ADMIN_EMAIL || process.env.SUPERADMIN_EMAIL;
    const superPassword = process.env.SUPER_ADMIN_PASSWORD || process.env.SUPERADMIN_PASSWORD;
    if (superEmail && superPassword && normalized === superEmail.toLowerCase().trim() && password === superPassword) {
      const token = jwt.sign({ 
        id: 'superadmin', 
        email: superEmail.toLowerCase().trim(), 
        name: 'Super Admin', 
        role: 'superadmin' 
      }, JWT_SECRET, { expiresIn: '8h' });
      return res.json({ token, role: 'superadmin', expiresIn: 8 * 60 * 60 });
    }

    // Otherwise check database for user
    const user = await User.findOne({ email: normalized });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const normalizedPermissions = await normalizeUserPermissions(user);

    const token = jwt.sign({ 
      id: user._id, 
      email: user.email, 
      name: user.name || user.email, 
      role: user.role, 
      permissions: normalizedPermissions 
    }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ 
      token, 
      role: user.role,
      permissions: normalizedPermissions,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: normalizedPermissions
      },
      expiresIn: 8 * 60 * 60 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.me = (req, res) => {
  // authMiddleware attaches req.user
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: req.user });
};
