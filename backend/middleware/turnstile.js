const axios = require('axios');

const checkTurnstile = async (req, res, next) => {
  // Check if turnstile is properly configured
  if (!process.env.TURNSTILE_SECRET_KEY) {
    console.warn('TURNSTILE_SECRET_KEY not found, skipping verification');
    return next();
  }

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
      },
      timeout: 10000 // 10 second timeout to prevent hanging
    });

    const { success, challenge_ts, hostname, 'error-codes': errorCodes } = response.data;

    if (!success) {
      console.error('Turnstile verification failed:', errorCodes);
      return res.status(400).json({
        success: false,
        error: 'Captcha verification failed. Please try again.'
      });
    }

    next();
  } catch (error) {
    console.error('Turnstile verification error:', error.message);
    
    // If it's a timeout error, it might be a network issue
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        success: false,
        error: 'Captcha verification timeout. Please try again.'
      });
    }
    
    // For other errors, allow the request to continue in non-production environments to avoid complete failures
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Turnstile verification failed in development, allowing request to continue');
      return next();
    }
    
    return res.status(500).json({
      success: false,
      error: 'Captcha verification service unavailable. Please try again.'
    });
  }
};

module.exports = { checkTurnstile };
