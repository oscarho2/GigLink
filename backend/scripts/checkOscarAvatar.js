const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');

// MongoDB connection
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI is not set; attempting local connection.');
      throw new Error('MONGO_URI not set');
    }
    // First try Atlas connection
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Atlas connected successfully: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB Atlas connection error:', err.message);
    console.log('Attempting to connect to local MongoDB...');
    
    try {
      // Fallback to local MongoDB
      const localConn = await mongoose.connect('mongodb://localhost:27017/giglink', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`Local MongoDB connected successfully: ${localConn.connection.host}`);
    } catch (localErr) {
      console.error('Local MongoDB connection also failed:', localErr.message);
      throw localErr;
    }
  }
};

const checkOscarData = async () => {
  try {
    await connectDB();
    
    // Find Oscar's user record
    const oscar = await User.findOne({ email: 'oscar@oscarho.co.uk' });
    
    if (!oscar) {
      console.log('Oscar not found');
      return;
    }
    
    console.log('=== OSCAR USER DATA ===');
    console.log('ID:', oscar._id);
    console.log('Name:', oscar.name);
    console.log('Email:', oscar.email);
    console.log('Avatar:', oscar.avatar || 'NOT SET');
    console.log('Profile Picture:', oscar.profilePicture || 'NOT SET');
    console.log('Location:', oscar.location);
    console.log('Bio:', oscar.bio);
    console.log('Instruments:', oscar.instruments);
    console.log('Genres:', oscar.genres);
    
    // Also check his profile
    const profile = await Profile.findOne({ user: oscar._id }).populate('user');
    if (profile) {
      console.log('\n=== OSCAR PROFILE DATA ===');
      console.log('Profile ID:', profile._id);
      console.log('User Avatar from Profile:', profile.user?.avatar || 'NOT SET');
      console.log('User Profile Picture from Profile:', profile.user?.profilePicture || 'NOT SET');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

checkOscarData();