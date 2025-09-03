const axios = require('axios');

// Function to create a profile for the user
async function createProfile() {
  try {
    // First, authenticate to get a token
    const authResponse = await axios.post('http://localhost:5001/api/auth', {
      email: 'oscar@oscarho.co.uk',
      password: 'password123'
    });
    
    const token = authResponse.data.token;
    console.log('Authentication successful, token received');
    
    // Create a profile using the token
    const profileResponse = await axios.post('http://localhost:5001/api/profiles', {
      skills: ['Piano', 'Guitar', 'Vocals'],
      videos: []
    }, {
      headers: {
        'x-auth-token': token,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Profile created successfully:', profileResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

createProfile();