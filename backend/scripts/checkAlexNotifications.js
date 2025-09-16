const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
require('dotenv').config();

const checkAlexNotifications = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/giglink');
    console.log('Connected to MongoDB');

    // Find Alex Johnson's user account
    const alexUser = await User.findOne({ 
      $or: [
        { email: 'alex.johnson@email.com' },
        { _id: '68b90a57842df42b03530828' },
        { firstName: 'Alex', lastName: 'Johnson' },
        { name: 'Alex Johnson' }
      ]
    });

    if (!alexUser) {
      console.log('Alex Johnson user not found');
      return;
    }

    console.log('Found Alex Johnson:', {
      id: alexUser._id,
      email: alexUser.email,
      firstName: alexUser.firstName,
      lastName: alexUser.lastName,
      name: alexUser.name
    });

    // Find all notifications for Alex Johnson
    const notifications = await Notification.find({ recipient: alexUser._id })
      .sort({ createdAt: -1 })
      .populate('sender', 'firstName lastName email name');

    console.log(`\nTotal notifications for Alex Johnson: ${notifications.length}`);
    
    const unreadNotifications = notifications.filter(n => !n.read);
    console.log(`Unread notifications: ${unreadNotifications.length}`);

    if (unreadNotifications.length > 0) {
      console.log('\nUnread notifications:');
      unreadNotifications.forEach((notif, index) => {
        console.log(`${index + 1}. ID: ${notif._id}`);
        console.log(`   Type: ${notif.type}`);
        console.log(`   Title: ${notif.title}`);
        console.log(`   Message: ${notif.message}`);
        console.log(`   Read: ${notif.read}`);
        console.log(`   Created: ${notif.createdAt}`);
        console.log(`   Sender: ${notif.sender ? `${notif.sender.firstName || notif.sender.name} ${notif.sender.lastName || ''}` : 'N/A'}`);
        console.log('---');
      });
    }

    // Show all notifications (read and unread)
    console.log('\nAll notifications:');
    notifications.forEach((notif, index) => {
      console.log(`${index + 1}. [${notif.read ? 'READ' : 'UNREAD'}] ${notif.type} - ${notif.title || notif.message} (${notif.createdAt})`);
    });

    // Check if there are any notifications with this user ID as recipient
    const directIdCheck = await Notification.find({ recipient: '68b90a57842df42b03530828' })
      .populate('sender', 'firstName lastName email name');
    
    console.log(`\nDirect ID check notifications: ${directIdCheck.length}`);
    if (directIdCheck.length > 0) {
      directIdCheck.forEach((notif, index) => {
        console.log(`${index + 1}. [${notif.read ? 'READ' : 'UNREAD'}] ${notif.type} - ${notif.title || notif.message}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

checkAlexNotifications();