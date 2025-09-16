const mongoose = require('mongoose');
const User = require('../models/User');
const { createNotification } = require('../routes/notifications');
require('dotenv').config();

const createTestNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/giglink');
    console.log('Connected to MongoDB');

    // Find two users to create test notifications
    const users = await User.find({}).limit(2);
    
    if (users.length < 2) {
      console.log('Need at least 2 users in database to create test notifications');
      return;
    }

    const user1 = users[0];
    const user2 = users[1];

    console.log(`Creating test notifications between:`);
    console.log(`User 1: ${user1.email} (${user1._id})`);
    console.log(`User 2: ${user2.email} (${user2._id})`);

    // Create a test message notification
    const messageNotification = await createNotification(
      user1._id,
      user2._id,
      'message',
      `${user2.firstName || user2.email} sent you a message`,
      user2._id, // Using sender ID so notification can open conversation with sender
      'Message'
    );

    console.log('Created message notification:', messageNotification._id);

    // Create a test link request notification
    const linkNotification = await createNotification(
      user1._id,
      user2._id,
      'link_request',
      `${user2.firstName || user2.email} sent you a connection request`,
      user2._id, // Using user2's ID as relatedId for testing
      'Link'
    );

    console.log('Created link request notification:', linkNotification._id);

    console.log('\nTest notifications created successfully!');
    console.log('You can now test the notification routing by:');
    console.log('1. Going to http://localhost:3000/notifications');
    console.log('2. Clicking on the message notification to test conversation opening');
    console.log('3. Clicking on the link request notification to test Links page navigation');

  } catch (error) {
    console.error('Error creating test notifications:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

createTestNotifications();