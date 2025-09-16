const mongoose = require('mongoose');
const User = require('../models/User');
const { createNotification } = require('../routes/notifications');
require('dotenv').config();

const createTimLiNotification = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/giglink');
    console.log('Connected to MongoDB');

    // Find Oscar (recipient) and Jane Smith (sender to simulate Tim Li)
    const oscar = await User.findOne({ email: 'oscar@oscarho.co.uk' });
    const janeSmith = await User.findOne({ email: 'jane.smith@example.com' });
    
    if (!oscar || !janeSmith) {
      console.log('Required users not found');
      console.log('Oscar found:', !!oscar);
      console.log('Jane Smith found:', !!janeSmith);
      return;
    }

    console.log(`Creating message notification from Tim Li (using Jane Smith's ID)`);
    console.log(`Recipient: ${oscar.email} (${oscar._id})`);
    console.log(`Sender: ${janeSmith.email} (${janeSmith._id})`);

    // Create a test message notification from "Tim Li"
    const messageNotification = await createNotification(
      oscar._id,
      janeSmith._id,
      'message',
      'Tim Li sent you a message',
      janeSmith._id, // Using sender ID so notification can open conversation with sender
      'Message'
    );

    console.log('Created message notification from Tim Li:', messageNotification._id);
    console.log('\nTest notification created successfully!');
    console.log('You can now test by:');
    console.log('1. Going to http://localhost:3000/notifications');
    console.log('2. Clicking on the "Tim Li sent you a message" notification');
    console.log('3. Verifying it opens the Messages page with the conversation with Jane Smith');

  } catch (error) {
    console.error('Error creating Tim Li notification:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

createTimLiNotification();