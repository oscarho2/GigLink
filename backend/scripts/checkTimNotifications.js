const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
require('dotenv').config();

const checkTimNotifications = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/giglink');
    console.log('Connected to MongoDB');

    // Find Tim Li's user account
    const timUser = await User.findOne({ 
      $or: [
        { email: /tim.*li/i },
        { firstName: 'Tim', lastName: 'Li' },
        { firstName: /tim/i, lastName: /li/i }
      ]
    });

    if (!timUser) {
      console.log('Tim Li user not found');
      return;
    }

    console.log('Found Tim Li:', {
      id: timUser._id,
      email: timUser.email,
      firstName: timUser.firstName,
      lastName: timUser.lastName
    });

    // Find all notifications for Tim Li
    const notifications = await Notification.find({ recipient: timUser._id })
      .sort({ createdAt: -1 })
      .populate('sender', 'firstName lastName email');

    console.log(`\nTotal notifications for Tim Li: ${notifications.length}`);
    
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
        console.log(`   Sender: ${notif.sender ? `${notif.sender.firstName} ${notif.sender.lastName}` : 'N/A'}`);
        console.log('---');
      });
    }

    // Show all notifications (read and unread)
    console.log('\nAll notifications:');
    notifications.forEach((notif, index) => {
      console.log(`${index + 1}. [${notif.read ? 'READ' : 'UNREAD'}] ${notif.type} - ${notif.title || 'No title'} (${notif.createdAt})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

checkTimNotifications();