const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
require('dotenv').config();

const checkAllNotifications = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/giglink');
    console.log('Connected to MongoDB');

    // Find all notifications
    const notifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .populate('recipient', 'firstName lastName email')
      .populate('sender', 'firstName lastName email');

    console.log(`\nTotal notifications in database: ${notifications.length}`);
    
    const unreadNotifications = notifications.filter(n => !n.read);
    console.log(`Total unread notifications: ${unreadNotifications.length}`);

    if (unreadNotifications.length > 0) {
      console.log('\nUnread notifications:');
      unreadNotifications.forEach((notif, index) => {
        console.log(`${index + 1}. ID: ${notif._id}`);
        console.log(`   Recipient: ${notif.recipient?.email || 'Unknown'} (ID: ${notif.recipient?._id})`);
        console.log(`   Type: ${notif.type}`);
        console.log(`   Title: ${notif.title}`);
        console.log(`   Message: ${notif.message}`);
        console.log(`   Read: ${notif.read}`);
        console.log(`   Created: ${notif.createdAt}`);
        console.log(`   Sender: ${notif.sender?.email || 'N/A'}`);
        console.log('---');
      });
    }

    // Group notifications by recipient
    const notificationsByUser = {};
    notifications.forEach(notif => {
      const userId = notif.recipient?._id?.toString() || 'unknown';
      const userEmail = notif.recipient?.email || 'unknown';
      
      if (!notificationsByUser[userId]) {
        notificationsByUser[userId] = {
          email: userEmail,
          total: 0,
          unread: 0
        };
      }
      
      notificationsByUser[userId].total++;
      if (!notif.read) {
        notificationsByUser[userId].unread++;
      }
    });

    console.log('\nNotifications by user:');
    Object.entries(notificationsByUser).forEach(([userId, data]) => {
      console.log(`User: ${data.email} (ID: ${userId})`);
      console.log(`  Total: ${data.total}, Unread: ${data.unread}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

checkAllNotifications();