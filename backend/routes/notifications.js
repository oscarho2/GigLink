const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const Gig = require('../models/Gig');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const { getVapidPublicKey, sendPushNotificationToUser, shouldSendPushNotification } = require('../utils/pushNotificationService');
const { sendEmailNotification, shouldSendEmailNotification } = require('../utils/emailService');

// @route   GET api/notifications
// @desc    Get all notifications for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/notifications/unread
// @desc    Get unread notifications count
// @access  Private
router.get('/unread', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      recipient: req.user.id, 
      read: false 
    });
    
    res.json({ count });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );
    
    res.json({ msg: 'All notifications marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    
    res.json({ msg: 'Notification deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

const buildNotificationTemplateData = async ({ type, recipient, sender, message, relatedId, relatedModel }) => {
  if (!recipient) return null;

  const safeRecipientName = recipient.name || 'there';
  const safeSenderName = sender?.name || 'A GigLink user';

  switch (type) {
    case 'message':
      return {
        email: [safeRecipientName, safeSenderName],
        push: [safeSenderName]
      };
    case 'link_request':
      return {
        email: [safeRecipientName, safeSenderName],
        push: [safeSenderName]
      };
    case 'gig_application': {
      let gigTitle = '';
      if (relatedModel === 'Gig' && relatedId) {
        try {
          const gig = await Gig.findById(relatedId).select('title');
          if (gig) gigTitle = gig.title || '';
        } catch (err) {
          console.error('Error loading gig for notification:', err.message);
        }
      }
      return {
        email: [safeRecipientName, safeSenderName, gigTitle],
        push: [safeSenderName, gigTitle]
      };
    }
    case 'comment': {
      let postTitle = '';
      if (relatedModel === 'Post' && relatedId) {
        try {
          const post = await Post.findById(relatedId).select('title content');
          if (post) postTitle = post.title || '';
        } catch (err) {
          console.error('Error loading post for notification:', err.message);
        }
      }
      const normalizedTitle = postTitle || 'your post';
      const commentPreview = message || 'Visit GigLink to read the comment.';
      return {
        email: [safeRecipientName, safeSenderName, normalizedTitle, commentPreview],
        push: [safeSenderName, normalizedTitle]
      };
    }
    default:
      return null;
  }
};

// Helper function to create notifications
const createNotification = async (recipientId, senderId, type, message, relatedId, relatedModel, req = null) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      message,
      relatedId,
      relatedModel
    });
    
    await notification.save();
    
    // Populate sender info for real-time emission
    await notification.populate('sender', 'name avatar');
    
    // Emit real-time notification if socket.io is available
    if (req && req.app && req.app.get('io')) {
      const io = req.app.get('io');
      console.log(`Emitting notification to user ${recipientId.toString()}:`, {
        type: notification.type,
        message: notification.message,
        sender: notification.sender.name
      });
      io.to(recipientId.toString()).emit('newNotification', notification);
    } else {
      console.log('Socket.io not available for notification emission');
    }
    
    let recipient = null;
    try {
      recipient = await User.findById(recipientId)
        .select('name email notificationPreferences pushSubscriptions');
    } catch (err) {
      console.error('Error fetching notification recipient:', err.message);
    }

    const templateData = await buildNotificationTemplateData({
      type,
      recipient,
      sender: notification.sender,
      message,
      relatedId,
      relatedModel
    });

    if (recipient && templateData) {
      try {
        await sendNotificationToUser(recipientId, type, templateData, { recipient });
      } catch (err) {
        console.error('Error dispatching email/push notification:', err.message);
      }
    }

    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
    throw err;
  }
};

// @route   GET api/notifications/vapid-public-key
// @desc    Get VAPID public key for push notifications
// @access  Public
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = getVapidPublicKey();
    res.json({ publicKey });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/notifications/subscribe
// @desc    Subscribe to push notifications
// @access  Private
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ msg: 'Invalid subscription data' });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Check if subscription already exists
    const existingSubscription = user.pushSubscriptions.find(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (!existingSubscription) {
      // Add new subscription
      user.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      });
      
      await user.save();
    }
    
    res.json({ msg: 'Subscription added successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/notifications/unsubscribe
// @desc    Unsubscribe from push notifications
// @access  Private
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ msg: 'Endpoint is required' });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Remove subscription
    user.pushSubscriptions = user.pushSubscriptions.filter(
      sub => sub.endpoint !== endpoint
    );
    
    await user.save();
    
    res.json({ msg: 'Subscription removed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Helper function to send notifications (can be used by other routes)
const sendNotificationToUser = async (recipientId, notificationType, templateData, options = {}) => {
  try {
    const recipient = options.recipient || await User.findById(recipientId)
      .select('name email notificationPreferences pushSubscriptions');
    if (!recipient) {
      console.error('Recipient not found:', recipientId);
      return { success: false, error: 'Recipient not found' };
    }
    
    const results = {
      email: null,
      push: null
    };

    const resolveTemplateData = (channel) => {
      if (Array.isArray(templateData)) return templateData;
      if (templateData && typeof templateData === 'object') {
        const data = templateData[channel];
        return Array.isArray(data) ? data : [];
      }
      return [];
    };
    
    // Send email notification if enabled
    if (shouldSendEmailNotification(recipient.notificationPreferences, notificationType)) {
      const emailData = resolveTemplateData('email');
      results.email = await sendEmailNotification(
        recipient.email,
        notificationType,
        emailData
      );
    }
    
    // Send push notification if enabled
    if (shouldSendPushNotification(recipient.notificationPreferences, notificationType)) {
      const pushData = resolveTemplateData('push');
      results.push = await sendPushNotificationToUser(
        recipient.pushSubscriptions,
        notificationType,
        pushData
      );
    }
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = { router, createNotification, sendNotificationToUser };
