const express = require('express');
const router = express.Router();
const { getObjectStream, getStorageConfig } = require('../utils/r2Config');

// Proxy R2 objects when the bucket is private
router.get('/r2/:key(*)', async (req, res) => {
  const { isR2Configured } = getStorageConfig();

  if (!isR2Configured) {
    return res.status(404).end();
  }

  const key = decodeURIComponent(req.params.key);

  try {
    const object = await getObjectStream(key);

    if (object.ContentType) {
      res.set('Content-Type', object.ContentType);
    }

    if (object.ContentLength) {
      res.set('Content-Length', object.ContentLength.toString());
    }

    if (object.ETag) {
      res.set('ETag', object.ETag);
    }

    if (object.LastModified) {
      res.set('Last-Modified', object.LastModified.toUTCString());
    }

    object.Body.pipe(res);
  } catch (error) {
    console.error('[R2 Proxy] Failed to fetch object:', key, error);
    res.status(404).end();
  }
});

module.exports = router;
