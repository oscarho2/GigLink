const { verifyTurnstileToken } = require('../utils/turnstile');

const checkTurnstile = async (req, res, next) => {
  const turnstileToken = req.body.turnstileToken || req.headers['x-turnstile-token'];

  if (!turnstileToken) {
    // For development, you might want to bypass this check
    if (process.env.NODE_ENV === 'development') {
      console.warn('Turnstile token missing, but bypassing in development.');
      return next();
    }
    return res.status(400).json({ captchaRequired: true, message: 'CAPTCHA token is missing.' });
  }

  const remoteIp = req.ip;
  const verificationResult = await verifyTurnstileToken(turnstileToken, remoteIp);

  if (!verificationResult.ok) {
    console.error('Turnstile verification failed:', verificationResult.error || verificationResult.result);
    return res.status(400).json({ captchaRequired: true, message: 'Failed to verify CAPTCHA. Please try again.' });
  }

  next();
};

module.exports = { checkTurnstile };
