const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Profile = require('../models/Profile');

// @route   GET api/users
// @desc    Get all users
// @access  Public
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/users
// @desc    Register a user
// @access  Public
router.post(
  '/',
  [
    check('name', 'Name is required')
      .not().isEmpty()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name can only contain letters and spaces'),
    check('email', 'Please include a valid email')
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 100 })
      .withMessage('Email must be less than 100 characters'),
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

    const { name, email, password, isMusician } = req.body;

    try {
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if user exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      
      if (existingUser) {
        return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
      }

      // Create new user
      const user = new User({
        name: name.trim(),
        email: normalizedEmail,
        password,
        isMusician: isMusician === 'yes' ? 'yes' : 'no'
      });
      await user.save();

      // Create default profile for new user
      try {
        const defaultProfile = new Profile({
          user: user._id,
          skills: [],
          videos: []
        });
        await defaultProfile.save();
      } catch (profileErr) {
        console.error('Error creating default profile:', profileErr);
        // Don't fail registration if profile creation fails
      }

      // Return JWT with user info
      const payload = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
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
              email: user.email
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

// @route   PUT api/users/change-password
// @desc    Change user password
// @access  Private
router.put(
  '/change-password',
  [
    auth,
    check('currentPassword', 'Current password is required')
      .not().isEmpty(),
    check('newPassword', 'New password must be at least 8 characters long')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    check('confirmPassword', 'Password confirmation is required')
      .not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    try {
      // Check if new password and confirmation match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ errors: [{ msg: 'New password and confirmation do not match' }] });
      }

      // Get user from database
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ errors: [{ msg: 'User not found' }] });
      }

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ errors: [{ msg: 'Current password is incorrect' }] });
      }

      // Check if new password is different from current password
      const isSamePassword = await user.comparePassword(newPassword);
      if (isSamePassword) {
        return res.status(400).json({ errors: [{ msg: 'New password must be different from current password' }] });
      }

      // Update password (the pre-save hook will hash it)
      user.password = newPassword;
      await user.save();

      res.json({ msg: 'Password changed successfully' });
    } catch (err) {
      console.error('Change password error:', err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;