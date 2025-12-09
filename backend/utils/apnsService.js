const crypto = require('crypto');
const http2 = require('http2');
const fs = require('fs');
const path = require('path');
const { pushTemplates } = require('./pushNotificationService');

const loadPrivateKey = (prefix = '') => {
  const keyEnv = `APNS_${prefix}KEY`;
  const keyB64Env = `APNS_${prefix}KEY_B64`;
  const keyPathEnv = `APNS_${prefix}KEY_PATH`;

  if (process.env[keyEnv]) {
    return process.env[keyEnv].replace(/\\n/g, '\n');
  }

  if (process.env[keyB64Env]) {
    try {
      return Buffer.from(process.env[keyB64Env], 'base64').toString('utf8');
    } catch (err) {
      console.error(`[APNs] Failed to decode ${keyB64Env}:`, err.message);
    }
  }

  if (process.env[keyPathEnv]) {
    try {
      const configuredPath = process.env[keyPathEnv];
      const keyPath = path.isAbsolute(configuredPath)
        ? configuredPath
        : path.join(process.cwd(), configuredPath);
      return fs.readFileSync(keyPath, 'utf8');
    } catch (err) {
      console.error(`[APNs] Failed to read ${keyPathEnv}:`, err.message);
    }
  }

  return null;
};

const topic = process.env.APNS_TOPIC || process.env.APNS_BUNDLE_ID || '';

const apnsConfig = {
  shared: {
    key: loadPrivateKey(),
    keyId: process.env.APNS_KEY_ID || '',
    teamId: process.env.APNS_TEAM_ID || '',
    topic
  },
  sandboxOverrides: {
    key: loadPrivateKey('SANDBOX_'),
    keyId: process.env.APNS_SANDBOX_KEY_ID || '',
    teamId: process.env.APNS_SANDBOX_TEAM_ID || ''
  },
  defaultEnvironment: process.env.APNS_ENV === 'sandbox' ? 'sandbox' : 'production'
};

const getApnsEnvironmentConfig = (environment = apnsConfig.defaultEnvironment) => {
  const normalizedEnv = environment === 'sandbox' ? 'sandbox' : 'production';
  const overrides = normalizedEnv === 'sandbox' ? apnsConfig.sandboxOverrides : {};

  return {
    key: overrides.key || apnsConfig.shared.key,
    keyId: overrides.keyId || apnsConfig.shared.keyId,
    teamId: overrides.teamId || apnsConfig.shared.teamId,
    topic: apnsConfig.shared.topic,
    environment: normalizedEnv
  };
};

const isApnsConfigured = (environment = null) => {
  const environments = environment ? [environment] : ['production', 'sandbox'];

  return environments.some((env) => {
    const config = getApnsEnvironmentConfig(env);
    return Boolean(config.key && config.keyId && config.teamId && config.topic);
  });
};

const base64UrlEncode = (input) => {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const buildJwt = (config) => {
  if (!config || !config.key || !config.keyId || !config.teamId) {
    throw new Error('APNs is not configured');
  }

  const header = base64UrlEncode(JSON.stringify({ alg: 'ES256', kid: config.keyId }));
  const iat = Math.floor(Date.now() / 1000);
  const body = base64UrlEncode(JSON.stringify({ iss: config.teamId, iat }));
  const unsignedToken = `${header}.${body}`;

  const signer = crypto.createSign('SHA256');
  signer.update(unsignedToken);
  signer.end();

  const signature = signer.sign({ key: config.key, format: 'pem', type: 'pkcs8' });
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
  const envConfig = getApnsEnvironmentConfig(environment);

  if (!isApnsConfigured(envConfig.environment)) {
    return { success: false, error: 'APNs not configured', environment: envConfig.environment };
  }

  if (!deviceToken) {
    return { success: false, error: 'Missing device token', environment: envConfig.environment };
  }

  const host = envConfig.environment === 'sandbox'
    ? 'https://api.sandbox.push.apple.com'
    : 'https://api.push.apple.com';

  const payload = buildPayload(notificationType, templateData);
  const jwt = buildJwt(envConfig);

  return new Promise((resolve) => {
    const client = http2.connect(host);
    let statusCode;
    let responseData = '';
    let resolved = false;

    client.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      resolve({ success: false, error: err.message, deviceToken, environment: envConfig.environment });
    });

    const request = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      'content-type': 'application/json',
      'apns-topic': envConfig.topic,
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
        deviceToken,
        environment: envConfig.environment
      });
    });

    request.on('error', (err) => {
      if (resolved) return;
      client.close();
      resolved = true;
      resolve({
        success: false,
        error: err.message,
        status: statusCode,
        deviceToken,
        environment: envConfig.environment
      });
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
      const environment = device.environment || apnsConfig.defaultEnvironment;
      const result = await sendApnsNotification({
        deviceToken: device.deviceToken,
        environment,
        notificationType,
        templateData
      });
      results.push({ ...result, environment });
    } catch (err) {
      results.push({ success: false, error: err.message, deviceToken: device?.deviceToken, environment: device?.environment });
    }
  }

  try {
    console.log('[APNs] delivery results', JSON.stringify({
      results,
      skippedInvalid,
      defaultEnvironment: apnsConfig.defaultEnvironment
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
