const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000'; // Assuming your backend runs on port 5000

async function listAllUsers() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/users/all`);
    const users = response.data;

    if (users.length === 0) {
      console.log('No users found in the database.');
      return;
    }

    console.log('All Users:');
    users.forEach(user => {
      console.log(`Name: ${user.name}, ID: ${user._id}, Email: ${user.email}`);
    });
  } catch (error) {
    console.error('Error listing users:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

listAllUsers();
