const Role = require('../Models/Role');
const User = require('../Models/User');
const Permission = require('../Models/Permission');

// List all roles with user counts
exports.list = async (req, res) => {
  try {
    const roles = await Role.find().lean();
    
    // Get user count for each role
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const usersCount = await User.countDocuments({ role: role.name.toLowerCase() });
        return {
          ...role,
          usersCount,
        };
      })
    );
    
    res.json({ roles: rolesWithCounts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

// Get single role by ID
exports.getById = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Role ID is required' });
  
  try {
    const role = await Role.findById(id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    
    const usersCount = await User.countDocuments({ role: role.name.toLowerCase() });
    res.json({ role: { ...role.toObject(), usersCount } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
};

// Create new role
exports.create = async (req, res) => {
  const { name, description, permissions } = req.body || {};
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Role name is required' });
  }
  
  try {
    // Check if role already exists
    const existing = await Role.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ error: 'Role already exists' });
    }
    
    // Validate permissions exist in database
    if (Array.isArray(permissions) && permissions.length > 0) {
      const validPermissions = await Permission.find({ url: { $in: permissions } });
      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({ error: 'Some permissions are invalid' });
      }
    }
    
    const role = new Role({
      name: name.trim(),
      description: description?.trim() || '',
      permissions: Array.isArray(permissions) ? permissions : [],
      isSystem: false,
    });
    
    await role.save();
    res.status(201).json({ ok: true, role: role.toObject() });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Role name already exists' });
    }
    res.status(500).json({ error: 'Failed to create role' });
  }
};

// Update role
exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, description, permissions } = req.body || {};
  
  if (!id) return res.status(400).json({ error: 'Role ID is required' });
  
  try {
    const role = await Role.findById(id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    
    // System roles cannot be modified
    if (role.isSystem) {
      return res.status(403).json({ error: 'System roles cannot be modified' });
    }
    
    // Check name uniqueness if changing
    if (name && name.trim() !== role.name) {
      const existing = await Role.findOne({ name: name.trim() });
      if (existing) {
        return res.status(409).json({ error: 'Role name already exists' });
      }
      role.name = name.trim();
    }
    
    if (description !== undefined) {
      role.description = description.trim();
    }
    
    if (Array.isArray(permissions)) {
      // Validate permissions exist in database
      if (permissions.length > 0) {
        const validPermissions = await Permission.find({ url: { $in: permissions } });
        if (validPermissions.length !== permissions.length) {
          return res.status(400).json({ error: 'Some permissions are invalid' });
        }
      }
      role.permissions = permissions;
    }
    
    await role.save();
    const usersCount = await User.countDocuments({ role: role.name.toLowerCase() });
    res.json({ ok: true, role: { ...role.toObject(), usersCount } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

// Delete role
exports.delete = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Role ID is required' });
  
  try {
    const role = await Role.findById(id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    
    // System roles cannot be deleted
    if (role.isSystem) {
      return res.status(403).json({ error: 'System roles cannot be deleted' });
    }
    
    // Check if role is assigned to any users
    const userCount = await User.countDocuments({ role: role.name.toLowerCase() });
    if (userCount > 0) {
      return res.status(409).json({ 
        error: `Cannot delete role assigned to ${userCount} user${userCount !== 1 ? 's' : ''}` 
      });
    }
    
    await Role.deleteOne({ _id: id });
    res.json({ ok: true, message: 'Role deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete role' });
  }
};

// Add permissions to role
exports.addPermissions = async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body || {};
  
  if (!id) return res.status(400).json({ error: 'Role ID is required' });
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({ error: 'Permissions array is required' });
  }
  
  try {
    const role = await Role.findById(id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    
    // Validate permissions exist in database
    const validPermissions = await Permission.find({ url: { $in: permissions } });
    if (validPermissions.length !== permissions.length) {
      return res.status(400).json({ error: 'Some permissions are invalid' });
    }
    
    // Add new permissions
    role.permissions = [...new Set([...role.permissions, ...permissions])];
    await role.save();
    
    res.json({ ok: true, role: role.toObject() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add permissions' });
  }
};

// Remove permissions from role
exports.removePermissions = async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body || {};
  
  if (!id) return res.status(400).json({ error: 'Role ID is required' });
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({ error: 'Permissions array is required' });
  }
  
  try {
    const role = await Role.findById(id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    
    role.permissions = role.permissions.filter((p) => !permissions.includes(p));
    await role.save();
    
    res.json({ ok: true, role: role.toObject() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove permissions' });
  }
};
