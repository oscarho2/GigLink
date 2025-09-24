const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { upload, getPublicUrl } = require('../utils/r2Config');

// R2 upload configuration is handled in r2Config.js

// @route   GET api/profiles/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isAvailableForGigs']);
    
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
        instruments: profile.user.instruments || [],
        genres: profile.user.genres || []
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
  try {
    const userId = req.user.id;
    const { bio, skills, hourlyRate, availability, location, instruments, genres } = req.body;
    
    // Update user fields if provided
    const userUpdateFields = {};
    if (req.body.name) userUpdateFields.name = req.body.name;
    if (bio) userUpdateFields.bio = bio;
    if (location) userUpdateFields.location = location;
    if (instruments) userUpdateFields.instruments = instruments;
    if (genres) userUpdateFields.genres = genres;
    if (availability !== undefined) userUpdateFields.isAvailableForGigs = availability === 'Available';
    
    // Update user document if there are user fields to update
    if (Object.keys(userUpdateFields).length > 0) {
      await User.findByIdAndUpdate(userId, userUpdateFields, { new: true });
    }
    
    // Update profile fields
    const profileUpdateFields = {};
    if (skills) profileUpdateFields.skills = skills;
    
    // Find and update profile
    let profile = await Profile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    if (Object.keys(profileUpdateFields).length > 0) {
      profile = await Profile.findOneAndUpdate(
        { user: userId },
        profileUpdateFields,
        { new: true }
      ).populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isAvailableForGigs']);
    } else {
      profile = await Profile.findOne({ user: userId }).populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isAvailableForGigs']);
    }
    
    // Transform profile to match frontend expectations
    const transformedProfile = {
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

      hourlyRate: hourlyRate || 60,
      availability: profile.user.isAvailableForGigs ? 'Available' : 'Not available',
      portfolio: [],
      videos: profile.videos || []
    };
    
    res.json(transformedProfile);
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
    const dbProfiles = await Profile.find().populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isAvailableForGigs', 'isMusician']);
    
    // Return all users (musicians and others)
    
    // Transform database profiles to match frontend expectations
    const transformedProfiles = dbProfiles.map(profile => ({
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
    const profile = await Profile.findOne({ user: req.params.user_id }).populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isAvailableForGigs']);
    
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
        instruments: profile.user.instruments || [],
        genres: profile.user.genres || []
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

    const photoUrl = getPublicUrl(req.file.key);
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

    const avatarUrl = getPublicUrl(req.file.key);

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
    const avatarUrl = getPublicUrl(req.file.key);
    
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

module.exports = router;