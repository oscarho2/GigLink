const fsp = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const { getStorageConfig, uploadBufferToR2 } = require('./r2Config');

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
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unexpected response ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = getExtension(contentType);
    const filename = `${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await response.arrayBuffer());

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
