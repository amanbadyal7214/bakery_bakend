const Permission = require('../Models/Permission');

function normalizePath(path) {
  if (typeof path !== 'string') return '';
  const trimmed = path.trim();
  if (!trimmed) return '';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
}

const DEFAULT_PERMISSIONS = [
  { name: 'Dashboard', url: '/admin', group: 'main' },
  { name: 'Orders', url: '/admin/orders', group: 'main' },
  { name: 'Customize Order', url: '/admin/customize-order', group: 'main' },
  { name: 'Products', url: '/admin/products', group: 'main' },
  { name: 'Gallery', url: '/admin/gallery', group: 'main' },
  { name: 'Contacts', url: '/admin/contacts', group: 'main' },
  { name: 'Customers', url: '/admin/customers', group: 'main' },
  { name: 'Payments', url: '/admin/payments', group: 'main' },
  { name: 'Delivery', url: '/admin/delivery', group: 'main' },
  { name: 'Analytics', url: '/admin/analytics', group: 'main' },
  { name: 'Settings', url: '/admin/settings', group: 'main' },
  { name: 'Admins', url: '/admin/admins', group: 'main' },
  { name: 'Categories', url: '/admin/categories', group: 'productDetails' },
  { name: 'Flavors', url: '/admin/flavors', group: 'productDetails' },
  { name: 'Weights', url: '/admin/weights', group: 'productDetails' },
  { name: 'Types', url: '/admin/types', group: 'productDetails' },
  { name: 'Occasions', url: '/admin/occasions', group: 'productDetails' },
  { name: 'Shapes', url: '/admin/shapes', group: 'productDetails' },
  { name: 'Themes', url: '/admin/themes', group: 'productDetails' },
  { name: 'Nutrition', url: '/admin/nutrition', group: 'productDetails' },
  { name: 'Ingredients', url: '/admin/ingredients', group: 'productDetails' },
  { name: 'Origin Story', url: '/admin/about/origin-story', group: 'about' },
  { name: 'Values', url: '/admin/about/values', group: 'about' },
  { name: 'Team', url: '/admin/team', group: 'about' },
];

async function ensureDefaultPermissions() {
  const operations = DEFAULT_PERMISSIONS.map((permission) => ({
    updateOne: {
      // Match either legacy name-only docs or new url-based docs.
      filter: { $or: [{ url: permission.url }, { name: permission.name }] },
      update: { $set: { name: permission.name, url: permission.url, group: permission.group } },
      upsert: true,
    },
  }));
  await Permission.bulkWrite(operations, { ordered: false });
}

async function getAllPermissions() {
  await ensureDefaultPermissions();
  return Permission.find().sort({ name: 1 }).lean();
}

async function sanitizePermissions(input) {
  if (!Array.isArray(input)) return [];
  const unique = Array.from(new Set(input.filter((value) => typeof value === 'string').map((value) => normalizePath(value)).filter(Boolean)));
  if (unique.length === 0) return [];

  const allPermissions = await getAllPermissions();
  const allowedUrls = new Set(allPermissions.map((permission) => permission.url));
  return unique.filter((value) => allowedUrls.has(value));
}

module.exports = {
  DEFAULT_PERMISSIONS,
  ensureDefaultPermissions,
  getAllPermissions,
  normalizePath,
  sanitizePermissions,
};
