const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const mockDB = require('../utils/mockDatabase');

// @route   GET api/auth
// @desc    Get authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let user;
    try {
      // Try MongoDB first
      user = await User.findById(req.user.id).select('-password');
    } catch (mongoErr) {
      // Fallback to mock database
      user = await mockDB.findUserById(req.user.id);
      if (user) {
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        user = userWithoutPassword;
      }
    }
    
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
      let user;
      let isMatch = false;
      
      try {
        // Try MongoDB first
        user = await User.findOne({ email: normalizedEmail });
        if (user) {
          isMatch = await user.comparePassword(password);
        }
      } catch (mongoErr) {
        // Fallback to mock database
        user = await mockDB.findUserByEmail(normalizedEmail);
        if (user) {
          isMatch = await mockDB.comparePassword(password, user.password);
        }
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

module.exports = router;