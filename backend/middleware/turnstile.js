const axios = require('axios');

const checkTurnstile = async (req, res, next) => {
  // Skip turnstile check for development or if disabled
  if (process.env.NODE_ENV === 'development' && !process.env.TURNSTILE_FORCE_ENABLE) {
    return next();
  }

  const turnstileResponse = req.body['cf-turnstile-response'] || req.headers['cf-turnstile-response'];

  if (!turnstileResponse) {
    return res.status(400).json({
      success: false,
      error: 'Captcha verification required'
    });
  }

  try {
    const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: turnstileResponse,
      remoteip: req.ip
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const { success, challenge_ts, hostname, errorCodes } = response.data;

    if (!success) {
      console.error('Turnstile verification failed:', errorCodes);
      return res.status(400).json({
        success: false,
        error: 'Captcha verification failed. Please try again.'
      });
    }

    // Optional: Additional checks
    if (hostname && hostname !== process.env.HOSTNAME) {
      // Verify the hostname matches (optional security check)
      console.log(`Warning: Turnstile hostname mismatch - got ${hostname}, expected ${process.env.HOSTNAME || 'not set'}`);
    }

    next();
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Captcha verification error. Please try again.'
    });
  }
};

module.exports = { checkTurnstile };
