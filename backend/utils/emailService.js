const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // For development, use ethereal email (fake SMTP service)
  // In production, replace with actual email service (Gmail, SendGrid, etc.)
  return nodemailer.createTransporter({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: process.env.EMAIL_USER || 'ethereal.user@ethereal.email',
      pass: process.env.EMAIL_PASS || 'ethereal.pass'
    }
  });
};

// Email templates
const emailTemplates = {
  like: (recipientName, likerName, postTitle) => ({
    subject: `${likerName} liked your post`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">New Like on Your Post!</h2>
        <p>Hi ${recipientName},</p>
        <p><strong>${likerName}</strong> liked your post: "${postTitle}"</p>
        <p>Check it out on GigLink to see more interactions!</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">You're receiving this because you have like notifications enabled. You can change your notification preferences in your settings.</p>
      </div>
    `
  }),
  
  comment: (recipientName, commenterName, postTitle, commentText) => ({
    subject: `${commenterName} commented on your post`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">New Comment on Your Post!</h2>
        <p>Hi ${recipientName},</p>
        <p><strong>${commenterName}</strong> commented on your post: "${postTitle}"</p>
        <blockquote style="border-left: 3px solid #1976d2; padding-left: 15px; margin: 15px 0; color: #555;">
          ${commentText}
        </blockquote>
        <p>Reply to keep the conversation going!</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">You're receiving this because you have comment notifications enabled. You can change your notification preferences in your settings.</p>
      </div>
    `
  }),
  
  message: (recipientName, senderName) => ({
    subject: `New message from ${senderName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">New Direct Message!</h2>
        <p>Hi ${recipientName},</p>
        <p>You have a new message from <strong>${senderName}</strong>.</p>
        <p>Log in to GigLink to read and reply to your message.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">You're receiving this because you have message notifications enabled. You can change your notification preferences in your settings.</p>
      </div>
    `
  }),
  
  gigResponse: (recipientName, responderName, gigTitle) => ({
    subject: `New response to your gig: ${gigTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">New Gig Response!</h2>
        <p>Hi ${recipientName},</p>
        <p><strong>${responderName}</strong> responded to your gig: "${gigTitle}"</p>
        <p>Check out their response and consider them for your project!</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">You're receiving this because you have gig response notifications enabled. You can change your notification preferences in your settings.</p>
      </div>
    `
  }),
  
  gigApplication: (recipientName, applicantName, gigTitle) => ({
    subject: `New application for your gig: ${gigTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">New Gig Application!</h2>
        <p>Hi ${recipientName},</p>
        <p><strong>${applicantName}</strong> applied for your gig: "${gigTitle}"</p>
        <p>Review their application and portfolio to make your decision!</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">You're receiving this because you have gig application notifications enabled. You can change your notification preferences in your settings.</p>
      </div>
    `
  }),
  
  linkRequest: (recipientName, requesterName) => ({
    subject: `${requesterName} wants to connect with you`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">New Connection Request!</h2>
        <p>Hi ${recipientName},</p>
        <p><strong>${requesterName}</strong> wants to connect with you on GigLink.</p>
        <p>Check out their profile and accept the request to start networking!</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">You're receiving this because you have link request notifications enabled. You can change your notification preferences in your settings.</p>
      </div>
    `
  })
};

// Send email notification
const sendEmailNotification = async (recipientEmail, notificationType, templateData) => {
  try {
    const transporter = createTransporter();
    
    // Get email template
    const template = emailTemplates[notificationType];
    if (!template) {
      throw new Error(`Unknown notification type: ${notificationType}`);
    }
    
    const emailContent = template(...templateData);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"GigLink" <noreply@giglink.com>',
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Check if user has email notifications enabled for specific type
const shouldSendEmailNotification = (userPreferences, notificationType) => {
  if (!userPreferences || !userPreferences.emailNotifications) {
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

module.exports = {
  sendEmailNotification,
  shouldSendEmailNotification,
  emailTemplates
};