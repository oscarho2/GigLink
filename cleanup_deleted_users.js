const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/giglink';

// Models - adjust these based on your actual models
const User = require('./backend/models/User');
const Profile = require('./backend/models/Profile');
const Post = require('./backend/models/Post');
const Gig = require('./backend/models/Gig');
const Message = require('./backend/models/Message');
const Conversation = require('./backend/models/Conversation');

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
    
    // Clean up profiles
    console.log('Cleaning up profiles...');
    const profileResult = await Profile.deleteMany({
      user: { $nin: userIds }
    });
    console.log(`Deleted ${profileResult.deletedCount} orphaned profiles`);
    
    // Clean up posts
    console.log('Cleaning up posts...');
    const postResult = await Post.deleteMany({
      user: { $nin: userIds }
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
    
    // Clean up conversations
    console.log('Cleaning up conversations...');
    // For conversations, check participants
    const conversationResult = await Conversation.deleteMany({
      $or: [
        { participants: { $nin: userIds } }
      ]
    });
    console.log(`Deleted ${conversationResult.deletedCount} orphaned conversations`);
    
    // Additional cleanup for other collections as needed
    // For example, if you have a Likes collection:
    /*
    console.log('Cleaning up likes...');
    const likeResult = await Like.deleteMany({
      user: { $nin: userIds }
    });
    console.log(`Deleted ${likeResult.deletedCount} orphaned likes`);
    */
    
    console.log('Cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
});