const CACHE_TTL_MS = Math.max(parseInt(process.env.AUTH_USER_CACHE_TTL_MS || '30000', 10) || 30000, 1000);

const authUserCache = new Map();

const getCachedAuthUser = (userId) => {
  const key = String(userId || '');
  if (!key) {
    return null;
  }

  const entry = authUserCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    authUserCache.delete(key);
    return null;
  }

  return entry.value;
};

const setCachedAuthUser = (userId, value) => {
  const key = String(userId || '');
  if (!key || !value) {
    return;
  }

  authUserCache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
};

const invalidateCachedAuthUser = (userId) => {
  const key = String(userId || '');
  if (!key) {
    return;
  }
  authUserCache.delete(key);
};

module.exports = {
  CACHE_TTL_MS,
  getCachedAuthUser,
  setCachedAuthUser,
  invalidateCachedAuthUser
};
