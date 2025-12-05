const jwt = require('jsonwebtoken');

function authMiddleware(required = true) {
  return (req, res, next) => {
    console.log('🔐 authMiddleware executing for:', req.method, req.path);
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (!token) {
        console.log('⚠️ No token found');
        if (required) {
          return res.status(401).json({ message: 'Authorization token missing' });
        }
        req.user = null;
        return next();
      }

      console.log('🔐 Verifying token...');
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'recoletos-secret');
      req.user = payload;
      console.log('✅ Token verified, user:', { id: payload.id, role: payload.role });
      return next();
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      if (required) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      req.user = null;
      return next();
    }
  };
}

module.exports = authMiddleware;

