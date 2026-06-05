// Auth middleware - JWT verification for protected endpoints
const jwt = require('jsonwebtoken');

function validateAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

function unauthorized(res) {
  res.status(401).json({ error: 'Unauthorized. Please log in again.' });
}

module.exports = { validateAuth, unauthorized };
