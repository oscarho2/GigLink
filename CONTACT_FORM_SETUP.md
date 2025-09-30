# Contact Form Email Configuration Guide

The contact form is now fully functional and will send emails to your configured email address.

## Required Environment Variables

Add these to your `.env` file in the backend directory:

```bash
# Email Configuration for Contact Form
ADMIN_EMAIL=your-admin-email@domain.com    # Where contact form emails will be sent
EMAIL_FROM="GigLink Support <noreply@yourdomain.com>"  # From address for emails

# SMTP Configuration (choose one option below)

# Option 1: For development (uses Ethereal test accounts automatically)
# No additional configuration needed - emails will show preview URLs in console

# Option 2: For production with Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password  # Use App Password, not regular password

# Option 3: For production with other SMTP providers
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_SECURE=false  # or true for port 465
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000  # or your production domain
```

## Gmail Setup Instructions

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an "App Password" for the application
3. Use the App Password as EMAIL_PASS (not your regular Gmail password)

## Features Implemented

✅ **Complete Contact Form**
- Name, email, subject, message fields
- Category selection (General, Support, Bug Report, Feature Request, Business)
- Form validation (frontend and backend)
- Character limits and required field validation

✅ **Backend API**
- Rate limiting (5 submissions per hour per IP)
- Input validation and sanitization
- Professional email templates
- Error handling and logging

✅ **Email System**
- Sends formatted emails to admin
- Includes contact details, message, and technical info
- Reply-to functionality (admin can reply directly to contact person)
- Works with development test accounts or production SMTP

✅ **Security Features**
- Rate limiting to prevent spam
- Input sanitization to prevent XSS
- CSRF protection
- Proper error handling

✅ **User Experience**
- Loading states and progress indicators
- Clear error messages
- Success confirmations
- Responsive design
- Character counters

## Testing

1. Start the backend server
2. Visit the contact page in your frontend
3. Fill out and submit the form
4. Check the backend console for email preview URLs (in development)
5. Check your admin email inbox (in production)

## API Endpoints

- `POST /api/contact` - Submit contact form
- `GET /api/contact/categories` - Get available categories

The contact form is now production-ready and includes all necessary features for a professional contact system.