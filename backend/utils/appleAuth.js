const axios = require('axios');
const jwt = require('jsonwebtoken');
const { createPublicKey } = require('crypto');

let cachedAppleKeys = null;
let cachedKeysFetchedAt = 0;
const KEY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const getRequiredEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} environment variable is not configured for Apple Sign-In`);
  }
  return value;
};

const getApplePrivateKey = () => {
  const rawKey = getRequiredEnv('APPLE_PRIVATE_KEY');
  // Support keys stored with escaped newlines
  return rawKey.replace(/\\n/g, '\n');
};

const getAppleClientIds = () => {
  const clientIds = [getRequiredEnv('APPLE_CLIENT_ID')];

  const iosBundleId = process.env.APPLE_IOS_BUNDLE_ID || process.env.APPLE_IOS_CLIENT_ID;
  if (iosBundleId && typeof iosBundleId === 'string') {
    clientIds.push(iosBundleId.trim());
  }

  const additionalIdsEnv = process.env.APPLE_ADDITIONAL_CLIENT_IDS;
  if (additionalIdsEnv && typeof additionalIdsEnv === 'string') {
    additionalIdsEnv
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .forEach((id) => clientIds.push(id));
  }

  return Array.from(new Set(clientIds.filter(Boolean)));
};

const generateClientSecret = () => {
  const teamId = getRequiredEnv('APPLE_TEAM_ID');
  const clientId = getRequiredEnv('APPLE_CLIENT_ID');
  const keyId = getRequiredEnv('APPLE_KEY_ID');

  const payload = {
    iss: teamId,
    aud: 'https://appleid.apple.com',
    sub: clientId
  };

  // Apple allows client secrets to live for up to 6 months. We'll use 5 months to be safe.
  const expiresInSeconds = 60 * 60 * 24 * 30 * 5;

  return jwt.sign(payload, getApplePrivateKey(), {
    algorithm: 'ES256',
    expiresIn: expiresInSeconds,
    keyid: keyId
  });
};

const fetchAppleKeys = async () => {
  if (cachedAppleKeys && Date.now() - cachedKeysFetchedAt < KEY_CACHE_TTL_MS) {
    return cachedAppleKeys;
  }

  const response = await axios.get('https://appleid.apple.com/auth/keys', { timeout: 5000 });
  cachedAppleKeys = response.data.keys || [];
  cachedKeysFetchedAt = Date.now();
  return cachedAppleKeys;
};

const buildPemFromJwk = (jwk) => {
  const publicKeyObject = createPublicKey({
    key: jwk,
    format: 'jwk'
  });

  return publicKeyObject.export({ format: 'pem', type: 'spki' });
};

const verifyIdToken = async (idToken) => {
  if (!idToken) {
    throw new Error('Apple identity token is required for verification');
  }

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded) {
    throw new Error('Unable to decode Apple identity token');
  }

  const keys = await fetchAppleKeys();
  const jwk = keys.find((key) => key.kid === decoded.header.kid);
  if (!jwk) {
    throw new Error('Unable to retrieve matching Apple public key');
  }

  const pemKey = buildPemFromJwk(jwk);
  const allowedAudiences = getAppleClientIds();

  return jwt.verify(idToken, pemKey, {
    algorithms: ['RS256'],
    audience: allowedAudiences,
    issuer: 'https://appleid.apple.com'
  });
};

const exchangeAuthorizationCode = async (authorizationCode) => {
  const clientId = getRequiredEnv('APPLE_CLIENT_ID');
  const redirectUri = process.env.APPLE_REDIRECT_URI;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: generateClientSecret(),
    code: authorizationCode,
    grant_type: 'authorization_code'
  });

  if (redirectUri && typeof redirectUri === 'string') {
    body.set('redirect_uri', redirectUri);
  }

  const response = await axios.post('https://appleid.apple.com/auth/token', body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 5000
  });

  return response.data;
};

module.exports = {
  generateClientSecret,
  verifyIdToken,
  exchangeAuthorizationCode
};
