require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./Models/User');

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI missing');
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  const admins = [
    { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, role: 'admin' },
    { email: process.env.SUPER_ADMIN_EMAIL, password: process.env.SUPER_ADMIN_PASSWORD, role: 'superadmin' },
  ].filter(u => u.email && u.password);

  for (const a of admins) {
    const existing = await User.findOne({ email: a.email.toLowerCase().trim() });
    if (existing) {
      console.log('exists:', a.email);
      continue;
    }
    const user = new User({ email: a.email.toLowerCase().trim(), role: a.role });
    await user.setPassword(a.password);
    await user.save();
    console.log('created:', a.email, a.role);
  }

  await mongoose.disconnect();
  console.log('done');
}

run().catch(err => { console.error(err); process.exit(1); });
