const axios = require('axios');

// Configure axios to use the backend server
axios.defaults.baseURL = 'http://localhost:5001';

async function testOscarLogin() {
  try {
    console.log('🔐 Testing Oscar Ho login...');
    
    // Note: We need to determine what password was used for the hash
    // The hash provided is: $2a$10$n0jBKk6hbzktWxV.K8CIQeyoW36Z3o4GwxqlPsSuSPNvv3s3eoULq
    // Let's try common passwords that might match this hash
    
    const possiblePasswords = [
      'password123',
      'Password123!',
      'oscarho123',
      'OscarHo123!',
      'guildhall123',
      'jazz123',
      'bass123'
    ];
    
    let loginSuccess = false;
    let userData = null;
    
    for (const password of possiblePasswords) {
      try {
        console.log(`\n🔍 Trying password: ${password}`);
        
        const loginResponse = await axios.post('/api/auth', {
          email: 'oscar@oscarho.co.uk',
          password: password
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
          
          console.log('\n📋 User Profile Data:');
          console.log(JSON.stringify(profileResponse.data, null, 2));
          
          userData = profileResponse.data;
          loginSuccess = true;
          break;
        }
      } catch (error) {
        if (error.response?.status === 400) {
          console.log('❌ Invalid credentials for password:', password);
        } else {
          console.log('❌ Error:', error.message);
        }
      }
    }
    
    if (!loginSuccess) {
      console.log('\n❌ Could not determine the correct password for the hash.');
      console.log('The password hash in the database is:');
      console.log('$2a$10$n0jBKk6hbzktWxV.K8CIQeyoW36Z3o4GwxqlPsSuSPNvv3s3eoULq');
      console.log('\n💡 You may need to:');
      console.log('1. Reset the password for oscar@oscarho.co.uk');
      console.log('2. Or provide the original password that was used to create this hash');
    } else {
      console.log('\n🎉 Oscar Ho can successfully log in and access their profile!');
      console.log('\n📊 Summary of retrieved data:');
      console.log('- Name:', userData.user?.name);
      console.log('- Email:', userData.user?._id);
      console.log('- Location:', userData.user?.location);
      console.log('- Instruments:', userData.user?.instruments);
      console.log('- Genres:', userData.user?.genres);
      console.log('- Bio length:', userData.bio?.length, 'characters');
      console.log('- Experience:', userData.experience);
      console.log('- Availability:', userData.availability);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testOscarLogin();