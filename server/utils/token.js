const jwt = require('jsonwebtoken');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'recoletos-secret', {
    expiresIn: '12h',
  });
}

module.exports = {
  signToken,
};

