const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');

// Configure axios to use the backend server
axios.defaults.baseURL = 'http://localhost:5001';

// Load environment variables and connect to MongoDB Atlas
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('MongoDB connection error:', err));

async function sendTestMessage() {
  try {
    console.log('🔐 Logging in as Jane Smith...');
    
    // Login as Jane Smith
    const loginResponse = await axios.post('/api/auth', {
      email: 'jane.smith@example.com',
      password: 'password123'
    });
    
    if (!loginResponse.data.token) {
      console.log('❌ Login failed - no token received');
      return;
    }
    
    console.log('✅ Login successful!');
    const token = loginResponse.data.token;
    
    // Get Oscar's user ID from database
    console.log('🔍 Finding Oscar Ho\'s user ID...');
    const oscarUser = await User.findOne({ email: 'oscar@oscarho.co.uk' });
    
    if (!oscarUser) {
      console.log('❌ Oscar Ho not found in database');
      return;
    }
    
    console.log('✅ Found Oscar Ho:', oscarUser.name, '(ID:', oscarUser._id, ')');
    
    // Send message to Oscar
    console.log('📤 Sending message to Oscar Ho...');
    const messageResponse = await axios.post('/api/messages', {
      recipient: oscarUser._id,
      content: 'Hi Oscar! This is a test message from Jane. I hope you\'re doing well and would love to collaborate on some music projects. Let me know if you\'re interested!',
      messageType: 'text'
    }, {
      headers: {
        'x-auth-token': token
      }
    });
    
    console.log('✅ Message sent successfully!');
    console.log('📋 Message details:');
    console.log('- From:', messageResponse.data.sender?.name || 'Jane Smith');
    console.log('- To:', messageResponse.data.recipient?.name || 'Oscar Ho');
    console.log('- Content:', messageResponse.data.content);
    console.log('- Sent at:', new Date(messageResponse.data.createdAt).toLocaleString());
    console.log('- Message ID:', messageResponse.data._id);
    
    console.log('\n🎉 Test message sent successfully from Jane Smith to Oscar Ho!');
    
  } catch (error) {
    console.error('❌ Error sending test message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    mongoose.connection.close();
  }
}

sendTestMessage();