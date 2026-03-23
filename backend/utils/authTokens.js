const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const SESSION_TOKEN_TTL = process.env.JWT_EXPIRES_IN || '7d';

const generateOpaqueToken = () => crypto.randomBytes(32).toString('hex');

const hashOpaqueToken = (token) => (
  crypto.createHash('sha256').update(String(token || '')).digest('hex')
);

const signSessionToken = (payload, callback) => (
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: SESSION_TOKEN_TTL }, callback)
);

module.exports = {
  SESSION_TOKEN_TTL,
  generateOpaqueToken,
  hashOpaqueToken,
  signSessionToken
};
