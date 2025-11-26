const jwt = require('jsonwebtoken');

function authMiddleware(required = true) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      if (required) {
        return res.status(401).json({ message: 'Authorization token missing' });
      }
      req.user = null;
      return next();
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'recoletos-secret');
      req.user = payload;
      return next();
    } catch (error) {
      if (required) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      req.user = null;
      return next();
    }
  };
}

module.exports = authMiddleware;

