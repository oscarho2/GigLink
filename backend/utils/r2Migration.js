const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const mongoose = require('mongoose');
const { uploadFileFromDiskToR2, getStorageConfig, getPublicUrl } = require('./r2Config');

const Post = require('../models/Post');
const User = require('../models/User');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const DIRECTORIES_TO_MIGRATE = ['group-avatars', 'images', 'messages', 'posts', 'videos'];

const defaultLogger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

const normalizeKey = (key) => key.replace(/^\/+/, '').replace(/\\+/g, '/');

const normalizeMediaUrlValue = (url) => {
  if (!url) {
    return url;
  }

  if (url.startsWith('/api/media/r2/')) {
    return url;
  }

  const strippedHost = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, '');

  if (!strippedHost) {
    return getPublicUrl(url);
  }

  if (strippedHost.startsWith('api/media/r2/')) {
    return `/${strippedHost}`;
  }

  const normalizedPath = strippedHost.startsWith('uploads/')
    ? strippedHost.replace(/^uploads\//, '')
    : strippedHost;

  return getPublicUrl(normalizedPath);
};

async function migrateLocalUploadsToR2({ logger = defaultLogger } = {}) {
  const { isR2Configured, uploadsDir } = getStorageConfig();

  if (!isR2Configured) {
    logger.warn('[R2 Migration] R2 is not configured. Skipping migration.');
    return { migrated: 0, skipped: true };
  }

  let migrated = 0;

  for (const dir of DIRECTORIES_TO_MIGRATE) {
    const localDir = path.join(uploadsDir, dir);
    if (!fs.existsSync(localDir)) {
      logger.info(`[R2 Migration] Directory ${localDir} does not exist, skipping.`);
      continue;
    }

    const files = await readdir(localDir);
    logger.info(`[R2 Migration] Migrating directory: ${dir} (${files.length} entries)`);

    for (const file of files) {
      const localPath = path.join(localDir, file);
      const fileStat = await stat(localPath);

      if (fileStat.isDirectory()) {
        continue;
      }

      const key = normalizeKey(`${dir}/${file}`);

      try {
        await uploadFileFromDiskToR2(localPath, key);
        migrated += 1;
        logger.info(`[R2 Migration] Uploaded ${key}`);
      } catch (error) {
        logger.error(`[R2 Migration] Failed to upload ${key}:`, error);
      }
    }
  }

  return { migrated, skipped: false };
}

async function normalizeMediaUrls({ logger = defaultLogger } = {}) {
  if (!mongoose.connection?.readyState) {
    logger.warn('[R2 Normalize] Mongoose connection is not ready. Skipping normalization.');
    return { updatedPosts: 0, skipped: true };
  }

  const posts = await Post.find({ 'media.url': { $regex: 'uploads/' } });
  logger.info(`[R2 Normalize] Found ${posts.length} posts with legacy media URLs.`);

  let updatedPosts = 0;

  for (const post of posts) {
    let updated = false;

    post.media = post.media.map((item) => {
      if (!item?.url) {
        return item;
      }

      const newUrl = normalizeMediaUrlValue(item.url);
      if (newUrl !== item.url) {
        updated = true;
        return {
          ...item.toObject(),
          url: newUrl,
        };
      }

      return item;
    });

    if (updated) {
      await post.save();
      updatedPosts += 1;
      logger.info(`[R2 Normalize] Updated post ${post._id}`);
    }
  }

  return { updatedPosts, skipped: false };
}

async function normalizeUserAvatars({ logger = defaultLogger } = {}) {
  if (!mongoose.connection?.readyState) {
    logger.warn('[R2 Normalize Avatars] Mongoose connection is not ready. Skipping.');
    return { updatedUsers: 0, skipped: true };
  }

  const users = await User.find({ avatar: { $regex: 'uploads/' } });
  logger.info(`[R2 Normalize Avatars] Found ${users.length} users with legacy avatars.`);

  let updatedUsers = 0;

  for (const user of users) {
    const newUrl = normalizeMediaUrlValue(user.avatar);
    if (newUrl !== user.avatar) {
      user.avatar = newUrl;
      await user.save();
      updatedUsers += 1;
      logger.info(`[R2 Normalize Avatars] Updated user ${user._id}`);
    }
  }

  return { updatedUsers, skipped: false };
}

module.exports = {
  migrateLocalUploadsToR2,
  normalizeMediaUrls,
  normalizeUserAvatars,
  normalizeMediaUrlValue,
};
