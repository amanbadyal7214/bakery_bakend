const TeamMember = require('../Models/TeamMember');
const path = require('path');

// helper: whitelist fields that can be set by admin
const allowedFields = ['name', 'role', 'since', 'quote', 'desc', 'img', 'badge', 'order'];

function pickAllowed(data) {
  const payload = {};
  allowedFields.forEach((k) => { if (data[k] !== undefined) payload[k] = data[k]; });
  return payload;
}

function computeBadgeBg(badge) {
  if (!badge) return 'bg-amber-100 text-amber-800';
  const b = badge.toLowerCase();
  if (b.includes('founder')) return 'bg-amber-100 text-amber-800';
  if (b.includes('pastry')) return 'bg-orange-100 text-orange-800';
  if (b.includes('designer')) return 'bg-pink-100 text-pink-800';
  if (b.includes('bread')) return 'bg-yellow-100 text-yellow-800';
  return 'bg-amber-100 text-amber-800';
}

exports.list = async (req, res) => {
  try {
    const items = await TeamMember.find().sort({ order: 1, createdAt: 1 });
    // convert img to absolute URL when it's a server path
    const host = req.get('host');
    const proto = req.protocol;
    const mapped = items.map((it) => {
      const obj = it.toObject ? it.toObject() : Object.assign({}, it);
      if (obj.img && typeof obj.img === 'string' && obj.img.startsWith('/')) {
        obj.img = `${proto}://${host}${obj.img}`;
      }
      return obj;
    });
    res.json({ ok: true, team: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  try {
    // req.file may be added by multer
    const data = req.body || {};
    const payload = pickAllowed(data);
    if (req.file && req.file.filename) {
      payload.img = '/uploads/' + req.file.filename;
    }

    payload.badgeBg = computeBadgeBg(payload.badge);

    const item = new TeamMember(payload);
    await item.save();
    res.json({ ok: true, teamMember: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body || {};
    const item = await TeamMember.findById(id);
    if (!item) return res.status(404).json({ error: 'Not found' });

    const payload = pickAllowed(data);
    if (req.file && req.file.filename) {
      payload.img = '/uploads/' + req.file.filename;
    }

    Object.assign(item, payload);
    item.badgeBg = computeBadgeBg(item.badge);

    await item.save();
    res.json({ ok: true, teamMember: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    const item = await TeamMember.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
