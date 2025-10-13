const axios = require('axios');

const checkTurnstile = async (req, res, next) => {
  const token = req.body['cf-turnstile-response'];
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

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
      next();
    } else {
      res.status(400).json({ success: false, message: 'Turnstile verification failed.', 'error-codes': data['error-codes'] });
    }
  } catch (error) {
    console.error('Turnstile verification request failed:', error);
    res.status(500).json({ success: false, message: 'Error verifying Turnstile token.' });
  }
};

module.exports = { checkTurnstile };