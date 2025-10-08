const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { normalizeMediaUrls } = require('../utils/r2Migration');

(async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined. Aborting.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    const { updatedPosts, skipped } = await normalizeMediaUrls();
    if (skipped) {
      console.log('Normalization skipped (R2_PUBLIC_URL missing or DB not ready).');
    } else {
      console.log(`Normalization complete. Updated ${updatedPosts} posts.`);
    }
    process.exit(0);
  } catch (error) {
    console.error('Normalization error:', error);
    process.exit(1);
  }
})();
