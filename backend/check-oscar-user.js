const mongoose = require('mongoose');
const User = require('./models/User');
const Profile = require('./models/Profile');

mongoose.connect('mongodb://localhost:27017/giglink')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({email: 'oscar@oscarho.co.uk'});
    console.log('Oscar user exists:', !!user);
    
    if (user) {
      console.log('User ID:', user._id);
      console.log('Name:', user.name);
      console.log('Email:', user.email);
      console.log('Password hash:', user.password);
      
      // Check profile
      const profile = await Profile.findOne({user: user._id});
      console.log('Profile exists:', !!profile);
      if (profile) {
        console.log('Profile ID:', profile._id);
        console.log('Bio length:', profile.bio?.length || 0);
      }
    } else {
      console.log('User not found');
    }
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error:', err.message);
    mongoose.connection.close();
  });