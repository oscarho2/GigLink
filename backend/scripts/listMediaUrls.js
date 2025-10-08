const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Post = require('../models/Post');

(async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined. Aborting.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const posts = await Post.find({ 'media.0': { $exists: true } })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    posts.forEach((post) => {
      console.log(`Post ${post._id}`);
      post.media.forEach((item, index) => {
        console.log(`  [${index}] type=${item.type} url=${item.url}`);
      });
    });

    process.exit(0);
  } catch (error) {
    console.error('Error listing media URLs:', error);
    process.exit(1);
  }
})();
