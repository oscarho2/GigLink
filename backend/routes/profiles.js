const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Profile = require('../models/Profile');
const User = require('../models/User');
const mockDB = require('../utils/mockDatabase');

// Mock data for profiles - Oscar Ho and test users
const mockProfiles = [
  {
    _id: '2',
    user: {
      _id: '2',
      name: 'Oscar Ho',
      avatar: '',
      location: 'London, UK'
    },
    bio: 'Professional musician and event organizer with years of experience in the music industry.',
    skills: ['Music Production', 'Event Management', 'Piano', 'Guitar'],
    experience: 'Senior',
    hourlyRate: 80,
    availability: 'Part-time',
    portfolio: [
      {
        title: 'Wedding Music Services',
        description: 'Provided live music for over 50 weddings',
        technologies: ['Piano', 'Guitar', 'Sound Engineering'],
        link: 'https://oscarho.co.uk'
      }
    ],
    videos: []
  },
  {
    _id: '7',
    user: {
      _id: '7',
      name: 'Test One',
      avatar: '',
      location: 'Brighton, UK'
    },
    bio: 'Acoustic guitarist specializing in folk and contemporary music.',
    skills: ['Guitar', 'Vocals', 'Songwriting'],
    experience: 'Intermediate',
    hourlyRate: 50,
    availability: 'Part-time',
    portfolio: [],
    videos: []
  },
  {
    _id: '8',
    user: {
      _id: '8',
      name: 'Test Two',
      avatar: '',
      location: 'Edinburgh, UK'
    },
    bio: 'Professional pianist with expertise in jazz and classical music.',
    skills: ['Piano', 'Music Theory', 'Composition'],
    experience: 'Senior',
    hourlyRate: 70,
    availability: 'Full-time',
    portfolio: [],
    videos: []
  },
  {
    _id: '9',
    user: {
      _id: '9',
      name: 'Test Three',
      avatar: '',
      location: 'Birmingham, UK'
    },
    bio: 'Experienced drummer with a passion for indie and rock music.',
    skills: ['Drums', 'Percussion', 'Music Production'],
    experience: 'Intermediate',
    hourlyRate: 60,
    availability: 'Part-time',
    portfolio: [],
    videos: []
  },
  {
    _id: '10',
    user: {
      _id: '10',
      name: 'Test Four',
      avatar: '',
      location: 'Liverpool, UK'
    },
    bio: 'Classically trained violinist with experience in weddings and events.',
    skills: ['Violin', 'Classical Music', 'Chamber Music'],
    experience: 'Senior',
    hourlyRate: 75,
    availability: 'Part-time',
    portfolio: [],
    videos: []
  },
  {
    _id: '11',
    user: {
      _id: '11',
      name: 'Test Five',
      avatar: '',
      location: 'Bristol, UK'
    },
    bio: 'Funk and soul bass player with a strong groove and professional experience.',
    skills: ['Bass Guitar', 'Funk', 'Soul', 'Jazz'],
    experience: 'Senior',
    hourlyRate: 65,
    availability: 'Full-time',
    portfolio: [],
    videos: []
  }
];

// @route   GET api/profiles/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    console.log('Looking for profile with user ID:', req.user.id);
    console.log('Available profiles:', mockProfiles.map(p => ({ id: p.user._id, name: p.user.name })));
    
    const profile = mockProfiles.find(p => p.user._id === req.user.id || p.user._id === String(req.user.id));
    
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

