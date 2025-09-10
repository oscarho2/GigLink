const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Test script to verify profile pre-filling with existing user data
async function testExistingUserPrefill() {
  try {
    console.log('Testing profile pre-fill with existing user data...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB Atlas');
    
    // Import User model
    const User = require('./models/User');
    
    // Find an existing user (Alex Johnson)
    const existingUser = await User.findOne({ email: 'alex.johnson@email.com' });
    
    if (!existingUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log('1. Found existing user:', existingUser.name);
    
    // Update the user with some profile data
    existingUser.location = 'New York, NY';
    existingUser.bio = 'Guitarist and songwriter';
    existingUser.instruments = ['Guitar', 'Vocals'];
    existingUser.genres = ['Rock', 'Blues', 'Folk'];

    
    await existingUser.save();
    console.log('✓ Updated user with profile data');
    
    // Now test login to get the user data that would be used for pre-filling
    console.log('\n2. Testing login to get user data...');
    
    const loginResponse = await axios.post('http://localhost:5001/api/auth', {
      email: 'alex.johnson@email.com',
      password: 'Password123!'
    });
    
    console.log('✓ Login successful');
    console.log('User data returned:', loginResponse.data.user);
    
    // Get the full user data from the database to see what would be available for pre-filling
    const fullUserData = await User.findById(loginResponse.data.user.id);
    
    console.log('\n3. Profile setup would be pre-filled with:');
    console.log(`- Bio: "${fullUserData.bio || `Hi, I'm ${fullUserData.name}! I'm excited to connect with fellow musicians and explore new opportunities in the music world.`}"`);
    console.log(`- Location: "${fullUserData.location || '(empty - to be filled by user)'}"`); 
    console.log(`- Instruments: [${fullUserData.instruments?.join(', ') || '(empty - to be selected by user)'}]`);
    console.log(`- Genres: [${fullUserData.genres?.join(', ') || '(empty - to be selected by user)'}]`);
 
    
    console.log('\n✓ Existing user profile pre-fill test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  }
}

// Run the test
testExistingUserPrefill();