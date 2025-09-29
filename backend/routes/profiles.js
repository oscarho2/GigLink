const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { upload, getPublicUrl, getStorageConfig } = require('../utils/r2Config');
const { normalizeLocation } = require('../utils/location');
const path = require('path');
const fs = require('fs');

// @route   GET api/profiles/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isAvailableForGigs', 'isMusician', 'locationData']);
    
    if (!profile) {
      return res.status(400).json({ msg: 'Profile not found for this user' });
    }
    
    // Transform profile to match frontend expectations
    const transformedProfile = {
      _id: profile._id,
      user: {
        _id: profile.user._id,
        name: profile.user.name,
        avatar: profile.user.avatar || '',
        location: profile.user.location || 'Location not specified',
        locationData: profile.user.locationData,
        instruments: profile.user.instruments || [],
        genres: profile.user.genres || [],
        isMusician: profile.user.isMusician
      },
      bio: profile.user.bio || 'No bio available',
      skills: profile.skills || profile.user.instruments || [],

      hourlyRate: 60, // Default rate
      availability: profile.user.isAvailableForGigs ? 'Available' : 'Not available',
      portfolio: [],
      videos: profile.videos || [],
      photos: profile.photos || []
    };
    
    res.json(transformedProfile);
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
    const {
      name,
      location,
      country,
      region,
      city,
      instruments,
      genres,
      isMusician,
      bio,
      availability,
      videos,
      ...profileFields
    } = req.body;

    // Find user and update location data
    let user = await User.findById(req.user.id);
    if (user) {
      if (!user.locationData) {
        user.locationData = { country: '', city: '' };
      }
      if (name !== undefined) {
        user.name = name;
      }
      if (location !== undefined) {
        user.location = normalizeLocation(location);
      }
      if (bio !== undefined) {
        user.bio = bio;
      }
      if (Array.isArray(instruments)) {
        user.instruments = instruments;
      }
      if (Array.isArray(genres)) {
        user.genres = genres;
      }
      if (isMusician !== undefined) {
        user.isMusician = isMusician;
      }
      if (availability !== undefined) {
        user.isAvailableForGigs = availability === 'Available';
      }
      if (country !== undefined) {
        user.locationData.country = country;
      }
      if (region !== undefined) {
        user.locationData.region = region;
      }
      if (city !== undefined) {
        user.locationData.city = city;
      }
      await user.save();
    }

    // Find profile
    let profile = await Profile.findOne({ user: req.user.id });
    
    // Update profile fields
    const updatedProfileFields = { ...profileFields };
    if (videos) {
      // Clean up videos - remove any with invalid IDs and ensure proper format
      const cleanedVideos = videos.map(video => {
        const cleanVideo = {
          title: video.title,
          url: video.url
        };
        if (video.description) cleanVideo.description = video.description;
        if (video.thumbnail) cleanVideo.thumbnail = video.thumbnail;
        return cleanVideo;
      });
      updatedProfileFields.videos = cleanedVideos;
    }
    
    // If profile exists, update it
    if (profile) {
      profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: updatedProfileFields },
        { new: true }
      ).populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isAvailableForGigs', 'isMusician']);
      
      // Transform profile to match frontend expectations
      const transformedProfile = {
        _id: profile._id,
        user: {
          _id: profile.user._id,
          name: profile.user.name,
          avatar: profile.user.avatar || '',
          location: profile.user.location || 'Location not specified',
          instruments: profile.user.instruments || [],
          genres: profile.user.genres || [],
        isMusician: profile.user.isMusician
        },
        bio: profile.user.bio || 'No bio available',
        skills: profile.skills || profile.user.instruments || [],
        hourlyRate: 60,
        availability: profile.user.isAvailableForGigs ? 'Available' : 'Not available',
        portfolio: [],
        videos: profile.videos || [],
        photos: profile.photos || []
      };
      
      return res.json(transformedProfile);
    }
    
    // Create new profile
    profile = new Profile({
      user: req.user.id,
      ...updatedProfileFields
    });
    
    await profile.save();
    
    // Populate the user data for the new profile
    profile = await Profile.findById(profile._id).populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isAvailableForGigs', 'isMusician']);
    
    // Transform profile to match frontend expectations
    const transformedProfile = {
      _id: profile._id,
      user: {
        _id: profile.user._id,
        name: profile.user.name,
        avatar: profile.user.avatar || '',
        location: profile.user.location || 'Location not specified',
        instruments: profile.user.instruments || [],
        genres: profile.user.genres || [],
        isMusician: profile.user.isMusician
      },
      bio: profile.user.bio || 'No bio available',
      skills: profile.skills || profile.user.instruments || [],
      hourlyRate: 60,
      availability: profile.user.isAvailableForGigs ? 'Available' : 'Not available',
      portfolio: [],
      videos: profile.videos || [],
      photos: profile.photos || []
    };
    
    res.json(transformedProfile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/profiles/me
// @desc    Update current user's profile
// @access  Private
router.put('/me', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, bio, location, instruments, genres, isMusician, availability, skills, videos, country, region, city } = req.body;

    console.log('🔄 Profile update request received');
    console.log('📝 Request body:', { name, bio, location, instruments, genres, isMusician, availability });
    console.log('👤 User ID:', userId);

    // 1. Update User document
    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('📊 Current user data before update:', {
      isMusician: userToUpdate.isMusician,
      instruments: userToUpdate.instruments,
      genres: userToUpdate.genres
    });

    if (isMusician !== undefined) {
      console.log(`🎵 Updating isMusician from '${userToUpdate.isMusician}' to '${isMusician}'`);
      userToUpdate.isMusician = isMusician;
    }
    if (name !== undefined) userToUpdate.name = name;
    if (bio !== undefined) userToUpdate.bio = bio;
    if (location !== undefined) userToUpdate.location = normalizeLocation(location);
    if (instruments !== undefined) userToUpdate.instruments = instruments;
    if (genres !== undefined) userToUpdate.genres = genres;
    if (availability !== undefined) userToUpdate.isAvailableForGigs = availability === 'Available';

    if (country !== undefined || region !== undefined || city !== undefined) {
      if (!userToUpdate.locationData) {
        userToUpdate.locationData = {};
      }
      if (country !== undefined) userToUpdate.locationData.country = country;
      if (region !== undefined) userToUpdate.locationData.region = region;
      if (city !== undefined) userToUpdate.locationData.city = city;
    }
    
    console.log('💾 About to save user with data:', {
      isMusician: userToUpdate.isMusician,
      instruments: userToUpdate.instruments,
      genres: userToUpdate.genres
    });
    
    await userToUpdate.save();
    
    console.log('💾 User saved successfully');
    console.log('📊 User data after save:', {
      isMusician: userToUpdate.isMusician,
      instruments: userToUpdate.instruments,
      genres: userToUpdate.genres
    });
    
    // Verify the save by re-fetching from database
    const savedUser = await User.findById(userId).select('isMusician instruments genres');
    console.log('🔍 Re-fetched user from database:', {
      isMusician: savedUser.isMusician,
      instruments: savedUser.instruments,
      genres: savedUser.genres
    });

    // 2. Update Profile document
    const profileUpdateFields = {};
    if (skills) profileUpdateFields.skills = skills;
    if (videos) {
      profileUpdateFields.videos = videos.map(video => ({
        title: video.title,
        url: video.url,
        description: video.description,
        thumbnail: video.thumbnail
      }));
    }

    await Profile.findOneAndUpdate(
      { user: userId },
      { $set: profileUpdateFields },
      { new: true, upsert: true }
    );

    // 3. Fetch and return updated profile
    const profile = await Profile.findOne({ user: userId }).populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isAvailableForGigs', 'isMusician']);

    console.log('📋 Profile fetched for response:', {
      isMusician: profile.user.isMusician,
      instruments: profile.user.instruments,
      genres: profile.user.genres
    });

    const transformedProfile = {
      _id: profile._id,
      user: {
        _id: profile.user._id,
        name: profile.user.name,
        avatar: profile.user.avatar || '',
        location: profile.user.location || 'Location not specified',
        instruments: profile.user.instruments || [],
        genres: profile.user.genres || [],
        isMusician: profile.user.isMusician // REMOVED || 'no' fallback that was overriding the value
      },
      bio: profile.user.bio || 'No bio available',
      skills: profile.skills || profile.user.instruments || [],
      hourlyRate: req.body.hourlyRate || 60,
      availability: profile.user.isAvailableForGigs ? 'Available' : 'Not available',
      portfolio: [],
      videos: profile.videos || [],
      photos: profile.photos || []
    };

    console.log('📤 Sending response with isMusician:', transformedProfile.user.isMusician);
    res.json(transformedProfile);

  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET api/profiles
// @desc    Get all profiles
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { country, city } = req.query;
    const userQuery = {};

    if (country) {
      userQuery['locationData.country'] = new RegExp(country, 'i');
    }
    if (city) {
      userQuery['locationData.city'] = new RegExp(city, 'i');
    }

    const dbProfiles = await Profile.find().populate({
      path: 'user',
      select: ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isAvailableForGigs', 'isMusician', 'locationData'],
      match: userQuery
    });

    // Filter out profiles where the user didn't match the location criteria
    const filteredProfiles = dbProfiles.filter(profile => profile.user !== null);
    
    // Return all users (musicians and others)
    
    // Transform database profiles to match frontend expectations
    const transformedProfiles = filteredProfiles.map(profile => ({
      _id: profile._id,
      user: {
        _id: profile.user._id,
        name: profile.user.name,
        avatar: profile.user.avatar || '',
        location: profile.user.location || 'Location not specified',
        instruments: profile.user.instruments || [],
        genres: profile.user.genres || [],
        isMusician: profile.user.isMusician,
        isMusician: profile.user.isMusician,
        locationData: profile.user.locationData || { country: '', city: '' }
      },
      bio: profile.user.bio || 'No bio available',
      skills: profile.skills || profile.user.instruments || [],
      userType: profile.user.isMusician === 'yes' ? 'Musician' : 'Other',
      hourlyRate: 60, // Default rate
      availability: profile.user.isAvailableForGigs ? 'Available' : 'Not available',
      portfolio: [],
      videos: profile.videos || []
    }));
    
    res.json(transformedProfiles);
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
    const profile = await Profile.findOne({ user: req.params.user_id }).populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isAvailableForGigs', 'isMusician', 'locationData']);
    
    if (!profile) {
      return res.status(400).json({ msg: 'Profile not found' });
    }
    
    // Transform profile to match frontend expectations
    const transformedProfile = {
      _id: profile._id,
      user: {
        _id: profile.user._id,
        name: profile.user.name,
        avatar: profile.user.avatar || '',
        location: profile.user.location || 'Location not specified',
        locationData: profile.user.locationData,
        instruments: profile.user.instruments || [],
        genres: profile.user.genres || [],
        isMusician: profile.user.isMusician
      },
      bio: profile.user.bio || 'No bio available',
      skills: profile.skills || profile.user.instruments || [],

      hourlyRate: 60, // Default rate
      availability: profile.user.isAvailableForGigs ? 'Available' : 'Not available',
      portfolio: [],
      videos: profile.videos || [],
      photos: profile.photos || []
    };
    
    res.json(transformedProfile);
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

// @route   DELETE api/profiles/me
// @desc    Delete current user's account and all related data
// @access  Private
router.delete('/me', auth, async (req, res) => {
  try {
    console.log('DELETE /me route hit - deleting entire account');
    console.log('req.user:', req.user);
    console.log('req.user.id:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      return res.status(400).json({ msg: 'User ID not found in token' });
    }
    
    const userId = req.user.id;
    
    // Import required models
    const Gig = require('../models/Gig');
    const Message = require('../models/Message');
    
    // Delete all user-related data
    // 1. Delete user's profile
    const profile = await Profile.findOneAndDelete({ user: userId });
    console.log('Profile deleted:', profile ? 'Yes' : 'No profile found');
    
    // 2. Delete user's gigs
    const gigsResult = await Gig.deleteMany({ user: userId });
    console.log('Gigs deleted:', gigsResult.deletedCount);
    
    // 3. Delete messages where user is sender or recipient
    const messagesResult = await Message.deleteMany({
      $or: [{ sender: userId }, { recipient: userId }]
    });
    console.log('Messages deleted:', messagesResult.deletedCount);
    
    // 4. Remove user from gig applicants
    const gigApplicantsResult = await Gig.updateMany(
      { 'applicants.user': userId },
      { $pull: { applicants: { user: userId } } }
    );
    console.log('Removed from gig applications:', gigApplicantsResult.modifiedCount);
    
    // 5. Finally, delete the user account
    const user = await User.findByIdAndDelete(userId);
    console.log('User account deleted:', user ? 'Yes' : 'No user found');
    
    if (!user) {
      return res.status(400).json({ msg: 'User account not found' });
    }
    
    res.json({
      msg: 'Account and all related data deleted successfully',
      deletedData: {
        profile: !!profile,
        gigs: gigsResult.deletedCount,
        messages: messagesResult.deletedCount,
        gigApplications: gigApplicantsResult.modifiedCount,
        user: !!user
      }
    });
  } catch (err) {
    console.error('Delete account error:', err.message);
    console.error('Full error:', err);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/profiles/photos
// @desc    Upload a photo to profile
// @access  Private
router.post('/photos', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo file provided' });
    }

    const { isR2Configured } = getStorageConfig();
    let fileKey, photoUrl;

    if (isR2Configured) {
      // R2 upload
      fileKey = req.file.key;
      photoUrl = getPublicUrl(fileKey);
    } else {
      // Local upload
      const relativePath = path.relative(path.join(__dirname, '..', 'uploads'), req.file.path);
      fileKey = relativePath.replace(/\\/g, '/'); // Normalize path separators
      photoUrl = getPublicUrl(fileKey);
    }

    const caption = req.body.caption || '';

    let profile = await Profile.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const newPhoto = {
      url: photoUrl,
      caption: caption,
      date: new Date()
    };

    profile.photos.push(newPhoto);
    await profile.save();

    res.json({ message: 'Photo uploaded successfully', photo: newPhoto });
  } catch (err) {
    console.error('Photo upload error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/profiles/avatar
// @desc    Update profile picture
// @access  Private
// Renamed legacy handler to avoid duplicate route registration
router.put('/avatar-legacy', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No avatar file provided' });
    }

    const { isR2Configured } = getStorageConfig();
    let fileKey, avatarUrl;

    if (isR2Configured) {
      // R2 upload
      fileKey = req.file.key;
      avatarUrl = getPublicUrl(fileKey);
    } else {
      // Local upload
      const relativePath = path.relative(path.join(__dirname, '..', 'uploads'), req.file.path);
      fileKey = relativePath.replace(/\\/g, '/'); // Normalize path separators
      avatarUrl = getPublicUrl(fileKey);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile picture updated successfully', avatar: avatarUrl });
  } catch (err) {
    console.error('Avatar update error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/profiles/photos/:photoId
// @desc    Delete a photo from profile
// @access  Private
router.delete('/photos/:photoId', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    // Find and remove the photo
    const photoIndex = profile.photos.findIndex(photo => photo._id.toString() === req.params.photoId);
    
    if (photoIndex === -1) {
      return res.status(404).json({ message: 'Photo not found' });
    }
    
    // Get the photo to delete the file
    const photoToDelete = profile.photos[photoIndex];
    
    // Remove photo from array
    profile.photos.splice(photoIndex, 1);
    await profile.save();
    
    // Delete the actual file
    const filePath = path.join(__dirname, '..', photoToDelete.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({ message: 'Photo deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT api/profiles/avatar
// @desc    Update profile picture
// @access  Private
router.put('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Update user's profile picture
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get the public URL for the uploaded avatar
    const { isR2Configured } = getStorageConfig();
    let fileKey, avatarUrl;

    if (isR2Configured) {
      // R2 upload
      fileKey = req.file.key;
      avatarUrl = getPublicUrl(fileKey);
    } else {
      // Local upload
      const relativePath = path.relative(path.join(__dirname, '..', 'uploads'), req.file.path);
      fileKey = relativePath.replace(/\\/g, '/'); // Normalize path separators
      avatarUrl = getPublicUrl(fileKey);
    }
    
    // Update user's avatar
    user.avatar = avatarUrl;
    await user.save();
    
    res.json({
      message: 'Profile picture updated successfully',
      avatar: user.avatar
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/profiles/countries
// @desc    Predictive country suggestions from existing user profiles
// @access  Public
router.get('/countries', async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;
    const numericLimit = Math.min(parseInt(limit) || 10, 50);

    const rx = q && q.trim()
      ? new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : null;

    const pipeline = [
      { $match: { 'locationData.country': { $exists: true, $ne: '' } } },
      ...(rx ? [{ $match: { 'locationData.country': { $regex: rx } } }] : []),
      {
        $group: {
          _id: { $toLower: '$locationData.country' },
          count: { $sum: 1 },
          label: { $first: '$locationData.country' }
        }
      },
      { $sort: { count: -1, label: 1 } },
      { $limit: numericLimit },
      { $project: { _id: 0, label: 1, count: 1 } }
    ];

    const agg = await User.aggregate(pipeline);
    const results = agg.map(item => ({ label: item.label, count: item.count }));

    res.json({ countryStats: results });
  } catch (err) {
    console.error('Error fetching country suggestions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/profiles/cities
// @desc    Predictive city suggestions from existing user profiles, optionally filtered by country
// @access  Public
router.get('/cities', async (req, res) => {
  try {
    const { q = '', country = '', limit = 10 } = req.query;
    const numericLimit = Math.min(parseInt(limit) || 10, 50);

    const rx = q && q.trim()
      ? new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : null;

    const matchConditions = { 'locationData.city': { $exists: true, $ne: '' } };
    if (country) {
      matchConditions['locationData.country'] = new RegExp(country, 'i');
    }
    if (rx) {
      matchConditions['locationData.city'] = rx;
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: { $toLower: '$locationData.city' },
          count: { $sum: 1 },
          label: { $first: '$locationData.city' }
        }
      },
      { $sort: { count: -1, label: 1 } },
      { $limit: numericLimit },
      { $project: { _id: 0, label: 1, count: 1 } }
    ];

    const agg = await User.aggregate(pipeline);
    const results = agg.map(item => ({ label: item.label, count: item.count }));

    res.json({ cityStats: results });
  } catch (err) {
    console.error('Error fetching city suggestions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/profiles/locations
// @desc    Predictive location suggestions from existing user profiles
// @access  Public
router.get('/locations', async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;
    const numericLimit = Math.min(parseInt(limit) || 10, 50);

    const rx = q && q.trim()
      ? new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : null;

    // Aggregate distinct locations from user.location
    const pipeline = [
      { $match: { location: { $exists: true, $ne: '' } } },
      ...(rx ? [{ $match: { location: { $regex: rx } } }] : []),
      {
        $group: {
          _id: { $toLower: '$location' },
          count: { $sum: 1 },
          label: { $first: '$location' }
        }
      },
      { $sort: { count: -1, label: 1 } },
      { $limit: numericLimit },
      { $project: { _id: 0, label: 1, count: 1 } }
    ];

    const agg = await User.aggregate(pipeline);
    // Normalize labels for display consistency
    const normCount = new Map();
    for (const row of agg) {
      const norm = normalizeLocation(row.label || '');
      if (!norm) continue;
      const key = norm.toLowerCase();
      const prev = normCount.get(key) || { label: norm, count: 0 };
      prev.count += row.count || 0;
      normCount.set(key, prev);
    }
    const results = Array.from(normCount.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    res.json({ locationStats: results });
  } catch (err) {
    console.error('Error fetching location suggestions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
