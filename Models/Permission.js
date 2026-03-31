const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  url: { type: String, required: true, unique: true, trim: true },
  group: { type: String, default: 'custom', trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

PermissionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Permission', PermissionSchema);
