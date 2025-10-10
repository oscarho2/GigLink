module.exports = function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ msg: 'Administrator privileges required' });
  }
  next();
};
