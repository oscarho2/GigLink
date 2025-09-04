const axios = require('axios');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjhiOTBhNTc4NDJkZjQyYjAzNTMwODI4IiwiZW1haWwiOiJhbGV4LmpvaG5zb25AZW1haWwuY29tIiwibmFtZSI6IkFsZXggSm9obnNvbiJ9LCJpYXQiOjE3NTcwMTEwNzgsImV4cCI6MTc1NzA5NzQ3OH0.T60jBylW_f6RCv_iYvIVCezifsnBi9C1KM7ZuaNWwuE';

async function testAPI() {
  try {
    console.log('Testing conversations endpoint...');
    const conversationsResponse = await axios.get('http://localhost:5001/api/messages/conversations', {
      headers: { 'x-auth-token': token }
    });
    console.log('Conversations response:', JSON.stringify(conversationsResponse.data, null, 2));
    
    if (conversationsResponse.data.length > 0) {
      const otherUserId = conversationsResponse.data[0].otherUser._id;
      console.log('\nTesting messages endpoint with otherUserId:', otherUserId);
      
      const messagesResponse = await axios.get(`http://localhost:5001/api/messages/conversation/${otherUserId}`, {
        headers: { 'x-auth-token': token }
      });
      console.log('Messages response:', JSON.stringify(messagesResponse.data, null, 2));
      console.log('Number of messages:', messagesResponse.data.length);
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAPI();