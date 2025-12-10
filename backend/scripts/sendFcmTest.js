/**
 * Send a test push via Firebase Cloud Messaging HTTP v1 using a service account.
 *
 * Prereqs:
 * - Install backend deps (google-auth-library is already in package.json).
 * - Download a Firebase service account JSON for this project.
 * - Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *
 * Usage:
 *   node scripts/sendFcmTest.js <deviceToken> [title] [body]
 */
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const path = require('path');

const deviceToken = process.argv[2];
const title = process.argv[3] || 'Test';
const body = process.argv[4] || 'Hello from FCM v1';

if (!deviceToken) {
  console.error('Usage: node scripts/sendFcmTest.js <deviceToken> [title] [body]');
  process.exit(1);
}

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
  process.exit(1);
}

const keyFile = path.resolve(credentialsPath);

async function main() {
  const auth = new GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging']
  });

  const client = await auth.getClient();
  const projectId = await auth.getProjectId();
  const accessToken = await client.getAccessToken();

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const payload = {
    message: {
      token: deviceToken,
      notification: {
        title,
        body
      }
    }
  };

  const res = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('FCM response:', res.data);
}

main().catch((err) => {
  const msg = err.response?.data || err.message || err;
  console.error('FCM send failed:', msg);
  process.exit(1);
});
