const ALL_PERMISSIONS = [
  'Dashboard',
  'Orders',
  'Customize Order',
  'Products',
  'Gallery',
  'Contacts',
  'Customers',
  'Payments',
  'Delivery',
  'Analytics',
  'Settings',
  'Categories',
  'Flavors',
  'Weights',
  'Types',
  'Occasions',
  'Shapes',
  'Themes',
  'Nutrition',
  'Ingredients',
  'Origin Story',
  'Values',
  'Team',
];

function sanitizePermissions(input) {
  if (!Array.isArray(input)) return [];
  const unique = Array.from(new Set(input.filter((value) => typeof value === 'string').map((value) => value.trim())));
  return unique.filter((value) => ALL_PERMISSIONS.includes(value));
}

module.exports = {
  ALL_PERMISSIONS,
  sanitizePermissions,
};
