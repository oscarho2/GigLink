const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Profile = require('./models/Profile');
const Message = require('./models/Message');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/giglink', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

async function createTestData() {
  try {
    console.log('Creating test users and messages...');
    
    // Get Oscar user
    let oscarUser = await User.findOne({ email: 'oscar@oscarho.co.uk' });
    if (!oscarUser) {
      console.log('Oscar user not found, creating...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      oscarUser = new User({
        name: 'Oscar Ho',
        email: 'oscar@oscarho.co.uk',
        password: hashedPassword,
        instruments: ['Bass', 'Guitar', 'Vocals'],
        genres: ['Jazz', 'Classical', 'Pop'],
        isAvailableForGigs: true,
        profileCompleted: true,
        location: 'Newcastle',
        bio: 'Experienced musician and jazz bassist.',
        experience: 'Professional'
      });
      await oscarUser.save();
      console.log('✅ Oscar user created');
    }

    // Create Jane user
    let janeUser = await User.findOne({ email: 'jane.smith@example.com' });
    if (!janeUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      janeUser = new User({
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        password: hashedPassword,
        instruments: ['Piano', 'Vocals'],
        genres: ['Pop', 'Rock', 'Jazz'],
        isAvailableForGigs: true,
        profileCompleted: true,
        location: 'London',
        bio: 'Experienced pianist and vocalist.',
        experience: 'Professional'
      });
      await janeUser.save();
      console.log('✅ Jane user created');
    }

    // Create profiles if they don't exist
    const oscarProfile = await Profile.findOne({ user: oscarUser._id });
    if (!oscarProfile) {
      const profile = new Profile({
        user: oscarUser._id,
        skills: oscarUser.instruments,
        genres: oscarUser.genres,
        location: oscarUser.location,
        bio: oscarUser.bio,
        experience: oscarUser.experience,
        isAvailableForGigs: oscarUser.isAvailableForGigs,
        profileCompleted: oscarUser.profileCompleted
      });
      await profile.save();
      console.log('✅ Oscar profile created');
    }

    const janeProfile = await Profile.findOne({ user: janeUser._id });
    if (!janeProfile) {
      const profile = new Profile({
        user: janeUser._id,
        skills: janeUser.instruments,
        genres: janeUser.genres,
        location: janeUser.location,
        bio: janeUser.bio,
        experience: janeUser.experience,
        isAvailableForGigs: janeUser.isAvailableForGigs,
        profileCompleted: janeUser.profileCompleted
      });
      await profile.save();
      console.log('✅ Jane profile created');
    }

    // Create test messages
    const existingMessages = await Message.countDocuments();
    if (existingMessages === 0) {
      const messages = [
        {
          sender: janeUser._id,
          recipient: oscarUser._id,
          content: 'Hi Oscar! I saw your profile and I\'m interested in collaborating on some jazz pieces. Are you available for a session next week?',
          messageType: 'text',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        },
        {
          sender: oscarUser._id,
          recipient: janeUser._id,
          content: 'Hi Jane! That sounds great. I\'d love to collaborate. What kind of jazz pieces are you thinking about?',
          messageType: 'text',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          sender: janeUser._id,
          recipient: oscarUser._id,
          content: 'I was thinking some modern jazz standards, maybe some Bill Evans or Keith Jarrett style pieces. Do you have experience with those?',
          messageType: 'text',
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
        },
        {
          sender: oscarUser._id,
          recipient: janeUser._id,
          content: 'Absolutely! I love Bill Evans. Let\'s set up a time to meet and discuss the details.',
          messageType: 'text',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        }
      ];

      for (const messageData of messages) {
        const message = new Message(messageData);
        await message.save();
      }
      console.log('✅ Test messages created');
    }

    console.log('\n📊 Database Summary:');
    const userCount = await User.countDocuments();
    const profileCount = await Profile.countDocuments();
    const messageCount = await Message.countDocuments();
    
    console.log(`Users: ${userCount}`);
    console.log(`Profiles: ${profileCount}`);
    console.log(`Messages: ${messageCount}`);
    
    const users = await User.find({}, { name: 1, email: 1 });
    console.log('\n👥 Users:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email})`);
    });

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestData();