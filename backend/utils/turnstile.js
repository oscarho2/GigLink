const querystring = require('querystring');

async function verifyTurnstileToken(token, remoteip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true }; // do not block in dev without a secret
  if (!token) return { ok: false, reason: 'missing_token' };

  const body = querystring.stringify({
    secret,
    response: token,
    remoteip,
  });
  const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  try {
    if (typeof fetch === 'function') {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const json = await res.json();
      return { ok: Boolean(json.success), result: json };
    }
  } catch (e) {
    return { ok: false, error: e };
  }

  // Fallback to https if fetch is unavailable
  const https = require('https');
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  };
  try {
    const json = await new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    return { ok: Boolean(json.success), result: json };
  } catch (e) {
    return { ok: false, error: e };
  }
}

module.exports = { verifyTurnstileToken };

