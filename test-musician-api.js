const axios = require('axios');

// This script tests the musician status API endpoint
async function testMusicianAPI() {
  const baseURL = 'http://localhost:5001';
  
  try {
    console.log('Testing musician status API...\n');
    
    // You'll need to replace this with a valid token
    const token = 'your-jwt-token-here';
    
    const headers = {
      'x-auth-token': token,
      'Content-Type': 'application/json'
    };
    
    // Test GET current status
    console.log('1. Getting current musician status...');
    try {
      const getResponse = await axios.get(`${baseURL}/api/profiles/musician-status`, { headers });
      console.log('Current status:', getResponse.data);
    } catch (error) {
      console.log('GET Error:', error.response?.data || error.message);
    }
    
    // Test PUT to update to 'yes'
    console.log('\n2. Updating musician status to "yes"...');
    try {
      const putResponse = await axios.put(`${baseURL}/api/profiles/musician-status`, 
        { isMusician: 'yes' }, 
        { headers }
      );
      console.log('Update response:', putResponse.data);
    } catch (error) {
      console.log('PUT Error:', error.response?.data || error.message);
    }
    
    // Test GET again to verify
    console.log('\n3. Getting status again to verify...');
    try {
      const getResponse2 = await axios.get(`${baseURL}/api/profiles/musician-status`, { headers });
      console.log('Status after update:', getResponse2.data);
    } catch (error) {
      console.log('GET Error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

console.log('Manual test script created. You need to:');
console.log('1. Start the backend server (cd backend && npm run dev)');
console.log('2. Get a valid JWT token from the frontend');
console.log('3. Replace "your-jwt-token-here" in this script');
console.log('4. Run: node test-musician-api.js');