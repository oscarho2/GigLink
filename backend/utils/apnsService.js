const crypto = require('crypto');
const http2 = require('http2');
const fs = require('fs');
const path = require('path');
const { pushTemplates } = require('./pushNotificationService');

const loadPrivateKey = () => {
  if (process.env.APNS_KEY) {
    return process.env.APNS_KEY.replace(/\\n/g, '\n');
  }

  if (process.env.APNS_KEY_B64) {
    try {
      return Buffer.from(process.env.APNS_KEY_B64, 'base64').toString('utf8');
    } catch (err) {
      console.error('[APNs] Failed to decode APNS_KEY_B64:', err.message);
    }
  }

  if (process.env.APNS_KEY_PATH) {
    try {
      const keyPath = path.isAbsolute(process.env.APNS_KEY_PATH)
        ? process.env.APNS_KEY_PATH
        : path.join(process.cwd(), process.env.APNS_KEY_PATH);
      return fs.readFileSync(keyPath, 'utf8');
    } catch (err) {
      console.error('[APNs] Failed to read APNS_KEY_PATH:', err.message);
    }
  }

  return null;
};

const apnsConfig = {
  key: loadPrivateKey(),
  keyId: process.env.APNS_KEY_ID || '',
  teamId: process.env.APNS_TEAM_ID || '',
  topic: process.env.APNS_TOPIC || process.env.APNS_BUNDLE_ID || '',
  defaultEnvironment: process.env.APNS_ENV === 'sandbox' ? 'sandbox' : 'production'
};

const isApnsConfigured = () => {
  return Boolean(apnsConfig.key && apnsConfig.keyId && apnsConfig.teamId && apnsConfig.topic);
};

const base64UrlEncode = (input) => {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const buildJwt = () => {
  if (!isApnsConfigured()) {
    throw new Error('APNs is not configured');
  }

  const header = base64UrlEncode(JSON.stringify({ alg: 'ES256', kid: apnsConfig.keyId }));
  const iat = Math.floor(Date.now() / 1000);
  const body = base64UrlEncode(JSON.stringify({ iss: apnsConfig.teamId, iat }));
  const unsignedToken = `${header}.${body}`;

  const signer = crypto.createSign('SHA256');
  signer.update(unsignedToken);
  signer.end();

  const signature = signer.sign({ key: apnsConfig.key, format: 'pem', type: 'pkcs8' });
  return `${unsignedToken}.${base64UrlEncode(signature)}`;
};

const resolveTemplate = (notificationType) => {
  if (pushTemplates[notificationType]) {
    return pushTemplates[notificationType];
  }

  const camelFromUnderscore = typeof notificationType === 'string'
    ? notificationType.replace(/_([a-z])/g, (_, char) => char.toUpperCase())
    : '';

  if (camelFromUnderscore && pushTemplates[camelFromUnderscore]) {
    return pushTemplates[camelFromUnderscore];
  }

  return null;
};

const buildPayload = (notificationType, templateData) => {
  const template = resolveTemplate(notificationType);
  const basePayload = template && Array.isArray(templateData)
    ? template(...templateData)
    : { title: 'GigLink', body: 'You have a new notification', data: {} };

  const title = basePayload.title || 'GigLink';
  const body = basePayload.body || 'You have a new notification';
  const customData = basePayload.data || {};
  const sound = basePayload.sound || 'default';

  const payload = {
    aps: {
      alert: { title, body },
      sound
    },
    data: customData
  };

  if (typeof basePayload.badge === 'number') {
    payload.aps.badge = basePayload.badge;
  }

  return payload;
};

const sendApnsNotification = async ({ deviceToken, environment = apnsConfig.defaultEnvironment, notificationType, templateData }) => {
  if (!isApnsConfigured()) {
    return { success: false, error: 'APNs not configured' };
  }

  if (!deviceToken) {
    return { success: false, error: 'Missing device token' };
  }

  const host = environment === 'sandbox'
    ? 'https://api.sandbox.push.apple.com'
    : 'https://api.push.apple.com';

  const payload = buildPayload(notificationType, templateData);
  const jwt = buildJwt();

  return new Promise((resolve) => {
    const client = http2.connect(host);
    let statusCode;
    let responseData = '';
    let resolved = false;

    client.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      resolve({ success: false, error: err.message, deviceToken });
    });

    const request = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      'content-type': 'application/json',
      'apns-topic': apnsConfig.topic,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      authorization: `bearer ${jwt}`
    });

    request.setEncoding('utf8');
    request.on('response', (headers) => {
      statusCode = headers[':status'];
    });

    request.on('data', (chunk) => {
      responseData += chunk;
    });

    request.on('end', () => {
      if (resolved) return;
      client.close();
      resolved = true;

      let parsedBody = null;
      if (responseData) {
        try {
          parsedBody = JSON.parse(responseData);
        } catch {
          parsedBody = responseData;
        }
      }

      const success = statusCode >= 200 && statusCode < 300;
      resolve({
        success,
        status: statusCode,
        body: parsedBody,
        deviceToken
      });
    });

    request.on('error', (err) => {
      if (resolved) return;
      client.close();
      resolved = true;
      resolve({ success: false, error: err.message, status: statusCode, deviceToken });
    });

    request.write(JSON.stringify(payload));
    request.end();
  });
};

const sendApnsNotificationToDevices = async (devices, notificationType, templateData) => {
  if (!isApnsConfigured()) {
    return { success: false, error: 'APNs not configured' };
  }

  if (!Array.isArray(devices) || devices.length === 0) {
    return { success: true, results: [], totalSent: 0, totalFailed: 0 };
  }

  const isLikelyApnsToken = (token) => /^[A-Fa-f0-9]{64,128}$/.test(token || '');
  const validDevices = devices.filter((d) => isLikelyApnsToken(d.deviceToken));
  const skippedInvalid = devices.length - validDevices.length;

  const results = [];

  for (const device of validDevices) {
    try {
      const result = await sendApnsNotification({
        deviceToken: device.deviceToken,
        environment: device.environment || apnsConfig.defaultEnvironment,
        notificationType,
        templateData
      });
      results.push(result);
    } catch (err) {
      results.push({ success: false, error: err.message, deviceToken: device?.deviceToken });
    }
  }

  try {
    console.log('[APNs] delivery results', JSON.stringify({
      results,
      skippedInvalid
    }, null, 2));
  } catch (_) {
    // ignore logging issues
  }

  return {
    success: true,
    results,
    totalSent: results.filter(r => r.success).length,
    totalFailed: results.filter(r => !r.success).length
  };
};

module.exports = {
  isApnsConfigured,
  sendApnsNotification,
  sendApnsNotificationToDevices
};
