const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

// Configure AWS SDK for Cloudflare R2
const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT, // e.g., 'https://account-id.r2.cloudflarestorage.com'
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  region: 'auto', // R2 uses 'auto' as region
  signatureVersion: 'v4',
  s3ForcePathStyle: true // Required for R2
});

// Multer S3 configuration for R2
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.R2_BUCKET_NAME,
    acl: 'public-read', // Make files publicly accessible
    key: function (req, file, cb) {
      // Generate unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = file.originalname.split('.').pop();
      const name = file.originalname.split('.').slice(0, -1).join('.');
      const filename = `${name}-${uniqueSuffix}.${ext}`;
      
      // Organize files by type
      let folder = 'misc';
      if (file.mimetype.startsWith('image/')) {
        folder = 'images';
      } else if (file.mimetype.startsWith('video/')) {
        folder = 'videos';
      } else if (file.mimetype.startsWith('audio/')) {
        folder = 'audio';
      }
      
      cb(null, `${folder}/${filename}`);
    },
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        uploadedBy: req.user ? req.user.id : 'anonymous'
      });
    },
    contentType: multerS3.AUTO_CONTENT_TYPE
  }),
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

// Helper function to delete files from R2
const deleteFile = async (fileKey) => {
  try {
    const params = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey
    };
    
    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('Error deleting file from R2:', error);
    return false;
  }
};

// Helper function to generate signed URLs for private files
const getSignedUrl = (fileKey, expiresIn = 3600) => {
  const params = {
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
    Expires: expiresIn
  };
  
  return s3.getSignedUrl('getObject', params);
};

// Helper function to get public URL for files
const getPublicUrl = (fileKey) => {
  return `${process.env.R2_PUBLIC_URL}/${fileKey}`;
};

module.exports = {
  s3,
  upload,
  deleteFile,
  getSignedUrl,
  getPublicUrl
};