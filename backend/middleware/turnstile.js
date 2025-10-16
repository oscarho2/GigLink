const axios = require('axios');

const truthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
const DEV_BYPASS_TOKENS = new Set(['bypass', 'dev-bypass', 'turnstile-bypass']);

const isDevBypassAllowed = () => {
  if (truthy(process.env.ENFORCE_TURNSTILE_DEV)) {
    return false;
  }
  return (process.env.NODE_ENV || '').toLowerCase() !== 'production';
};

const shouldBypassWithToken = (token) => {
  if (!token) {
    return false;
  }
  if (!isDevBypassAllowed()) {
    return false;
  }
  return DEV_BYPASS_TOKENS.has(String(token).toLowerCase());
};

const isBypassEnabled = () => {
  const disableFlag = truthy(process.env.DISABLE_TURNSTILE);
  const devFlag = truthy(process.env.DEV_MODE || process.env.DEVELOPMENT_MODE);
  const secretMissing = !process.env.TURNSTILE_SECRET_KEY;

  if (disableFlag || devFlag) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Turnstile] Verification disabled via development flag.');
    }
    return true;
  }

  if (secretMissing) {
    console.warn('[Turnstile] TURNSTILE_SECRET_KEY not set. Skipping verification.');
    return true;
  }

  return false;
};

const resolveToken = (req) => {
  const body = req.body || {};
  return (
    body['cf-turnstile-response'] ||
    body.turnstileToken ||
    req.headers['cf-turnstile-response'] ||
    null
  );
};

const checkTurnstile = async (req, res, next) => {
  if (isBypassEnabled()) {
    return next();
  }

  const token = resolveToken(req);
  if (shouldBypassWithToken(token)) {
    console.warn('[Turnstile] Development bypass token accepted; skipping verification.');
    return next();
  }

  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Turnstile token not found.' });
  }

  try {
    const response = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;

    if (data.success) {
      return next();
    }

    return res.status(400).json({
      success: false,
      message: 'Turnstile verification failed.',
      'error-codes': data['error-codes'],
    });
  } catch (error) {
    const shouldBypassOnError = truthy(process.env.ALLOW_TURNSTILE_FALLBACK);

    console.error('Turnstile verification request failed:', error.message || error);

    if (shouldBypassOnError && process.env.NODE_ENV !== 'production') {
      console.warn('[Turnstile] Verification failed but ALLOW_TURNSTILE_FALLBACK is enabled. Proceeding without Turnstile.');
      return next();
    }

    return res.status(503).json({ success: false, message: 'Unable to verify Turnstile token.' });
  }
};

module.exports = { checkTurnstile };
