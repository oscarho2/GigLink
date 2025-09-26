const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Lazily create and cache a transporter. Falls back to an Ethereal test account
// when EMAIL_USER/PASS are not configured.
let transporterPromise = null;
const getTransporter = async () => {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    const smtpHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpSecure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
      // Create an Ethereal test account automatically for development
      const testAccount = await nodemailer.createTestAccount();
      const tx = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('\n[Email] Using Ethereal test account');
      console.log(`[Email] Login: ${testAccount.user}`);
      console.log(`[Email] Pass:  ${testAccount.pass}`);
      return tx;
    }

    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user, pass },
    });
  })();

  return transporterPromise;
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
  }),

  emailVerification: (recipientName, verificationUrl) => ({
    subject: 'Verify your GigLink account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1976d2; margin: 0;">GigLink</h1>
        </div>
        <h2 style="color: #333; text-align: center;">Welcome to GigLink!</h2>
        <p>Hi ${recipientName},</p>
        <p>Thank you for signing up for GigLink! To complete your registration and start connecting with musicians, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email Address</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #1976d2;">${verificationUrl}</p>
        <p><strong>This verification link will expire in 24 hours.</strong></p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">If you didn't create an account with GigLink, please ignore this email.</p>
      </div>
    `,
    text: `
      Welcome to GigLink!
      
      Hi ${recipientName},
      
      Thank you for signing up for GigLink! To complete your registration, please verify your email address by visiting this link:
      
      ${verificationUrl}
      
      This verification link will expire in 24 hours.
      
      If you didn't create an account with GigLink, please ignore this email.
    `
  }),

  passwordReset: (recipientName, resetUrl) => ({
    subject: 'Reset your GigLink password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1976d2; margin: 0;">GigLink</h1>
        </div>
        <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
        <p>Hi ${recipientName},</p>
        <p>We received a request to reset your password for your GigLink account. If you made this request, click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #1976d2;">${resetUrl}</p>
        <p><strong>This password reset link will expire in 1 hour.</strong></p>
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">For security reasons, this link can only be used once.</p>
      </div>
    `,
    text: `
      Password Reset Request
      
      Hi ${recipientName},
      
      We received a request to reset your password for your GigLink account. If you made this request, visit this link to reset your password:
      
      ${resetUrl}
      
      This password reset link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
    `
  })
};

// Send email notification
const sendEmailNotification = async (recipientEmail, notificationType, templateData) => {
  try {
    const transporter = await getTransporter();
    
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
    const preview = nodemailer.getTestMessageUrl && nodemailer.getTestMessageUrl(result);
    if (preview) console.log('Preview URL:', preview);
    
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

// Send email verification
const sendVerificationEmail = async (recipientEmail, recipientName, verificationToken) => {
  try {
    const transporter = await getTransporter();
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;
    
    const emailContent = emailTemplates.emailVerification(recipientName, verificationUrl);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"GigLink" <noreply@giglink.com>',
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully:', result.messageId);
    const preview = nodemailer.getTestMessageUrl && nodemailer.getTestMessageUrl(result);
    if (preview) console.log('Preview URL:', preview);
    return result;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (recipientEmail, recipientName, resetToken) => {
  try {
    const transporter = await getTransporter();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const emailContent = emailTemplates.passwordReset(recipientName, resetUrl);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"GigLink" <noreply@giglink.com>',
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', result.messageId);
    const preview = nodemailer.getTestMessageUrl && nodemailer.getTestMessageUrl(result);
    if (preview) console.log('Preview URL:', preview);
    return result;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendEmailNotification,
  shouldSendEmailNotification,
  emailTemplates,
  sendVerificationEmail,
  sendPasswordResetEmail
};
