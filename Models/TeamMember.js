const mongoose = require('mongoose');

const TeamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: '' },
  since: { type: String, default: '' },
  quote: { type: String, default: '' },
  desc: { type: String, default: '' },
  img: { type: String, default: '' },
  badge: { type: String, default: '' },
  badgeBg: { type: String, default: '' },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TeamMember', TeamMemberSchema);
