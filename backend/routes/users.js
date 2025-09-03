const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mockDB = require('../utils/mockDatabase');

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

    const { name, email, password } = req.body;

    try {
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if user exists
      let existingUser;
      try {
        // Try MongoDB first
        existingUser = await User.findOne({ email: normalizedEmail });
      } catch (mongoErr) {
        // Fallback to mock database
        existingUser = await mockDB.findUserByEmail(normalizedEmail);
      }
      
      if (existingUser) {
        return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
      }

      // Create new user
      let user;
      try {
        // Try MongoDB first
        user = new User({
          name: name.trim(),
          email: normalizedEmail,
          password
        });
        await user.save();
      } catch (mongoErr) {
        // Fallback to mock database
        user = await mockDB.createUser({
          name: name.trim(),
          email: normalizedEmail,
          password
        });
      }

      // Create default profile for new user
      try {
        const defaultProfile = {
          _id: user.id,
          user: {
            _id: user.id,
            name: user.name,
            avatar: '',
            location: 'Location not specified'
          },
          bio: `Welcome to GigLink! I'm ${user.name} and I'm excited to connect with fellow musicians.`,
          skills: [],
          experience: 'Beginner',
          hourlyRate: 50,
          availability: 'Available',
          portfolio: [],
          videos: []
        };
        
        // Add profile to mock database for immediate availability
        await mockDB.createProfile(defaultProfile);
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

module.exports = router;