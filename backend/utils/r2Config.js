const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Check if R2 credentials are properly configured
const isR2Configured = Boolean(
  process.env.R2_ENDPOINT &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME &&
  !process.env.R2_ENDPOINT.includes('your-account-id') &&
  !process.env.R2_ACCESS_KEY_ID.includes('your_r2_access_key')
);

let s3Client = null;
if (isR2Configured) {
  s3Client = new S3Client({
    endpoint: process.env.R2_ENDPOINT,
    region: 'auto',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });
} else {
  console.warn('R2 storage is not configured. File uploads will be disabled.');
}

const uploadsDir = path.join(__dirname, '..', 'uploads');

const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const determineFolder = (mimetype) => {
  if (!mimetype) return 'misc';
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'misc';
};

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = determineFolder(file.mimetype);
    const targetDir = path.join(uploadsDir, folder);
    ensureDirExists(targetDir);
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_\.]/g, '-')
      .substring(0, 80);
    cb(null, `${base || 'file'}-${Date.now()}${ext.toLowerCase()}`);
  }
});

const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: isR2Configured ? memoryStorage : diskStorage,
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = {
      // Images
      'image/jpeg': true,
      'image/jpg': true,
      'image/png': true,
      'image/gif': true,
      'image/webp': true,
      // Videos
      'video/mp4': true,
      'video/mpeg': true,
      'video/quicktime': true,
      'video/x-msvideo': true,
      'video/webm': true,
      // Audio
      'audio/mpeg': true,
      'audio/wav': true,
      'audio/ogg': true,
      'audio/mp3': true,
      'audio/mp4': true,
      // Documents
      'application/pdf': true,
      'application/msword': true,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
      'application/vnd.ms-excel': true,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
      'application/vnd.ms-powerpoint': true,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
      'text/plain': true,
      'text/csv': true,
      // Archives
      'application/zip': true,
      'application/x-rar-compressed': true,
      'application/x-7z-compressed': true
    };

    if (allowedTypes[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for large media files
  }
});

// Helper function to delete files
const deleteFile = async (fileKey) => {
  if (!isR2Configured || !s3Client) {
    console.error('Error deleting file: R2 is not configured.');
    return false;
  }
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey
    }));
    return true;
  } catch (error) {
    console.error('Error deleting file from R2:', error);
    return false;
  }
};

// Helper function to generate signed URLs for private files
const getPublicUrl = (fileKey) => {
  const normalizedKey = fileKey.replace(/^\/+/, '');
  if (isR2Configured) {
    const base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    return `${base}/${normalizedKey}`;
  }
  return `/uploads/${normalizedKey}`;
};

// Export configuration status for use in other modules
const getStorageConfig = () => ({
  isR2Configured,
  uploadsDir
});

const uploadBufferToR2 = async (file) => {
  if (!isR2Configured || !s3Client) {
    throw new Error('R2 storage is not configured.');
  }

  const folder = determineFolder(file.mimetype);
  const ext = path.extname(file.originalname) || '';
  const base = path.basename(file.originalname, ext)
    .replace(/[^a-zA-Z0-9-_\.]/g, '-')
    .substring(0, 80) || 'file';
  const filename = `${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext.toLowerCase()}`;
  const key = `${folder}/${filename}`.replace(/\\+/g, '/');

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'
    }
  });

  await upload.done();

  return {
    key,
    url: getPublicUrl(key),
    filename
  };
};

const uploadFileFromDiskToR2 = async (localPath, key, contentType = 'application/octet-stream') => {
  if (!isR2Configured || !s3Client) {
    throw new Error('R2 storage is not configured.');
  }

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: fs.createReadStream(localPath),
      ContentType: contentType,
      ACL: 'public-read'
    }
  });

  await upload.done();

  return {
    key,
    url: getPublicUrl(key)
  };
};

module.exports = {
  s3Client,
  upload,
  uploadBufferToR2,
  uploadFileFromDiskToR2,
  deleteFile,
  getPublicUrl,
  getStorageConfig,
  determineFolder,
  uploadsDir
};
