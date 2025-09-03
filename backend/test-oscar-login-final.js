const axios = require('axios');

// Configure axios to use the backend server
axios.defaults.baseURL = 'http://localhost:5001';

async function testOscarLoginFinal() {
  try {
    console.log('🔐 Testing Oscar Ho login with updated password...');
    
    // Login with the new password
    const loginResponse = await axios.post('/api/auth', {
      email: 'oscar@oscarho.co.uk',
      password: 'OscarHo2024!'
    });
    
    if (loginResponse.data.token) {
      console.log('✅ Login successful!');
      console.log('Token received:', loginResponse.data.token.substring(0, 20) + '...');
      
      // Get user profile
      const profileResponse = await axios.get('/api/profiles/me', {
        headers: {
          'x-auth-token': loginResponse.data.token
        }
      });
      
      console.log('\n📋 Complete User Profile Data:');
      console.log(JSON.stringify(profileResponse.data, null, 2));
      
      const userData = profileResponse.data;
      
      console.log('\n🎉 Oscar Ho can successfully log in and access their profile!');
      console.log('\n📊 Summary of retrieved data:');
      console.log('- User ID:', userData.user?._id);
      console.log('- Name:', userData.user?.name);
      console.log('- Email:', userData.user?.email);
      console.log('- Location:', userData.user?.location);
      console.log('- Instruments:', userData.user?.instruments);
      console.log('- Genres:', userData.user?.genres);
      console.log('- Bio length:', userData.bio?.length, 'characters');
      console.log('- Experience:', userData.experience);
      console.log('- Available for gigs:', userData.user?.isAvailableForGigs);
      console.log('- Profile completed:', userData.user?.profileCompleted);
      
      // Verify the data matches what was expected
      console.log('\n✅ Data verification:');
      console.log('- Name matches:', userData.user?.name === 'Oscar Ho');
      console.log('- Email matches:', userData.user?.email === 'oscar@oscarho.co.uk');
      console.log('- Location matches:', userData.user?.location === 'Newcastle');
      console.log('- Has instruments:', Array.isArray(userData.user?.instruments) && userData.user.instruments.length > 0);
      console.log('- Has genres:', Array.isArray(userData.user?.genres) && userData.user.genres.length > 0);
      console.log('- Has bio:', userData.bio && userData.bio.length > 0);
      console.log('- Experience set:', userData.experience === 'Professional');
      
    } else {
      console.log('❌ Login failed - no token received');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testOscarLoginFinal();