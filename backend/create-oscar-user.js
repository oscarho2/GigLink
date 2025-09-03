const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Profile = require('./models/Profile');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/giglink', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

async function createOscarUser() {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'oscar@oscarho.co.uk' });
    if (existingUser) {
      console.log('User Oscar Ho already exists');
      return;
    }

    // Create Oscar Ho user with the exact data provided
    const user = new User({
      name: 'Oscar Ho',
      email: 'oscar@oscarho.co.uk',
      password: '$2a$10$n0jBKk6hbzktWxV.K8CIQeyoW36Z3o4GwxqlPsSuSPNvv3s3eoULq', // Pre-hashed password
      instruments: ['Bass', 'Guitar', 'Vocals'],
      genres: ['Jazz', 'Classical', 'Pop'],
      isAvailableForGigs: true,
      profileCompleted: false,
      location: 'Newcastle',
      bio: 'Oscar Ho is a dynamic musician currently immersed in the world of jazz at the Guildhall School of Music & Drama. His musical journey began at the prestigious Chetham\'s School of Music, where he honed his skills in both jazz and classical double bass from 2019 to 2021.\n\nDuring his time at Chetham\'s, Oscar caught the attention of the musical community, earning the esteemed "Ida Carroll Scholarship" for his remarkable progress as one of the most promising string players. Under the mentorship of renowned jazz bassist and educator Steve Berry and bassist Rachel Meerloo from the Hallé, Oscar delved into symphonic works, including Mahler 8, with the Chetham\'s Symphony Orchestra. His contributions extended to the Chetham\'s Big Band, led by the accomplished Richard Iles.\n\nOscar\'s musical prowess extends beyond the double bass; in 2018, he secured the first-place prize at the "Northern Region Music Championship" for classical guitar. His achievements include multiple awards from local music festivals, reflecting his versatility and commitment to musical excellence.\n\nSince relocating to London, Oscar has embraced a diverse range of musical opportunities. From collaborations in various musical productions to performances with function bands and orchestras, he has showcased his adaptability and passion for different genres. At the Guildhall School of Music & Drama, Oscar has had the privilege of working with distinguished figures like Norma Winston and Scott Stroman. His education at the Guildhall has been enriched through lessons with esteemed faculty members, including Steve Watts, Tom Farmer, James Maddren, and other mentors.',
      experience: 'Professional',
      date: new Date('2025-01-03T16:32:07.618Z') // Original date from the data
    });

    // Save user (skip password hashing since it's already hashed)
    user.isModified = function(path) {
      if (path === 'password') return false;
      return mongoose.Document.prototype.isModified.call(this, path);
    };
    
    await user.save();
    console.log('✅ Oscar Ho user created successfully');

    // Create corresponding profile
    const profile = new Profile({
      user: user._id,
      skills: user.instruments || [],
      videos: []
    });

    await profile.save();
    console.log('✅ Oscar Ho profile created successfully');

    // Verify the user was created correctly
    const createdUser = await User.findOne({ email: 'oscar@oscarho.co.uk' });
    console.log('\n📋 Created user details:');
    console.log('Name:', createdUser.name);
    console.log('Email:', createdUser.email);
    console.log('Location:', createdUser.location);
    console.log('Instruments:', createdUser.instruments);
    console.log('Genres:', createdUser.genres);
    console.log('Bio length:', createdUser.bio.length, 'characters');
    console.log('Experience:', createdUser.experience);
    console.log('Available for gigs:', createdUser.isAvailableForGigs);
    console.log('Profile completed:', createdUser.profileCompleted);

  } catch (error) {
    console.error('❌ Error creating Oscar Ho user:', error);
  } finally {
    mongoose.connection.close();
  }
}

createOscarUser();