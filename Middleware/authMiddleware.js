const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

module.exports = function (requiredRole) {
  return function (req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      if (requiredRole) {
        // allow superadmin to satisfy admin-required routes
        const userRole = payload.role;
        const allowed = userRole === requiredRole || userRole === 'superadmin';
        if (!allowed) {
          return res.status(403).json({ error: 'Forbidden: insufficient role' });
        }
      }
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};
