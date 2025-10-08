require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Post = require('../models/Post');

const normalizeUrl = (url) => {
  if (!url) {
    return url;
  }

  const base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  if (!base) {
    return url;
  }

  // Strip any host and leading slashes
  const normalized = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, '');

  if (normalized.startsWith('uploads/')) {
    return `${base}/${normalized.replace(/^uploads\//, '')}`;
  }

  if (
    normalized.startsWith('images/') ||
    normalized.startsWith('posts/') ||
    normalized.startsWith('group-avatars/') ||
    normalized.startsWith('messages/') ||
    normalized.startsWith('videos/')
  ) {
    return `${base}/${normalized}`;
  }

  return url;
};

(async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined. Aborting.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const posts = await Post.find({ 'media.url': /uploads\// });
    console.log(`Found ${posts.length} posts with legacy media URLs.`);

    for (const post of posts) {
      let updated = false;
      post.media = post.media.map((item) => {
        if (!item?.url) {
          return item;
        }

        const newUrl = normalizeUrl(item.url);
        if (newUrl !== item.url) {
          updated = true;
          return {
            ...item.toObject(),
            url: newUrl
          };
        }

        return item;
      });

      if (updated) {
        await post.save();
        console.log(`Updated post ${post._id}`);
      }
    }

    console.log('Normalization complete.');
    process.exit(0);
  } catch (error) {
    console.error('Normalization error:', error);
    process.exit(1);
  }
})();
