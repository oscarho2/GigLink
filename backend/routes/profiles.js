const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Profile = require('../models/Profile');
const User = require('../models/User');

// @route   GET api/profiles/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate('user', ['name', 'avatar']);
    
    if (!profile) {
      return res.status(400).json({ msg: 'Profile not found for this user' });
    }
    
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/profiles
// @desc    Create or update user profile
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    // Find profile
    let profile = await Profile.findOne({ user: req.user.id });
    
    // If profile exists, update it
    if (profile) {
      profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: req.body },
        { new: true }
      );
      
      return res.json(profile);
    }
    
    // Create new profile
    profile = new Profile({
      user: req.user.id,
      ...req.body
    });
    
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/profiles
// @desc    Get all profiles
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Sample musician profiles for demonstration
    const sampleProfiles = [
      {
        _id: '1',
        user: {
          _id: 'user1',
          name: 'Alex Johnson',
          bio: 'Professional guitarist with 10+ years of experience in rock and jazz.',
          location: 'Los Angeles, CA',
          instruments: ['Guitar', 'Bass'],
          genres: ['Rock', 'Jazz', 'Blues'],
          experience: '10+ years'
        },
        skills: ['Lead Guitar', 'Rhythm Guitar', 'Music Production', 'Songwriting'],
        latestExperience: 'Lead guitarist for indie rock band "The Echoes"'
      },
      {
        _id: '2',
        user: {
          _id: 'user2',
          name: 'Sarah Martinez',
          bio: 'Versatile vocalist and pianist specializing in pop and R&B.',
          location: 'Nashville, TN',
          instruments: ['Vocals', 'Piano', 'Keyboard'],
          genres: ['Pop', 'R&B', 'Soul'],
          experience: '8 years'
        },
        skills: ['Lead Vocals', 'Backing Vocals', 'Piano', 'Songwriting'],
        latestExperience: 'Studio session vocalist for major label artists'
      },
      {
        _id: '3',
        user: {
          _id: 'user3',
          name: 'Mike Chen',
          bio: 'Dynamic drummer with experience in multiple genres.',
          location: 'New York, NY',
          instruments: ['Drums', 'Percussion'],
          genres: ['Rock', 'Pop', 'Funk', 'Latin'],
          experience: '12 years'
        },
        skills: ['Drum Kit', 'Percussion', 'Live Performance', 'Studio Recording'],
        latestExperience: 'Touring drummer with Grammy-nominated artist'
      },
      {
        _id: '4',
        user: {
          _id: 'user4',
          name: 'Emma Thompson',
          bio: 'Classical violinist transitioning to contemporary music.',
          location: 'Boston, MA',
          instruments: ['Violin', 'Viola'],
          genres: ['Classical', 'Folk', 'Indie'],
          experience: '15 years'
        },
        skills: ['Classical Violin', 'Electric Violin', 'Composition', 'Arrangement'],
        latestExperience: 'Principal violinist with Boston Symphony Orchestra'
      },
      {
        _id: '5',
        user: {
          _id: 'user5',
          name: 'David Rodriguez',
          bio: 'Electronic music producer and DJ.',
          location: 'Miami, FL',
          instruments: ['Synthesizer', 'DJ Equipment'],
          genres: ['Electronic', 'House', 'Techno'],
          experience: '6 years'
        },
        skills: ['Music Production', 'DJing', 'Sound Design', 'Mixing'],
        latestExperience: 'Headlined at Ultra Music Festival 2023'
      }
    ];
    
    res.json(sampleProfiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/profiles/user/:user_id
// @desc    Get profile by user ID
// @access  Public
router.get('/user/:user_id', async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.params.user_id }).populate('user', ['name', 'avatar', 'instruments', 'genres']);
    
    if (!profile) return res.status(400).json({ msg: 'Profile not found' });
    
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    if (err.kind == 'ObjectId') {
      return res.status(400).json({ msg: 'Profile not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/profiles/videos
// @desc    Add video to profile
// @access  Private
router.post('/videos', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    
    if (!profile) {
      return res.status(400).json({ msg: 'Profile not found' });
    }
    
    profile.videos.unshift(req.body);
    
    await profile.save();
    
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;