const fsp = require('fs/promises');
const path = require('path');
const dns = require('dns').promises;
const net = require('net');
const { randomUUID } = require('crypto');
const { getStorageConfig, uploadBufferToR2 } = require('./r2Config');

const MAX_IMAGE_DOWNLOAD_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;

const isPrivateIpv4 = (ip) => {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
};

const isPrivateIpv6 = (ip) => {
  const normalized = ip.toLowerCase();
  return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
};

const assertSafeRemoteImageUrl = async (value) => {
  const parsed = new URL(value);

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS image URLs are allowed');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Image URL credentials are not allowed');
  }

  if (parsed.port && parsed.port !== '443') {
    throw new Error('Unexpected image URL port');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Local image URLs are not allowed');
  }

  const resolved = await dns.lookup(hostname, { all: true });
  if (!resolved.length) {
    throw new Error('Unable to resolve remote image host');
  }

  for (const entry of resolved) {
    if (!net.isIP(entry.address)) {
      continue;
    }

    if ((entry.family === 4 && isPrivateIpv4(entry.address)) || (entry.family === 6 && isPrivateIpv6(entry.address))) {
      throw new Error('Private network image URLs are not allowed');
    }
  }

  return parsed.toString();
};

const ensureDirExists = async (dirPath) => {
  if (!dirPath) {
    return;
  }
  try {
    await fsp.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

const getExtension = (contentType = '') => {
  const subtype = contentType.split('/')[1] || '';
  const clean = subtype.split(';')[0]?.trim();
  if (!clean) {
    return 'jpg';
  }
  if (clean === 'jpeg') {
    return 'jpg';
  }
  return clean;
};

const normalizeUploadsPath = (filename) => `/${path.posix.join('uploads', 'images', filename)}`;

const downloadImage = async (url, directory) => {
  if (!url) {
    return null;
  }

  const { isR2Configured } = getStorageConfig();
  const targetDir = directory || path.join(__dirname, '..', 'uploads', 'images');

  try {
    const safeUrl = await assertSafeRemoteImageUrl(url);
    const response = await fetch(safeUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (!response.ok) {
      throw new Error(`Unexpected response ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.toLowerCase().startsWith('image/')) {
      throw new Error('Remote file is not an image');
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_IMAGE_DOWNLOAD_BYTES) {
      throw new Error('Remote image exceeds size limit');
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_DOWNLOAD_BYTES) {
      throw new Error('Remote image exceeds size limit');
    }

    const extension = getExtension(contentType);
    const filename = `${randomUUID()}.${extension}`;
    const buffer = Buffer.from(arrayBuffer);

    if (isR2Configured) {
      try {
        const result = await uploadBufferToR2({
          buffer,
          originalname: filename,
          mimetype: contentType
        });
        return result.key;
      } catch (uploadError) {
        console.error('R2 upload failed, falling back to local storage:', uploadError?.message || uploadError);
        // Fall back to local storage below
      }
    }

    await ensureDirExists(targetDir);
    const imagePath = path.join(targetDir, filename);
    await fsp.writeFile(imagePath, buffer);

    return normalizeUploadsPath(filename);
  } catch (error) {
    console.error('Error downloading image:', error?.message || error);
    return null;
  }
};

module.exports = { downloadImage };
