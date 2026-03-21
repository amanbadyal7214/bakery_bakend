const StoreProfile = require('../Models/StoreProfile');

exports.getProfile = async (req, res) => {
  try {
    let profile = await StoreProfile.findOne();
    if (!profile) {
      profile = new StoreProfile({
        name: 'Hangary? Sweet.',
        email: 'admin@hangarysweet.com',
        phone: '+1 234 567 890',
        address: '123 Baker Street, London'
      });
      await profile.save();
    }
    res.json({ ok: true, profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // Debug logging: show authenticated user and payload
    console.log('storeController.updateProfile called by', req.user);
    console.log('payload:', req.body);

    const data = req.body || {};
    let profile = await StoreProfile.findOne();
    if (!profile) {
      profile = new StoreProfile(data);
    } else {
      profile.name = data.name ?? profile.name;
      profile.email = data.email ?? profile.email;
      profile.phone = data.phone ?? profile.phone;
      profile.address = data.address ?? profile.address;
      profile.currency = data.currency ?? profile.currency;
      profile.timezone = data.timezone ?? profile.timezone;
      profile.updatedAt = new Date();
    }
    await profile.save();
    res.json({ ok: true, profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
