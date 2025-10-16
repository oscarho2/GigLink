require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');

const ensureUserProfiles = async () => {
  let createdCount = 0;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    const users = await User.find({})
      .select(['_id', 'name', 'email'])
      .sort({ createdAt: 1 })
      .lean();

    console.log(`🔍 Checking ${users.length} users for missing profiles...`);

    for (const user of users) {
      const existingProfile = await Profile.findOne({ user: user._id }).lean();
      if (existingProfile) {
        continue;
      }

      try {
        await Profile.create({
          user: user._id,
          skills: [],
          videos: []
        });
        createdCount += 1;
        console.log(`🆕 Created default profile for ${user.name} <${user.email}>`);
      } catch (profileErr) {
        console.error(`❌ Failed to create profile for ${user.email}:`, profileErr.message);
      }
    }

    if (createdCount === 0) {
      console.log('🎉 All users already have profiles.');
    } else {
      console.log(`✅ Created ${createdCount} missing profile${createdCount === 1 ? '' : 's'}.`);
    }
  } catch (err) {
    console.error('❌ Error ensuring profiles:', err);
  } finally {
    await mongoose.connection.close();
    console.log('🚪 MongoDB connection closed.');
  }
};

ensureUserProfiles();
