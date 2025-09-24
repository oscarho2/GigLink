const express = require('express');
const auth = require('../middleware/auth');
const { upload, deleteFile, getPublicUrl, getStorageConfig } = require('../utils/r2Config');
const path = require('path');
const router = express.Router();

// R2 upload configuration is handled in r2Config.js

// @route   POST /api/upload
// @desc    Upload a file to storage (R2 or local)
// @access  Private
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const { isR2Configured } = getStorageConfig();
    let fileKey, fileUrl;

    if (isR2Configured) {
      // R2 upload
      fileKey = req.file.key;
      fileUrl = getPublicUrl(fileKey);
    } else {
      // Local upload
      const relativePath = path.relative(path.join(__dirname, '..', 'uploads'), req.file.path);
      fileKey = relativePath.replace(/\\/g, '/'); // Normalize path separators
      fileUrl = getPublicUrl(fileKey);
    }

    // Return file information
    res.json({
      filename: req.file.filename || req.file.key?.split('/').pop(),
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      key: fileKey,
      url: fileUrl,
      location: req.file.location || fileUrl
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ msg: 'Server error during file upload' });
  }
});

// @route   DELETE /api/upload/:key
// @desc    Delete a file from R2
// @access  Private
router.delete('/:key(*)', auth, async (req, res) => {
  try {
    const fileKey = req.params.key;
    
    if (!fileKey) {
      return res.status(400).json({ msg: 'File key is required' });
    }

    const deleted = await deleteFile(fileKey);
    
    if (deleted) {
      res.json({ msg: 'File deleted successfully' });
    } else {
      res.status(500).json({ msg: 'Failed to delete file' });
    }
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ msg: 'Server error during file deletion' });
  }
});

// @route   GET /api/upload/info/:key
// @desc    Get file information
// @access  Public
router.get('/info/:key(*)', (req, res) => {
  try {
    const fileKey = req.params.key;
    
    if (!fileKey) {
      return res.status(400).json({ msg: 'File key is required' });
    }

    const publicUrl = getPublicUrl(fileKey);
    
    res.json({
      key: fileKey,
      url: publicUrl
    });
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({ msg: 'Server error getting file info' });
  }
});

// Legacy route for backward compatibility
// @route   GET api/upload/files/:filename
// @desc    Redirect to R2 public URL
// @access  Public
router.get('/files/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    // Assume images folder for legacy compatibility
    const fileKey = `images/${filename}`;
    const publicUrl = getPublicUrl(fileKey);
    
    // Redirect to R2 public URL
    res.redirect(publicUrl);
  } catch (error) {
    console.error('Legacy file serve error:', error);
    res.status(500).json({ msg: 'Server error serving file' });
  }
});

module.exports = router;