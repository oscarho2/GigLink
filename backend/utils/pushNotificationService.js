const webpush = require('web-push');

// Generate VAPID keys if not provided
let vapidKeys;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
  };
} else {
  // Generate new VAPID keys for development
  vapidKeys = webpush.generateVAPIDKeys();
  console.log('Generated VAPID keys for development:');
  console.log('Public Key:', vapidKeys.publicKey);
  console.log('Private Key:', vapidKeys.privateKey);
  console.log('Add these to your environment variables for production');
}

// Configure web-push with VAPID details
webpush.setVapidDetails(
  'mailto:support@giglink.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Push notification templates
const pushTemplates = {
  like: (likerName, postTitle) => ({
    title: 'New Like!',
    body: `${likerName} liked your post: "${postTitle}"`,
    icon: '/images/notification-icon.png',
    badge: '/images/badge-icon.png',
    tag: 'like-notification',
    data: {
      type: 'like',
      url: '/posts'
    }
  }),
  
  comment: (commenterName, postTitle) => ({
    title: 'New Comment!',
    body: `${commenterName} commented on your post: "${postTitle}"`,
    icon: '/images/notification-icon.png',
    badge: '/images/badge-icon.png',
    tag: 'comment-notification',
    data: {
      type: 'comment',
      url: '/posts'
    }
  }),
  
  message: (senderName) => ({
    title: 'New Message!',
    body: `You have a new message from ${senderName}`,
    icon: '/images/notification-icon.png',
    badge: '/images/badge-icon.png',
    tag: 'message-notification',
    data: {
      type: 'message',
      url: '/messages'
    }
  }),
  
  gigResponse: (responderName, gigTitle) => ({
    title: 'New Gig Response!',
    body: `${responderName} responded to your gig: "${gigTitle}"`,
    icon: '/images/notification-icon.png',
    badge: '/images/badge-icon.png',
    tag: 'gig-response-notification',
    data: {
      type: 'gigResponse',
      url: '/gigs'
    }
  }),
  
  gigApplication: (applicantName, gigTitle) => ({
    title: 'New Gig Application!',
    body: `${applicantName} applied for your gig: "${gigTitle}"`,
    icon: '/images/notification-icon.png',
    badge: '/images/badge-icon.png',
    tag: 'gig-application-notification',
    data: {
      type: 'gigApplication',
      url: '/gigs'
    }
  }),
  
  linkRequest: (requesterName) => ({
    title: 'New Connection Request!',
    body: `${requesterName} wants to connect with you`,
    icon: '/images/notification-icon.png',
    badge: '/images/badge-icon.png',
    tag: 'link-request-notification',
    data: {
      type: 'linkRequest',
      url: '/connections'
    }
  })
};

// Send push notification
const sendPushNotification = async (subscription, notificationType, templateData) => {
  try {
    // Get push template
    const template = pushTemplates[notificationType];
    if (!template) {
      throw new Error(`Unknown notification type: ${notificationType}`);
    }
    
    const payload = JSON.stringify(template(...templateData));
    
    const result = await webpush.sendNotification(subscription, payload);
    console.log('Push notification sent successfully');
    
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send push notifications to all user's subscriptions
const sendPushNotificationToUser = async (userSubscriptions, notificationType, templateData) => {
  if (!userSubscriptions || userSubscriptions.length === 0) {
    return { success: true, message: 'No subscriptions found' };
  }
  
  const results = [];
  
  for (const subscription of userSubscriptions) {
    try {
      const result = await sendPushNotification(subscription, notificationType, templateData);
      results.push(result);
    } catch (error) {
      console.error('Error sending push to subscription:', error);
      results.push({ success: false, error: error.message });
    }
  }
  
  return {
    success: true,
    results,
    totalSent: results.filter(r => r.success).length,
    totalFailed: results.filter(r => !r.success).length
  };
};

// Check if user has push notifications enabled for specific type
const shouldSendPushNotification = (userPreferences, notificationType) => {
  if (!userPreferences || !userPreferences.pushNotifications) {
    return false;
  }
  
  const typeMapping = {
    like: 'likeNotifications',
    comment: 'commentNotifications',
    message: 'messageNotifications',
    gigResponse: 'gigResponseNotifications',
    gigApplication: 'gigApplicationNotifications',
    linkRequest: 'linkRequestNotifications'
  };
  
  const preferenceKey = typeMapping[notificationType];
  return preferenceKey ? userPreferences[preferenceKey] : false;
};

// Get VAPID public key for frontend
const getVapidPublicKey = () => {
  return vapidKeys.publicKey;
};

module.exports = {
  sendPushNotification,
  sendPushNotificationToUser,
  shouldSendPushNotification,
  getVapidPublicKey,
  pushTemplates
};