const mongoose = require('mongoose');
const User = require('../models/User');
const Notification = require('../models/Notification');
require('dotenv').config();

const debugPersistentNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/giglink');
    console.log('Connected to MongoDB');

    // Find all users
    const users = await User.find({}).select('firstName lastName email');
    console.log(`\nFound ${users.length} users in database`);

    // Check each user for notifications
    for (const user of users) {
      const notifications = await Notification.find({ recipient: user._id });
      const unreadNotifications = notifications.filter(n => !n.read);
      
      if (notifications.length > 0 || unreadNotifications.length > 0) {
        console.log(`\nUser: ${user.email}`);
        console.log(`  Name: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
        console.log(`  Total notifications: ${notifications.length}`);
        console.log(`  Unread notifications: ${unreadNotifications.length}`);
        
        if (unreadNotifications.length > 0) {
          console.log('  Unread details:');
          unreadNotifications.forEach((notif, index) => {
            console.log(`    ${index + 1}. ${notif.type} - ${notif.title || 'No title'} (${notif.createdAt})`);
          });
        }
      }
    }

    // Check for any orphaned notifications (notifications without valid recipients)
    const orphanedNotifications = await Notification.find({
      $or: [
        { recipient: null },
        { recipient: { $exists: false } }
      ]
    });

    if (orphanedNotifications.length > 0) {
      console.log(`\nFound ${orphanedNotifications.length} orphaned notifications:`);
      orphanedNotifications.forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.type} - ${notif.title || 'No title'} (recipient: ${notif.recipient})`);
      });
    }

    // Check for notifications with invalid recipient IDs
    const allNotifications = await Notification.find({});
    const invalidNotifications = [];
    
    for (const notif of allNotifications) {
      if (notif.recipient) {
        const recipientExists = await User.findById(notif.recipient);
        if (!recipientExists) {
          invalidNotifications.push(notif);
        }
      }
    }

    if (invalidNotifications.length > 0) {
      console.log(`\nFound ${invalidNotifications.length} notifications with invalid recipients:`);
      invalidNotifications.forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.type} - ${notif.title || 'No title'} (invalid recipient: ${notif.recipient})`);
      });
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Total users: ${users.length}`);
    console.log(`Total notifications: ${allNotifications.length}`);
    console.log(`Orphaned notifications: ${orphanedNotifications.length}`);
    console.log(`Invalid recipient notifications: ${invalidNotifications.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

debugPersistentNotifications();