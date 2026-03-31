require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('./Models/Role');
const Permission = require('./Models/Permission');

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI missing');
  
  await mongoose.connect(mongoUri, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  });

  try {
    // Get all permissions
    const allPermissions = await Permission.find().select('url').lean();
    const permissionUrls = allPermissions.map(p => p.url);

    // Define system roles with all permissions
    const systemRoles = [
      {
        name: 'superadmin',
        description: 'Full system access with all permissions',
        permissions: permissionUrls,
        isSystem: true,
      },
      {
        name: 'admin',
        description: 'Standard admin with most permissions',
        permissions: permissionUrls,
        isSystem: true,
      },
    ];

    for (const roleData of systemRoles) {
      const existing = await Role.findOne({ name: roleData.name });
      if (existing) {
        console.log(`Role "${roleData.name}" already exists`);
        
        // Update permissions if needed
        if (JSON.stringify(existing.permissions.sort()) !== JSON.stringify(roleData.permissions.sort())) {
          existing.permissions = roleData.permissions;
          await existing.save();
          console.log(`  - Updated permissions for "${roleData.name}"`);
        }
        continue;
      }

      const role = new Role(roleData);
      await role.save();
      console.log(`Created system role: "${roleData.name}"`);
    }

    console.log('✓ Role initialization complete');
  } catch (err) {
    console.error('Error during role initialization:', err.message);
    throw err;
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
