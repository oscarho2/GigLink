const axios = require('axios');

async function testAuth() {
  try {
    console.log('Testing login with existing user...');
    
    // Try to login with existing mock user
    const loginResponse = await axios.post('http://localhost:5001/api/auth', {
      email: 'alex.johnson@email.com',
      password: 'Password123!'
    });
    
    console.log('Login successful:', loginResponse.data);
    const token = loginResponse.data.token;
    
    // Test accessing conversations with the token
    console.log('Testing conversations endpoint with token...');
    const conversationsResponse = await axios.get('http://localhost:5001/api/messages/conversations', {
      headers: {
        'x-auth-token': token
      }
    });
    
    console.log('Conversations response:', conversationsResponse.data);
    console.log('Token for frontend use:', token);
    
  } catch (error) {
    if (error.response) {
      console.log('Error occurred:', {
        status: error.response.status,
        message: error.response.data
      });
    } else {
      console.log('Network error:', error.message);
    }
  }
}

testAuth();