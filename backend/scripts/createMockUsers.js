const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const mockUsers = [
  {
    name: 'Alex Johnson',
    email: 'alex.johnson@email.com',
    password: 'Password123!',
    location: 'New York, NY',
    instruments: ['Guitar', 'Vocals'],
    genres: ['Rock', 'Blues'],
    bio: 'Experienced guitarist and vocalist with 10+ years in the music industry.',
    experience: 'Professional',
    isAvailableForGigs: true
  },
  {
    name: 'Sarah Martinez',
    email: 'sarah.martinez@email.com',
    password: 'Password123!',
    location: 'Los Angeles, CA',
    instruments: ['Piano', 'Keyboard'],
    genres: ['Jazz', 'Classical'],
    bio: 'Classically trained pianist with a passion for jazz improvisation.',
    experience: 'Professional',
    isAvailableForGigs: true
  },
  {
    name: 'Mike Chen',
    email: 'mike.chen@email.com',
    password: 'Password123!',
    location: 'Chicago, IL',
    instruments: ['Drums'],
    genres: ['Rock', 'Pop', 'Funk'],
    bio: 'Dynamic drummer looking to collaborate with creative musicians.',
    experience: 'Intermediate',
    isAvailableForGigs: true
  },
  {
    name: 'Emma Wilson',
    email: 'emma.wilson@email.com',
    password: 'Password123!',
    location: 'Nashville, TN',
    instruments: ['Bass Guitar'],
    genres: ['Country', 'Rock'],
    bio: 'Bass player with a love for country and rock music.',
    experience: 'Professional',
    isAvailableForGigs: true
  },
  {
    name: 'David Rodriguez',
    email: 'david.rodriguez@email.com',
    password: 'Password123!',
    location: 'Austin, TX',
    instruments: ['Violin', 'Fiddle'],
    genres: ['Folk', 'Country', 'Classical'],
    bio: 'Versatile violinist comfortable in multiple genres.',
    experience: 'Professional',
    isAvailableForGigs: true
  }
];

async function createMockUsers() {
  try {
    console.log('Creating mock users...');
    
    for (const userData of mockUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }
      
      // Create user
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${user.name}`);
      
      // Create profile for user
      const profile = new Profile({
        user: user._id,
        skills: userData.instruments,
        videos: []
      });
      await profile.save();
      console.log(`Created profile for: ${user.name}`);
    }
    
    console.log('Mock users created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating mock users:', error);
    process.exit(1);
  }
}

createMockUsers();