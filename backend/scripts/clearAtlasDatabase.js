const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Gig = require('../models/Gig');
const Group = require('../models/Group');
const Message = require('../models/Message');
const Link = require('../models/Link');
require('dotenv').config();

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function clearAtlasDatabase() {
  try {
    console.log('Clearing Atlas database...');
    console.log('Connected to Atlas:', process.env.MONGO_URI.includes('mongodb+srv'));

    // Clear all collections
    await User.deleteMany({});
    console.log('Cleared Users collection');
    
    await Profile.deleteMany({});
    console.log('Cleared Profiles collection');
    
    await Gig.deleteMany({});
    console.log('Cleared Gigs collection');
    
    await Group.deleteMany({});
    console.log('Cleared Groups collection');
    
    await Message.deleteMany({});
    console.log('Cleared Messages collection');
    
    await Link.deleteMany({});
    console.log('Cleared Links collection');

    console.log('Atlas database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing Atlas database:', error);
    process.exit(1);
  }
}

clearAtlasDatabase();