require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');

const checkUserProfiles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB Atlas');
    
    const users = await User.find({}).sort({ createdAt: 1 });
    
    console.log('\nUsers and their profiles:');
    console.log('========================');
    
    for (const user of users) {
      console.log(`\nUser: ${user.name} (${user.email})`);
      console.log(`Created: ${user.createdAt || 'Date not available'}`);
      
      const profile = await Profile.findOne({ user: user._id });
      
      if (profile) {
        console.log('Profile found:');
        console.log(`  Location: ${user.location || 'Not set'}`);
        console.log(`  Bio: ${user.bio ? user.bio.substring(0, 100) + '...' : 'Not set'}`);
        console.log(`  Instruments: ${user.instruments ? user.instruments.join(', ') : 'None'}`);
        console.log(`  Genres: ${user.genres ? user.genres.join(', ') : 'None'}`);
    
      } else {
        console.log('No profile found');
      }
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error checking user profiles:', error);
  } finally {
    mongoose.connection.close();
  }
};

checkUserProfiles();