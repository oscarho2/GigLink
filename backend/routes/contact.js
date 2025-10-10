const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { sendContactEmail } = require('../utils/emailService');
const fs = require('fs/promises');
const path = require('path');

const CONTACT_FALLBACK_PATH = path.join(__dirname, '..', 'logs', 'contact-fallback.log');

const persistContactFallback = async (payload) => {
  try {
    await fs.mkdir(path.dirname(CONTACT_FALLBACK_PATH), { recursive: true });
    const line = `${JSON.stringify({ ...payload, storedAt: new Date().toISOString() })}\n`;
    await fs.appendFile(CONTACT_FALLBACK_PATH, line, 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to persist contact fallback message:', err);
    return false;
  }
};

// Rate limiting for contact form - 5 submissions per hour per IP
const contactRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: {
    error: 'Too many contact form submissions. Please try again later.',
    retryAfter: 'You can submit again in 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Contact form validation rules
const contactValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .escape(),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Subject must be less than 200 characters')
    .escape(),
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters')
    .escape(),
  body('category')
    .optional()
    .isIn(['general', 'support', 'bug', 'feature', 'business'])
    .withMessage('Invalid category selected')
];

// @route   POST api/contact
// @desc    Submit contact form
// @access  Public
router.post('/', contactRateLimit, contactValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, subject, message, category = 'general' } = req.body;

    // Send email to admin/support team
    const emailResult = await sendContactEmail({
      name,
      email,
      subject: subject || `Contact Form - ${category}`,
      message,
      category,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    if (emailResult.success) {
      res.status(200).json({
        success: true,
        message: 'Thank you for your message! We will get back to you soon.',
        messageId: emailResult.messageId,
        confirmationId: emailResult.confirmationId
      });
    } else {
      console.error('Contact form email failed:', emailResult.error);
      const stored = await persistContactFallback({
        name,
        email,
        subject: subject || `Contact Form - ${category}`,
        message,
        category,
        timestamp: new Date().toISOString(),
        reason: emailResult.error
      });

      if (stored) {
        return res.status(202).json({
          success: true,
          message: 'We received your message but could not send the confirmation email yet. Our team will review it shortly.',
          delivery: 'queued'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to send message. Please try again later.',
        error: 'Email service unavailable'
      });
    }

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// @route   GET api/contact/categories
// @desc    Get available contact categories
// @access  Public
router.get('/categories', (req, res) => {
  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'support', label: 'Technical Support' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'business', label: 'Business Inquiry' }
  ];

  res.json({
    success: true,
    categories
  });
});

module.exports = router;
