const axios = require('axios');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');
const { pushTemplates } = require('./pushNotificationService');

let authInstance = null;
let cachedProjectId = null;

const initAuth = () => {
  if (authInstance) return authInstance;

  const options = {
    scopes: ['https://www.googleapis.com/auth/firebase.messaging']
  };

  if (process.env.FCM_CREDENTIALS_B64) {
    try {
      const json = JSON.parse(Buffer.from(process.env.FCM_CREDENTIALS_B64, 'base64').toString('utf8'));
      options.credentials = json;
    } catch (err) {
      console.error('[FCM] Failed to parse FCM_CREDENTIALS_B64:', err.message);
    }
  } else if (process.env.FCM_CREDENTIALS_PATH) {
    options.keyFile = path.resolve(process.env.FCM_CREDENTIALS_PATH);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    options.keyFile = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }

  authInstance = new GoogleAuth(options);
  return authInstance;
};

const isFcmConfigured = () => {
  return Boolean(
    process.env.FCM_CREDENTIALS_B64 ||
    process.env.FCM_CREDENTIALS_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
};

const getAccessToken = async () => {
  const auth = initAuth();
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  if (!cachedProjectId) {
    cachedProjectId = await auth.getProjectId();
  }
  return { token: accessToken.token, projectId: cachedProjectId };
};

const buildPayload = (notificationType, templateData) => {
  const template = pushTemplates[notificationType];
  const basePayload = template && Array.isArray(templateData)
    ? template(...templateData)
    : { title: 'GigLink', body: 'You have a new notification', data: {} };

  const title = basePayload.title || 'GigLink';
  const body = basePayload.body || 'You have a new notification';
  const data = basePayload.data || {};

  const normalizedData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v == null ? '' : String(v)])
  );

  return {
    notification: { title, body },
    data: normalizedData
  };
};

const sendFcmNotification = async ({ deviceToken, notificationType, templateData }) => {
  if (!deviceToken) {
    return { success: false, error: 'Missing device token' };
  }

  try {
    const { token: accessToken, projectId } = await getAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    const payload = {
      message: {
        token: deviceToken,
        ...buildPayload(notificationType, templateData)
      }
    };

    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return { success: true, response: res.data, deviceToken };
  } catch (err) {
    const errorBody = err.response?.data || err.message;
    return { success: false, error: errorBody, deviceToken };
  }
};

const sendFcmNotificationToTokens = async (tokens, notificationType, templateData) => {
  if (!isFcmConfigured()) {
    return { success: false, error: 'FCM not configured' };
  }

  const validTokens = (tokens || []).filter(Boolean);
  if (!validTokens.length) {
    return { success: true, results: [], totalSent: 0, totalFailed: 0 };
  }

  const results = [];
  for (const token of validTokens) {
    const result = await sendFcmNotification({ deviceToken: token, notificationType, templateData });
    results.push(result);
  }

  return {
    success: true,
    results,
    totalSent: results.filter(r => r.success).length,
    totalFailed: results.filter(r => !r.success).length
  };
};

module.exports = {
  isFcmConfigured,
  sendFcmNotificationToTokens
};
