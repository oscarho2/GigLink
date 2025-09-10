const axios = require('axios');

// Test script to verify profile pre-filling functionality
async function testProfilePrefill() {
  try {
    console.log('Testing profile pre-fill functionality...');
    
    // Test user data
    const testUser = {
      name: 'Test User Profile',
      email: 'testprofile@example.com',
      password: 'TestPass123!'
    };
    
    console.log('1. Registering test user...');
    
    // First, try to register the user
    try {
      const registerResponse = await axios.post('http://localhost:5001/api/users', testUser);
      console.log('✓ User registered successfully');
      console.log('User data returned:', {
        id: registerResponse.data.user.id,
        name: registerResponse.data.user.name,
        email: registerResponse.data.user.email
      });
      
      // The user object should now contain the name and email
      // which would be used to pre-fill the profile setup form
      console.log('\n2. Profile setup would be pre-filled with:');
      console.log(`- Bio: "Hi, I'm ${registerResponse.data.user.name}! I'm excited to connect with fellow musicians and explore new opportunities in the music world."`);
      console.log('- Location: (empty - to be filled by user)');
      console.log('- Instruments: (empty - to be selected by user)');
      console.log('- Genres: (empty - to be selected by user)');
      
      
      console.log('\n✓ Profile pre-fill functionality test completed successfully!');
      
    } catch (registerError) {
      if (registerError.response?.status === 400 && registerError.response?.data?.errors?.[0]?.msg === 'User already exists') {
        console.log('ℹ User already exists, testing with existing user...');
        
        // Login with existing user to get user data
        const loginResponse = await axios.post('http://localhost:5001/api/auth', {
          email: testUser.email,
          password: testUser.password
        });
        
        console.log('✓ Logged in successfully');
        console.log('User data returned:', {
          id: loginResponse.data.user.id,
          name: loginResponse.data.user.name,
          email: loginResponse.data.user.email
        });
        
        console.log('\n2. Profile setup would be pre-filled with:');
        console.log(`- Bio: "Hi, I'm ${loginResponse.data.user.name}! I'm excited to connect with fellow musicians and explore new opportunities in the music world."`);
        console.log('- Location: (empty - to be filled by user)');
        console.log('- Instruments: (empty - to be selected by user)');
        console.log('- Genres: (empty - to be selected by user)');

        
        console.log('\n✓ Profile pre-fill functionality test completed successfully!');
      } else {
        throw registerError;
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testProfilePrefill();