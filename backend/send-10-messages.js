require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('./models/User');

// Configure axios to use the backend server
axios.defaults.baseURL = 'http://localhost:5001';

async function send10Messages() {
  try {
    // Connect to MongoDB Atlas (same as backend)
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB Atlas');

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
    const oscarUser = await User.findOne({ email: 'oscar.ho@example.com' });
    
    if (!oscarUser) {
      console.log('❌ Oscar Ho not found in database');
      return;
    }
    
    console.log('✅ Found Oscar Ho:', oscarUser.name, '(ID:', oscarUser._id, ')');
    
    // Array of 10 different messages to send
    const messages = [
      'Hi Oscar! Hope you\'re having a great day. I\'d love to collaborate on some music projects.',
      'I\'ve been listening to some amazing jazz pieces lately. What\'s your favorite jazz standard?',
      'Your bass playing skills are impressive! Do you have any tips for improving technique?',
      'I\'m working on a new composition and could use a talented bassist. Interested?',
      'Have you heard the latest Bill Evans recordings? They\'re absolutely incredible!',
      'I\'m organizing a small jazz ensemble for a local venue. Would you like to join us?',
      'Your experience at Guildhall must be amazing. How are you finding the program?',
      'I\'ve been practicing some Keith Jarrett pieces. We should jam together sometime!',
      'Do you ever perform at local venues in Newcastle? I\'d love to catch a show.',
      'Thanks for being such an inspiring musician. Looking forward to making music together!'
    ];
    
    console.log('📤 Sending 10 messages to Oscar Ho...');
    
    // Send each message with a small delay
    for (let i = 0; i < messages.length; i++) {
      try {
        const messageResponse = await axios.post('/api/messages', {
          recipient: oscarUser._id,
          content: messages[i],
          messageType: 'text'
        }, {
          headers: {
            'x-auth-token': token
          }
        });
        
        console.log(`✅ Message ${i + 1}/10 sent successfully`);
        console.log(`   Content: "${messages[i].substring(0, 50)}..."`);        
        
        // Small delay between messages to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error sending message ${i + 1}:`, error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
      }
    }
    
    console.log('\n🎉 All 10 messages sent successfully from Jane Smith to Oscar Ho!');
    
  } catch (error) {
    console.error('❌ Error in send10Messages:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    mongoose.connection.close();
  }
}

send10Messages();