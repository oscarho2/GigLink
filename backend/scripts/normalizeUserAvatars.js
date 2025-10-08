const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const { normalizeMediaUrlValue } = require('../utils/r2Migration');

(async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined. Aborting.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const users = await User.find({ avatar: { $regex: 'uploads/' } });
    console.log(`[Avatar Normalize] Found ${users.length} users with legacy avatars.`);

    let updated = 0;
    for (const user of users) {
      const newUrl = normalizeMediaUrlValue(user.avatar);
      if (newUrl !== user.avatar) {
        user.avatar = newUrl;
        await user.save();
        updated += 1;
        console.log(`[Avatar Normalize] Updated user ${user._id}`);
      }
    }

    console.log(`[Avatar Normalize] Completed. Updated ${updated} users.`);
    process.exit(0);
  } catch (error) {
    console.error('[Avatar Normalize] Error:', error);
    process.exit(1);
  }
})();
