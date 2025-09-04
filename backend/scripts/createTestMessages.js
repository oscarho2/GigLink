const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
require('dotenv').config();

async function createTestMessages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find two users to create a conversation between
    const users = await User.find().limit(2);
    if (users.length < 2) {
      console.log('Need at least 2 users to create test messages');
      return;
    }

    const user1 = users[0];
    const user2 = users[1];
    console.log(`Creating conversation between ${user1.name} and ${user2.name}`);

    // Generate conversation ID
    const conversationId = Message.generateConversationId(user1._id, user2._id);
    console.log('Conversation ID:', conversationId);

    // Create test messages
    const testMessages = [
      {
        sender: user1._id,
        recipient: user2._id,
        content: 'Hey! How are you doing?',
        conversationId,
        messageType: 'text',
        delivered: true,
        read: false
      },
      {
        sender: user2._id,
        recipient: user1._id,
        content: 'Hi there! I\'m doing great, thanks for asking. How about you?',
        conversationId,
        messageType: 'text',
        delivered: true,
        read: true
      },
      {
        sender: user1._id,
        recipient: user2._id,
        content: 'I\'m good too! Are you available for a project discussion?',
        conversationId,
        messageType: 'text',
        delivered: true,
        read: false
      },
      {
        sender: user2._id,
        recipient: user1._id,
        content: 'Absolutely! I\'d love to hear about it. When would be a good time?',
        conversationId,
        messageType: 'text',
        delivered: true,
        read: false
      }
    ];

    // Insert messages with delays to simulate real conversation timing
    for (let i = 0; i < testMessages.length; i++) {
      const message = new Message({
        ...testMessages[i],
        createdAt: new Date(Date.now() - (testMessages.length - i) * 60000) // 1 minute apart
      });
      await message.save();
      console.log(`Created message ${i + 1}: "${message.content}"`);
    }

    console.log('Test messages created successfully!');
    console.log(`Conversation ID: ${conversationId}`);
    
  } catch (error) {
    console.error('Error creating test messages:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestMessages();