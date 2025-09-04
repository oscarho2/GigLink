const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
require('dotenv').config();

async function checkCurrentUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all users
    const users = await User.find().select('_id name email');
    console.log('\nAll users in database:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ID: ${user._id}`);
    });

    // Find all messages
    const messages = await Message.find()
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 });
    
    console.log('\nAll messages in database:');
    messages.forEach(message => {
      console.log(`- From: ${message.sender.name} To: ${message.recipient.name}`);
      console.log(`  Content: "${message.content}"`);
      console.log(`  Conversation ID: ${message.conversationId}`);
      console.log(`  Created: ${message.createdAt}`);
      console.log('');
    });

    // Check the user from socket logs
    const socketUserId = '68b90ae980c402fd3cc0d065';
    const socketUser = await User.findById(socketUserId).select('name email');
    if (socketUser) {
      console.log(`\nSocket user found: ${socketUser.name} (${socketUser.email})`);
      
      // Check if this user has any conversations
      const userMessages = await Message.find({
        $or: [{ sender: socketUserId }, { recipient: socketUserId }]
      }).populate('sender', 'name').populate('recipient', 'name');
      
      console.log(`\nMessages for socket user (${userMessages.length} found):`);
      userMessages.forEach(msg => {
        console.log(`- ${msg.sender.name} -> ${msg.recipient.name}: "${msg.content}"`);
      });
    } else {
      console.log(`\nSocket user ${socketUserId} not found in database`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkCurrentUser();