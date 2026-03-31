const User = require('../Models/User');
const Role = require('../Models/Role');
const { sanitizePermissions } = require('../config/permissions');

exports.list = async (req, res) => {
  const users = await User.find().select('-passwordHash');
  res.json({ users });
};

exports.create = async (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    let finalRole = 'admin';
    let finalPermissions = [];

    // Validate if role exists in Role collection
    if (role && role.trim()) {
      const roleDoc = await Role.findOne({ name: role.trim() });
      if (roleDoc) {
        finalRole = roleDoc.name;
        finalPermissions = roleDoc.permissions || [];
      } else {
        // Fallback to basic roles if no custom role found
        finalRole = role === 'superadmin' ? 'superadmin' : 'admin';
      }
    }

    const user = new User({ 
      email: email.toLowerCase().trim(), 
      name, 
      role: finalRole,
      permissions: finalPermissions
    });
    await user.setPassword(password);
    await user.save();
    res.status(201).json({ ok: true, user: { id: user._id, email: user.email, name: user.name, role: user.role, permissions: user.permissions } });
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

exports.updateRole = async (req, res) => {
  const { id } = req.params;
  const { roleName, permissions } = req.body || {};
  
  if (!id) return res.status(400).json({ error: 'Missing id' });
  if (!roleName) return res.status(400).json({ error: 'Role name is required' });

  try {
    // Check if role exists in Role collection
    const roleDoc = await Role.findOne({ name: roleName.trim() });
    
    if (!roleDoc) {
      // Only allow basic roles as fallback
      if (!['admin', 'superadmin'].includes(roleName.toLowerCase())) {
        return res.status(400).json({ error: 'Role not found' });
      }
    }

    const finalRole = roleDoc ? roleDoc.name : roleName.toLowerCase();
    
    // Sanitize permissions if provided
    let finalPermissions = [];
    if (Array.isArray(permissions) && permissions.length > 0) {
      finalPermissions = await sanitizePermissions(permissions);
    } else if (roleDoc && Array.isArray(roleDoc.permissions)) {
      // Use role's permissions if not explicitly provided
      finalPermissions = roleDoc.permissions;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { 
        role: finalRole,
        permissions: finalPermissions
      },
      { new: true }
    ).select('-passwordHash');
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
