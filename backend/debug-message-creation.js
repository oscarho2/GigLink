require('dotenv').config();
const mongoose = require('mongoose');
const Message = require('./models/Message');
const User = require('./models/User');

async function debugMessageCreation() {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    // Find Jane and Oscar
    const jane = await User.findOne({ email: 'jane.smith@example.com' });
    const oscar = await User.findOne({ email: 'oscar.ho@example.com' });
    
    if (!jane || !oscar) {
      console.log('Users not found:');
      console.log('Jane:', jane ? 'Found' : 'Not found');
      console.log('Oscar:', oscar ? 'Found' : 'Not found');
      return;
    }
    
    console.log('Users found:');
    console.log('Jane ID:', jane._id);
    console.log('Oscar ID:', oscar._id);
    
    // Create a test message
    console.log('\nCreating test message...');
    const testMessage = new Message({
      sender: jane._id,
      recipient: oscar._id,
      content: 'Debug test message',
      messageType: 'text'
    });
    
    console.log('Message before save:');
    console.log('Sender:', testMessage.sender);
    console.log('Recipient:', testMessage.recipient);
    console.log('ConversationId:', testMessage.conversationId);
    
    // Save the message
    const savedMessage = await testMessage.save();
    
    console.log('\nMessage after save:');
    console.log('ID:', savedMessage._id);
    console.log('Sender:', savedMessage.sender);
    console.log('Recipient:', savedMessage.recipient);
    console.log('ConversationId:', savedMessage.conversationId);
    console.log('Content:', savedMessage.content);
    
    console.log('\n✅ Message created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating message:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nConnection closed');
  }
}

debugMessageCreation();