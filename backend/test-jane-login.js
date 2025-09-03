const axios = require('axios');

// Configure axios to use the backend server
axios.defaults.baseURL = 'http://localhost:5001';

async function testJaneLogin() {
  try {
    console.log('🔐 Testing Jane Smith login...');
    
    const loginResponse = await axios.post('/api/auth', {
      email: 'jane.smith@example.com',
      password: 'password123'
    });
    
    if (loginResponse.data.token) {
      console.log('✅ Login successful!');
      console.log('Token received:', loginResponse.data.token.substring(0, 20) + '...');
      console.log('User data:', loginResponse.data.user);
    } else {
      console.log('❌ Login failed - no token received');
    }
    
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testJaneLogin();