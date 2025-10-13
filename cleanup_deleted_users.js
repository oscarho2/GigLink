const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_ATLAS_URI || 'mongodb://localhost:27017/giglink';

// Models - adjust these based on your actual models
const User = require('./backend/models/User');
const Profile = require('./backend/models/Profile');
const Post = require('./backend/models/Post');
const Gig = require('./backend/models/Gig');
const Message = require('./backend/models/Message');
const Link = require('./backend/models/Link');
const Notification = require('./backend/models/Notification');

console.log('Connecting to MongoDB Atlas...');
console.log('MONGO_URI:', MONGO_URI ? 'URI provided' : 'No URI provided');

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB Atlas');
  
  try {
    // Find all users
    const allUsers = await User.find({}, { _id: 1 });
    const userIds = allUsers.map(user => user._id.toString());
    
    console.log(`Found ${userIds.length} active users`);
    
    // If there are no users, exit to prevent accidental deletion of all data
    if (userIds.length === 0) {
      console.log('No users found. Exiting to prevent accidental data loss.');
      process.exit(0);
    }
    
    // Clean up profiles
    console.log('Cleaning up profiles...');
    const profileResult = await Profile.deleteMany({
      user: { $nin: userIds }
    });
    console.log(`Deleted ${profileResult.deletedCount} orphaned profiles`);
    
    // Clean up posts
    console.log('Cleaning up posts...');
    const postResult = await Post.deleteMany({
      author: { $nin: userIds }
    });
    console.log(`Deleted ${postResult.deletedCount} orphaned posts`);
    
    // Clean up gigs
    console.log('Cleaning up gigs...');
    const gigResult = await Gig.deleteMany({
      user: { $nin: userIds }
    });
    console.log(`Deleted ${gigResult.deletedCount} orphaned gigs`);
    
    // Clean up messages
    console.log('Cleaning up messages...');
    // For messages, we need to check both sender and recipient
    const messageResult = await Message.deleteMany({
      $or: [
        { sender: { $nin: userIds } },
        { recipient: { $nin: userIds } }
      ]
    });
    console.log(`Deleted ${messageResult.deletedCount} orphaned messages`);
    
    // Clean up links
    console.log('Cleaning up links...');
    const linkResult = await Link.deleteMany({
      $or: [
        { requester: { $nin: userIds } },
        { recipient: { $nin: userIds } }
      ]
    });
    console.log(`Deleted ${linkResult.deletedCount} orphaned links`);
    
    // Clean up notifications
    console.log('Cleaning up notifications...');
    const notificationResult = await Notification.deleteMany({
      $or: [
        { recipient: { $nin: userIds } },
        { sender: { $nin: userIds } }
      ]
    });
    console.log(`Deleted ${notificationResult.deletedCount} orphaned notifications`);
    
    console.log('Cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
});