// @route   PUT api/profiles/me
// @desc    Update current user's profile
// @access  Private
router.put('/me', auth, async (req, res) => {
  console.log('PUT /api/profiles/me called');
  console.log('Request body:', req.body);
  console.log('User ID from token:', req.user.id);
  try {
    const userId = req.user.id;
    const { bio, skills, experience, hourlyRate, availability, location, instruments, genres } = req.body;
    
    // Find the profile in mock data first
    let profileIndex = mockProfiles.findIndex(profile => profile.user._id === userId);
    let updatedProfile;
    
    if (profileIndex !== -1) {
      // Update existing profile in mockProfiles
      updatedProfile = {
        ...mockProfiles[profileIndex],
        bio: bio || mockProfiles[profileIndex].bio,
        skills: skills || mockProfiles[profileIndex].skills,
        experience: experience || mockProfiles[profileIndex].experience,
        hourlyRate: hourlyRate || mockProfiles[profileIndex].hourlyRate,
        availability: availability || mockProfiles[profileIndex].availability
      };
      
      // Update user fields if provided
      if (location || instruments || genres) {
        updatedProfile.user = {
          ...updatedProfile.user,
          location: location || updatedProfile.user.location,
          instruments: instruments || updatedProfile.user.instruments,
          genres: genres || updatedProfile.user.genres
        };
      }
      
      mockProfiles[profileIndex] = updatedProfile;
    } else {
      // Check if profile exists in mockDB (newly registered users)
      const mockDBProfile = await mockDB.findProfileByUserId(userId);
      
      if (mockDBProfile) {
        // Update existing profile in mockDB
        updatedProfile = {
          ...mockDBProfile,
          bio: bio || mockDBProfile.bio,
          skills: skills || mockDBProfile.skills,
          experience: experience || mockDBProfile.experience,
          hourlyRate: hourlyRate || mockDBProfile.hourlyRate,
          availability: availability || mockDBProfile.availability
        };
        
        // Update user fields if provided
        if (location || instruments || genres) {
          updatedProfile.user = {
            ...updatedProfile.user,
            location: location || updatedProfile.user.location,
            instruments: instruments || updatedProfile.user.instruments,
            genres: genres || updatedProfile.user.genres
          };
        }
        
        // Update the profile in mockDB
        await mockDB.updateProfile(userId, updatedProfile);
      } else {
        return res.status(404).json({ message: 'Profile not found' });
      }
    }
    
    res.json(updatedProfile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/profiles
// @desc    Get all profiles
// @access  Public
router.get('/', async (req, res) => {
  try {
    let profiles = [];
    
    // Try to fetch real profiles from database
    try {
      const dbProfiles = await Profile.find().populate('user', ['name', 'avatar', 'location', 'instruments', 'genres']);
      
      // Transform database profiles to match frontend expectations
      const transformedProfiles = dbProfiles.map(profile => ({
        _id: profile._id,
        user: {
          _id: profile.user._id,
          name: profile.user.name,
          avatar: profile.user.avatar || '',
          location: profile.user.location || 'Location not specified',
          instruments: profile.user.instruments || [],
          genres: profile.user.genres || []
        },
        bio: profile.user.bio || 'No bio available',
        skills: profile.skills || profile.user.instruments || [],
        experience: profile.user.experience || 'Not specified',
        hourlyRate: 60, // Default rate
        availability: profile.user.isAvailableForGigs ? 'Available' : 'Not available',
        portfolio: [],
        videos: profile.videos || []
      }));
      
      profiles = transformedProfiles;
    } catch (mongoErr) {
      console.log('MongoDB not available, using mock data only');
    }
    
    // Include all mock profiles when MongoDB is not available
    if (profiles.length === 0) {
      profiles = [...mockProfiles];
    } else {
      // If we have database profiles, also include mock profiles that aren't duplicates
      const existingUserIds = profiles.map(p => p.user._id);
      const uniqueMockProfiles = mockProfiles.filter(mp => !existingUserIds.includes(mp.user._id));
      profiles.push(...uniqueMockProfiles);
    }
    
    // Also include profiles from mock database (newly registered users)
    const mockDBProfiles = mockDB.getAllProfiles();
    const allExistingUserIds = profiles.map(p => p.user._id);
    const uniqueMockDBProfiles = mockDBProfiles.filter(mp => !allExistingUserIds.includes(mp.user._id));
    profiles.push(...uniqueMockDBProfiles);
    
    res.json(profiles);
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
    let profile = null;
    
    // Try MongoDB first
    try {
      profile = await Profile.findOne({ user: req.params.user_id }).populate('user', ['name', 'avatar', 'instruments', 'genres']);
    } catch (mongoErr) {
      console.log('MongoDB not available, checking mock data');
    }
    
    // If not found in MongoDB, check mock data
    if (!profile) {
      profile = mockProfiles.find(p => p.user._id === req.params.user_id || p.user._id === String(req.params.user_id));
    }
    
    if (!profile) {
      return res.status(400).json({ msg: 'Profile not found' });
    }
    
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