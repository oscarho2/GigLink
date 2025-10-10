const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isAdminEmail } = require('../utils/adminAuth');

module.exports = async function auth(req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const payloadUser = decoded.user || {};
    if (!payloadUser.id) {
      return res.status(401).json({ msg: 'Token payload missing user id' });
    }

    const user = await User.findById(payloadUser.id).select('email accountStatus');
    if (!user) {
      return res.status(401).json({ msg: 'User no longer exists' });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({ msg: 'Account suspended. Please contact support for assistance.' });
    }

    req.user = {
      ...payloadUser,
      id: user._id.toString(),
      email: user.email,
      isAdmin: isAdminEmail(user.email)
    };

    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
