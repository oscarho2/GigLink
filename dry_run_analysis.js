const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection - try local first, then Atlas
const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_ATLAS_URI || 'mongodb://localhost:27017/giglink';
const LOCAL_MONGO_URI = 'mongodb://localhost:27017/giglink';

console.log('Connecting to MongoDB for dry-run analysis...');
console.log('MONGO_URI:', MONGO_URI ? 'URI provided' : 'No URI provided');

// Try to connect to MongoDB with a shorter timeout
const connectDB = async () => {
  try {
    console.log('Trying local MongoDB connection...');
    await mongoose.connect(LOCAL_MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to local MongoDB successfully');
    return true;
  } catch (localErr) {
    console.log('Local MongoDB connection failed, trying Atlas...');
    try {
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      console.log('Connected to MongoDB Atlas successfully');
      return true;
    } catch (atlasErr) {
      console.error('Both local and Atlas connections failed:');
      console.error('Local error:', localErr.message);
      console.error('Atlas error:', atlasErr.message);
      return false;
    }
  }
};

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Find all users
    const allUsers = await User.find({}, { _id: 1 });
    const userIds = allUsers.map(user => user._id.toString());
    
    console.log(`Found ${userIds.length} active users`);
    
    // If there are no users, exit
    if (userIds.length === 0) {
      console.log('No users found.');
      process.exit(0);
    }
    
    // Analyze profiles
    console.log('\n--- PROFILE ANALYSIS ---');
    const orphanedProfiles = await Profile.find({
      user: { $nin: userIds }
    });
    console.log(`Found ${orphanedProfiles.length} orphaned profiles`);
    if (orphanedProfiles.length > 0) {
      console.log('Sample orphaned profile IDs:');
      orphanedProfiles.slice(0, 5).forEach(profile => {
        console.log(`  - ${profile._id} (user: ${profile.user})`);
      });
    }
    
    // Analyze posts
    console.log('\n--- POST ANALYSIS ---');
    const orphanedPosts = await Post.find({
      author: { $nin: userIds }
    });
    console.log(`Found ${orphanedPosts.length} orphaned posts`);
    if (orphanedPosts.length > 0) {
      console.log('Sample orphaned post IDs:');
      orphanedPosts.slice(0, 5).forEach(post => {
        console.log(`  - ${post._id} (author: ${post.author})`);
      });
    }
    
    // Analyze gigs
    console.log('\n--- GIG ANALYSIS ---');
    const orphanedGigs = await Gig.find({
      user: { $nin: userIds }
    });
    console.log(`Found ${orphanedGigs.length} orphaned gigs`);
    if (orphanedGigs.length > 0) {
      console.log('Sample orphaned gig IDs:');
      orphanedGigs.slice(0, 5).forEach(gig => {
        console.log(`  - ${gig._id} (user: ${gig.user})`);
      });
    }
    
    // Analyze messages
    console.log('\n--- MESSAGE ANALYSIS ---');
    const orphanedMessages = await Message.find({
      $or: [
        { sender: { $nin: userIds } },
        { recipient: { $nin: userIds } }
      ]
    });
    console.log(`Found ${orphanedMessages.length} orphaned messages`);
    if (orphanedMessages.length > 0) {
      console.log('Sample orphaned message IDs:');
      orphanedMessages.slice(0, 5).forEach(message => {
        console.log(`  - ${message._id} (sender: ${message.sender}, recipient: ${message.recipient})`);
      });
    }
    
    // Analyze links
    console.log('\n--- LINK ANALYSIS ---');
    const orphanedLinks = await Link.find({
      $or: [
        { requester: { $nin: userIds } },
        { recipient: { $nin: userIds } }
      ]
    });
    console.log(`Found ${orphanedLinks.length} orphaned links`);
    if (orphanedLinks.length > 0) {
      console.log('Sample orphaned link IDs:');
      orphanedLinks.slice(0, 5).forEach(link => {
        console.log(`  - ${link._id} (requester: ${link.requester}, recipient: ${link.recipient})`);
      });
    }
    
    // Analyze notifications
    console.log('\n--- NOTIFICATION ANALYSIS ---');
    const orphanedNotifications = await Notification.find({
      $or: [
        { recipient: { $nin: userIds } },
        { sender: { $nin: userIds } }
      ]
    });
    console.log(`Found ${orphanedNotifications.length} orphaned notifications`);
    if (orphanedNotifications.length > 0) {
      console.log('Sample orphaned notification IDs:');
      orphanedNotifications.slice(0, 5).forEach(notification => {
        console.log(`  - ${notification._id} (recipient: ${notification.recipient}, sender: ${notification.sender})`);
      });
    }
    
    console.log('\n--- SUMMARY ---');
    console.log(`Total orphaned items:`);
    console.log(`  - Profiles: ${orphanedProfiles.length}`);
    console.log(`  - Posts: ${orphanedPosts.length}`);
    console.log(`  - Gigs: ${orphanedGigs.length}`);
    console.log(`  - Messages: ${orphanedMessages.length}`);
    console.log(`  - Links: ${orphanedLinks.length}`);
    console.log(`  - Notifications: ${orphanedNotifications.length}`);
    console.log(`  - TOTAL: ${orphanedProfiles.length + orphanedPosts.length + orphanedGigs.length + orphanedMessages.length + orphanedLinks.length + orphanedNotifications.length}`);
    
    console.log('\nDry-run analysis completed. No data was deleted.');
    console.log('To actually delete this data, run: npm run cleanup');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
});