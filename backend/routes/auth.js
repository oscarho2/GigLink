const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { check, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { sendPasswordResetEmail } = require('../utils/emailService');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @route   GET api/auth
// @desc    Get authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/',
  [
    check('email', 'Please include a valid email')
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 100 })
      .withMessage('Email must be less than 100 characters'),
    check('password', 'Password is required')
      .exists()
      .isLength({ min: 1 })
      .withMessage('Password cannot be empty')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if user exists
      const user = await User.findOne({ email: normalizedEmail });
      let isMatch = false;
      
      if (user) {
        isMatch = await user.comparePassword(password);
      }
      
      if (!user) {
        return res.status(400).json({ 
          errors: [{ msg: 'This email is not registered. Please join to create an account.' }],
          type: 'unregistered_email'
        });
      }

      if (!isMatch) {
        return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
      }

      // Return JWT with user info
      const payload = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isEmailVerified: user.isEmailVerified
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
        (err, token) => {
          if (err) {
            console.error('JWT signing error:', err);
            return res.status(500).json({ errors: [{ msg: 'Error generating token' }] });
          }
          res.json({ 
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
              isEmailVerified: user.isEmailVerified
            }
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/auth/google
// @desc    Authenticate user with Google OAuth
// @access  Public
router.post('/google', async (req, res) => {
  try {
    const { idToken, email, name, imageUrl } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'ID token is required' });
    }

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const verifiedEmail = payload['email'];
    const emailVerified = payload['email_verified'];

    // Verify email matches
    if (verifiedEmail !== email) {
      return res.status(400).json({ message: 'Email verification failed' });
    }

    // Normalize email
    const normalizedEmail = verifiedEmail.toLowerCase().trim();

    // Check if user already exists
    let user = await User.findOne({ 
      $or: [
        { email: normalizedEmail },
        { googleId: googleId }
      ]
    });
    
    if (user) {
      // Update Google ID and avatar if not set
      let needsUpdate = false;
      if (!user.googleId) {
        user.googleId = googleId;
        needsUpdate = true;
      }
      if (imageUrl && (!user.avatar || user.avatar !== imageUrl)) {
        user.avatar = imageUrl;
        needsUpdate = true;
      }
      if (!user.isEmailVerified && emailVerified) {
        user.isEmailVerified = true;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await user.save();
      }
    } else {
      // Create new user with pre-hashed placeholder password
      const salt = await require('bcryptjs').genSalt(10);
      const hashedPlaceholder = await require('bcryptjs').hash('google_oauth_user', salt);
      
      user = new User({
        name: name || verifiedEmail.split('@')[0],
        email: normalizedEmail,
        googleId: googleId,
        avatar: imageUrl,
        password: hashedPlaceholder,
        isEmailVerified: emailVerified || true // Google users are considered verified
      });
      
      // Skip password hashing middleware for this user
      user.isNew = false;
      await user.save({ validateBeforeSave: true });
    }

    // Check if user has a profile
    let profile = await Profile.findOne({ user: user._id });
    const profileComplete = !!profile;

    // Generate JWT token
    const jwtPayload = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified
      }
    };

    jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) {
          console.error('JWT signing error:', err);
          return res.status(500).json({ message: 'Error generating token' });
        }
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            isEmailVerified: user.isEmailVerified,
            profileComplete: profileComplete
          }
        });
      }
    );
  } catch (error) {
    console.error('Google OAuth Error:', error);
    
    // Provide more specific error messages
    if (error.message && error.message.includes('Invalid token')) {
      return res.status(400).json({ message: 'Invalid Google token' });
    }
    
    res.status(500).json({ 
      message: 'Server error during Google authentication',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   GET api/auth/verify-email/:token
// @desc    Verify user email
// @access  Public
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ 
        success: false,
        message: 'Verification token is required' 
      });
    }

    // Find user with this verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired verification token' 
      });
    }

    // Mark email as verified and clear verification fields
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ 
      success: true,
      message: 'Email verified successfully! You can now log in to your account.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Email verification error:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error during email verification' 
    });
  }
});

// @route   POST api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post(
  '/forgot-password',
  [
    check('email', 'Please include a valid email')
      .isEmail()
      .normalizeEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      // Generate password reset token
      const passwordResetToken = crypto.randomBytes(32).toString('hex');
      const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token to user
      user.passwordResetToken = passwordResetToken;
      user.passwordResetExpires = passwordResetExpires;
      await user.save();

      // Send password reset email
      try {
        await sendPasswordResetEmail(user.email, user.name, passwordResetToken);
        
        res.json({ 
          success: true,
          message: 'A password reset link has been sent to your email.' 
        });
      } catch (emailErr) {
        console.error('Error sending password reset email:', emailErr);
        res.status(500).json({ 
          success: false,
          message: 'Error sending password reset email. Please try again later.' 
        });
      }
    } catch (err) {
      console.error('Password reset request error:', err.message);
      res.status(500).json({ 
        success: false,
        message: 'Server error during password reset request' 
      });
    }
  }
);

// @route   POST api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post(
  '/reset-password',
  [
    check('token', 'Reset token is required')
      .not().isEmpty(),
    check('password', 'Password must be at least 8 characters long')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    try {
      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid or expired password reset token' 
        });
      }

      // Update password and clear reset fields
      user.password = password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      res.json({ 
        success: true,
        message: 'Password reset successfully! You can now log in with your new password.' 
      });
    } catch (err) {
      console.error('Password reset error:', err.message);
      res.status(500).json({ 
        success: false,
        message: 'Server error during password reset' 
      });
    }
  }
);

module.exports = router;