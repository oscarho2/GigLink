const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Profile = require('../models/Profile');
const User = require('../models/User');
const Link = require('../models/Link');
const {
  upload,
  getPublicUrl,
  getStorageConfig,
  uploadBufferToR2,
  deleteFile
} = require('../utils/r2Config');
const { normalizeLocation } = require('../utils/location');
const { parseLocation } = require('../utils/locationParser');
const path = require('path');
const fs = require('fs');

const formatPhoto = (photo) => {
  if (!photo) {
    return photo;
  }

  const plain = typeof photo.toObject === 'function' ? photo.toObject() : photo;
  const currentUrl = plain.url || '';

  if (currentUrl.startsWith('/api/media/r2/')) {
    return plain;
  }

  const isAbsoluteUrl = /^https?:\/\//i.test(currentUrl);
  if (!isAbsoluteUrl) {
    return {
      ...plain,
      url: getPublicUrl(currentUrl)
    };
  }

  return {
    ...plain,
    url: currentUrl
  };
};

// SIMPLIFIED MUSICIAN STATUS ROUTES - REBUILD FROM GROUND UP

// @route   PUT api/profiles/musician-status
// @desc    Update only the isMusician field - SIMPLE & CLEAN
// @access  Private
router.put('/musician-status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { isMusician } = req.body;

    console.log('🎵 MUSICIAN STATUS UPDATE REQUEST');
    console.log('User ID:', userId);
    console.log('New isMusician value:', isMusician);
    console.log('Type:', typeof isMusician);

    // Validate the value
    if (!['yes', 'no'].includes(isMusician)) {
      return res.status(400).json({ 
        message: 'Invalid value. Must be "yes" or "no"',
        received: isMusician 
      });
    }

    // Find and update user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Before update:', user.isMusician);
    
    // Update only the isMusician field
    user.isMusician = isMusician;
    await user.save();

    console.log('After save:', user.isMusician);

    // Verify the save worked by re-fetching
    const updatedUser = await User.findById(userId).select('isMusician');
    console.log('Verified from DB:', updatedUser.isMusician);

    // Return simple response
    res.json({
      success: true,
      isMusician: updatedUser.isMusician,
      message: `Musician status updated to: ${updatedUser.isMusician}`
    });

  } catch (error) {
    console.error('❌ Error updating musician status:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   GET api/profiles/musician-status
// @desc    Get current musician status - SIMPLE & CLEAN
// @access  Private
router.get('/musician-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('isMusician name email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      isMusician: user.isMusician,
      name: user.name,
      email: user.email
    });

  } catch (error) {
    console.error('❌ Error getting musician status:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// EXISTING COMPLEX ROUTES BELOW (keeping for compatibility)

// @route   GET api/profiles/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isMusician', 'locationData']);
    
    if (!profile) {
      return res.status(400).json({ msg: 'Profile not found for this user' });
    }
    
    // Transform profile to match frontend expectations
    const transformedProfile = {
      _id: profile._id,
      user: {
        _id: profile.user._id,
        name: profile.user.name,
        avatar: getPublicUrl(profile.user.avatar),
        location: profile.user.location || 'Location not specified',
        locationData: profile.user.locationData,
        instruments: profile.user.instruments || [],
        genres: profile.user.genres || [],
        isMusician: profile.user.isMusician
      },
      bio: profile.user.bio || 'No bio available',
      skills: profile.skills || profile.user.instruments || [],
      portfolio: [],
      videos: profile.videos || [],
      photos: (profile.photos || []).map(formatPhoto)
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
      let normalizedLocation = null;
      if (location !== undefined) {
        normalizedLocation = normalizeLocation(location);
        user.location = normalizedLocation;
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
      let derivedCity;
      let derivedRegion;
      let derivedCountry;

      const cityProvided = city !== undefined;
      const regionProvided = region !== undefined;
      const countryProvided = country !== undefined;

      if (!cityProvided && !regionProvided && !countryProvided) {
        const source = normalizedLocation || user.location || '';
        if (source) {
          const parsed = parseLocation(source);
          derivedCity = parsed.city || '';
          derivedRegion = parsed.region || '';
          derivedCountry = parsed.country || '';
        }
      }

      const resolvedCountry = countryProvided ? (country || '') : (derivedCountry ?? undefined);
      const resolvedRegion = regionProvided ? (region || '') : (derivedRegion ?? undefined);
      const resolvedCity = cityProvided ? (city || '') : (derivedCity ?? undefined);

      if (resolvedCountry !== undefined) {
        user.locationData.country = resolvedCountry;
      }
      if (resolvedRegion !== undefined) {
        user.locationData.region = resolvedRegion;
      }
      if (resolvedCity !== undefined) {
        user.locationData.city = resolvedCity;
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
      ).populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isMusician']);
      
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
        portfolio: [],
        videos: profile.videos || [],
        photos: (profile.photos || []).map(formatPhoto)
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
    profile = await Profile.findById(profile._id).populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isMusician']);
    
    // Transform profile to match frontend expectations
    const transformedProfile = {
      _id: profile._id,
      user: {
        _id: profile.user._id,
        name: profile.user.name,
        avatar: getPublicUrl(profile.user.avatar),
        location: profile.user.location || 'Location not specified',
        instruments: profile.user.instruments || [],
        genres: profile.user.genres || [],
        isMusician: profile.user.isMusician
      },
      bio: profile.user.bio || 'No bio available',
      skills: profile.skills || profile.user.instruments || [],
      portfolio: [],
      videos: profile.videos || [],
      photos: (profile.photos || []).map(formatPhoto)
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
    const { name, bio, location, instruments, genres, isMusician, skills, videos, country, region, city } = req.body;

    console.log('🔄 BACKEND: Profile update request received');
    console.log('📝 BACKEND: isMusician received:', isMusician);
    console.log('📝 BACKEND: Type of isMusician:', typeof isMusician);

    // 1. Update User document
    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('📊 BACKEND: Current user isMusician before update:', userToUpdate.isMusician);

    if (name !== undefined) userToUpdate.name = name;
    if (bio !== undefined) userToUpdate.bio = bio;
    if (location !== undefined) userToUpdate.location = normalizeLocation(location);
    if (instruments !== undefined) userToUpdate.instruments = instruments;
    if (genres !== undefined) userToUpdate.genres = genres;
    if (isMusician !== undefined) {
      console.log(`🎵 BACKEND: Updating isMusician from '${userToUpdate.isMusician}' to '${isMusician}'`);
      userToUpdate.isMusician = isMusician;
    }
    if (country !== undefined || region !== undefined || city !== undefined) {
      if (!userToUpdate.locationData) {
        userToUpdate.locationData = {};
      }
      if (country !== undefined) userToUpdate.locationData.country = country;
      if (region !== undefined) userToUpdate.locationData.region = region;
      if (city !== undefined) userToUpdate.locationData.city = city;
    }
    
    console.log('💾 BACKEND: About to save user with isMusician:', userToUpdate.isMusician);
    await userToUpdate.save();
    console.log('💾 BACKEND: User saved successfully');
    
    // Verify the save
    const savedUser = await User.findById(userId).select('isMusician');
    console.log('🔍 BACKEND: Re-fetched user isMusician from DB:', savedUser.isMusician);

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
    const profile = await Profile.findOne({ user: userId }).populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isMusician', 'locationData']);

    const transformedProfile = {
      _id: profile._id,
      user: {
        _id: profile.user._id,
        name: profile.user.name,
        avatar: getPublicUrl(profile.user.avatar),
        location: profile.user.location || 'Location not specified',
        locationData: profile.user.locationData,
        instruments: profile.user.instruments || [],
      genres: profile.user.genres || [],
      isMusician: profile.user.isMusician
      },
      bio: profile.user.bio || 'No bio available',
      skills: profile.skills || profile.user.instruments || [],
      portfolio: [],
      videos: profile.videos || [],
      photos: (profile.photos || []).map(formatPhoto)
    };

    console.log('📤 BACKEND: About to send response');
    console.log('📤 BACKEND: transformedProfile.user.isMusician:', transformedProfile.user.isMusician);
    console.log('📤 BACKEND: profile.user.isMusician (raw):', profile.user.isMusician);

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
    const { country, region, city, q, instruments, genres, userType } = req.query;
    const userQuery = {};

    if (country) {
      userQuery['locationData.country'] = new RegExp(country, 'i');
    }
    if (region) {
      userQuery['locationData.region'] = new RegExp(region, 'i');
    }
    if (city) {
      userQuery['locationData.city'] = new RegExp(city, 'i');
    }
    if (instruments) {
      userQuery.instruments = instruments;
    }
    if (genres) {
      userQuery.genres = genres;
    }
    if (userType) {
      if (userType === 'Musician') {
        userQuery.isMusician = 'yes';
      } else if (userType === 'Other') {
        userQuery.isMusician = 'no';
      }
    }

    if (q) {
      const searchRegex = new RegExp(q, 'i');
      userQuery.$or = [
        { name: searchRegex },
        { location: searchRegex },
        { instruments: searchRegex },
        { genres: searchRegex },
        { bio: searchRegex },
        { 'locationData.city': searchRegex },
        { 'locationData.region': searchRegex },
        { 'locationData.country': searchRegex },
      ];
    }

    const dbProfiles = await Profile.find().populate({
      path: 'user',
      select: ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isMusician', 'locationData'],
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
        avatar: getPublicUrl(profile.user.avatar),
        location: profile.user.location || 'Location not specified',
        instruments: profile.user.instruments || [],
        genres: profile.user.genres || [],
        isMusician: profile.user.isMusician,
      locationData: profile.user.locationData || { country: '', city: '' }
    },
    bio: profile.user.bio || 'No bio available',
    skills: profile.skills || profile.user.instruments || [],
    userType: profile.user.isMusician === 'yes' ? 'Musician' : 'Other',
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
    const profile = await Profile.findOne({ user: req.params.user_id }).populate('user', ['name', 'avatar', 'location', 'instruments', 'genres', 'bio', 'isMusician', 'locationData']);
    
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
      portfolio: [],
      videos: profile.videos || [],
      photos: (profile.photos || []).map(formatPhoto)
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
    const Post = require('../models/Post');
    const Link = require('../models/Link');
    
    // Delete all user-related data
    // 1. Delete user's profile
    const profile = await Profile.findOneAndDelete({ user: userId });
    console.log('Profile deleted:', profile ? 'Yes' : 'No profile found');
    
    // 2. Delete user's gigs
    const gigsResult = await Gig.deleteMany({ user: userId });
    console.log('Gigs deleted:', gigsResult.deletedCount);

    // 3. Delete user's community posts
    const postsResult = await Post.deleteMany({ author: userId });
    console.log('Posts deleted:', postsResult.deletedCount);
    
    // 4. Delete messages where user is sender or recipient
    const messagesResult = await Message.deleteMany({
      $or: [{ sender: userId }, { recipient: userId }]
    });
    console.log('Messages deleted:', messagesResult.deletedCount);

    // 5. Delete any link connections involving this user
    const linksResult = await Link.deleteMany({
      $or: [{ requester: userId }, { recipient: userId }]
    });
    console.log('Links deleted:', linksResult.deletedCount);

    // 6. Remove user from gig applicants
    const gigApplicantsResult = await Gig.updateMany(
      { 'applicants.user': userId },
      { $pull: { applicants: { user: userId } } }
    );
    console.log('Removed from gig applications:', gigApplicantsResult.modifiedCount);

    // 7. Finally, delete the user account
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
        posts: postsResult.deletedCount,
        messages: messagesResult.deletedCount,
        links: linksResult.deletedCount,
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
    let fileKey;

    if (isR2Configured) {
      const result = await uploadBufferToR2(req.file);
      fileKey = result.key;
    } else {
      const relativePath = req.file.path ? path.relative(path.join(__dirname, '..', 'uploads'), req.file.path) : req.file.filename;
      fileKey = relativePath.replace(/\\/g, '/');
    }

    const caption = req.body.caption || '';

    let profile = await Profile.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const newPhoto = {
      url: fileKey,
      caption: caption,
      date: new Date()
    };

    profile.photos.push(newPhoto);
    await profile.save();

    res.json({ message: 'Photo uploaded successfully', photo: formatPhoto(newPhoto) });
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
    
    const { isR2Configured } = getStorageConfig();
    if (isR2Configured) {
      let key = photoToDelete.url || '';
      const match = key.match(/api\/media\/r2\/(.+)$/);
      if (match && match[1]) {
        key = decodeURIComponent(match[1]);
      }
      try {
        await deleteFile(key);
      } catch (deleteErr) {
        console.error('Error deleting photo from R2:', deleteErr.message);
        // Continue with the operation even if file deletion fails
      }
    } else {
      const filePath = path.join(__dirname, '..', photoToDelete.url || '');
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (deleteErr) {
        console.error('Error deleting local photo file:', deleteErr.message);
        // Continue with the operation even if file deletion fails
      }
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
    let avatarKey;

    if (isR2Configured) {
      const result = await uploadBufferToR2(req.file);
      avatarKey = result.key;
    } else {
      const relativePath = req.file.path ? path.relative(path.join(__dirname, '..', 'uploads'), req.file.path) : req.file.filename;
      avatarKey = relativePath.replace(/\\/g, '/');
    }

    user.avatar = avatarKey;
    await user.save();

    await Profile.updateOne(
      { user: req.user.id },
      { $set: { avatar: avatarKey } }
    );

    res.json({
      message: 'Profile picture updated successfully',
      avatar: getPublicUrl(user.avatar)
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
    const {
      q = '',
      limit = 10,
      scope = '',
      country: countryFilter = '',
      region: regionFilter = ''
    } = req.query;
    const numericLimit = Math.min(parseInt(limit, 10) || 10, 50);

    const rx = q && q.trim()
      ? new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : null;

    const regexStages = rx
      ? [{
          $match: {
            $or: [
              { 'locationData.city': { $regex: rx } },
              { 'locationData.region': { $regex: rx } },
              { 'locationData.country': { $regex: rx } },
              { location: { $regex: rx } }
            ]
          }
        }]
      : [];

    const cityPipeline = [
      { $match: { 'locationData.city': { $exists: true, $ne: '' } } },
      ...regexStages,
      {
        $group: {
          _id: {
            city: { $toLower: '$locationData.city' },
            region: { $toLower: { $ifNull: ['$locationData.region', ''] } },
            country: { $toLower: { $ifNull: ['$locationData.country', ''] } }
          },
          city: { $first: '$locationData.city' },
          region: { $first: '$locationData.region' },
          country: { $first: '$locationData.country' },
          count: { $sum: 1 }
        }
      },
      { $limit: 500 }
    ];

    const regionPipeline = [
      { $match: { 'locationData.region': { $exists: true, $ne: '' } } },
      ...regexStages,
      {
        $group: {
          _id: {
            region: { $toLower: '$locationData.region' },
            country: { $toLower: { $ifNull: ['$locationData.country', ''] } }
          },
          region: { $first: '$locationData.region' },
          country: { $first: '$locationData.country' },
          count: { $sum: 1 }
        }
      },
      { $limit: 500 }
    ];

    const countryPipeline = [
      { $match: { 'locationData.country': { $exists: true, $ne: '' } } },
      ...regexStages,
      {
        $group: {
          _id: { country: { $toLower: '$locationData.country' } },
          country: { $first: '$locationData.country' },
          count: { $sum: 1 }
        }
      },
      { $limit: 500 }
    ];

    const legacyPipeline = [
      {
        $match: {
          location: { $exists: true, $ne: '' },
          ...(rx ? { location: { $regex: rx } } : {})
        }
      },
      {
        $group: {
          _id: { $toLower: '$location' },
          label: { $first: '$location' },
          count: { $sum: 1 }
        }
      },
      { $limit: 500 }
    ];

    const [cityAgg, regionAgg, countryAgg, legacyAgg] = await Promise.all([
      User.aggregate(cityPipeline),
      User.aggregate(regionPipeline),
      User.aggregate(countryPipeline),
      User.aggregate(legacyPipeline)
    ]);

    const suggestionMaps = {
      city: new Map(),
      region: new Map(),
      country: new Map()
    };

    // Determine which scopes to include before building suggestions
    const normalizedScope = String(scope || '').toLowerCase();
    const includeCities = !normalizedScope || normalizedScope === 'city';
    const includeRegions = !normalizedScope || normalizedScope === 'region';
    const includeCountries = !normalizedScope || normalizedScope === 'country';

    const sameValue = (a, b) => {
      if (!a || !b) return false;
      return a.trim().toLowerCase() === b.trim().toLowerCase();
    };

    const addSuggestion = (type, hierarchy, count) => {
      const cityVal = (hierarchy.city || '').trim();
      const regionVal = (hierarchy.region || '').trim();
      const countryVal = (hierarchy.country || '').trim();

      const fullLabel = normalizeLocation(
        type === 'city'
          ? [cityVal, regionVal, countryVal].filter(Boolean).join(', ')
          : type === 'region'
            ? [regionVal, countryVal].filter(Boolean).join(', ')
            : countryVal
      );

      if (!fullLabel) return;

      let displayLabel = fullLabel;
      if (type === 'city' && cityVal) {
        displayLabel = cityVal;
      } else if (type === 'region' && regionVal) {
        displayLabel = regionVal;
      } else if (type === 'country' && countryVal) {
        displayLabel = countryVal;
      }

      const map = suggestionMaps[type];
      const key = `${type}:${fullLabel.toLowerCase()}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += count;
      } else {
        map.set(key, {
          type,
          label: displayLabel,
          value: fullLabel,
          hierarchy: { city: cityVal, region: regionVal, country: countryVal },
          count
        });
      }
    };

    if (includeCities) {
      for (const row of cityAgg) {
        const cityVal = (row.city || '').trim();
        const regionVal = (row.region || '').trim();
        const countryVal = (row.country || '').trim();
        const count = row.count || 0;

        if (cityVal) {
          addSuggestion('city', { city: cityVal, region: regionVal, country: countryVal }, count);
        }
      }
    }

    if (includeRegions) {
      for (const row of regionAgg) {
        const regionVal = (row.region || '').trim();
        const countryVal = (row.country || '').trim();
        const count = row.count || 0;

        if (regionVal) {
          addSuggestion('region', { city: '', region: regionVal, country: countryVal }, count);
        }
      }
    }

    if (includeCountries) {
      for (const row of countryAgg) {
        const countryVal = (row.country || '').trim();
        const count = row.count || 0;

        if (countryVal) {
          addSuggestion('country', { city: '', region: '', country: countryVal }, count);
        }
      }
    }

    for (const row of legacyAgg) {
      const parsed = parseLocation(row.label || '') || {};
      const cityVal = (parsed.city || '').trim();
      const regionVal = (parsed.region || '').trim();
      const countryVal = (parsed.country || '').trim();
      const count = row.count || 0;

      if (includeCities && cityVal && !sameValue(cityVal, regionVal) && !sameValue(cityVal, countryVal)) {
        addSuggestion('city', { city: cityVal, region: regionVal, country: countryVal }, count);
      }
      if (includeRegions && regionVal && !sameValue(regionVal, countryVal)) {
        addSuggestion('region', { city: '', region: regionVal, country: countryVal }, count);
      }
      if (includeCountries && countryVal) {
        addSuggestion('country', { city: '', region: '', country: countryVal }, count);
      }
    }

    const sortSuggestions = (map) => Array.from(map.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.value.localeCompare(b.value);
    });

    const cityList = sortSuggestions(suggestionMaps.city);
    const regionList = sortSuggestions(suggestionMaps.region);
    const countryList = sortSuggestions(suggestionMaps.country);

    const countryFilterLc = String(countryFilter || '').trim().toLowerCase();
    const regionFilterLc = String(regionFilter || '').trim().toLowerCase();

    const passesFilters = (item) => {
      if (countryFilterLc && (item.hierarchy.country || '').toLowerCase() !== countryFilterLc) {
        return false;
      }
      if (regionFilterLc && (item.hierarchy.region || '').toLowerCase() !== regionFilterLc) {
        return false;
      }
      return true;
    };

    const filteredCities = cityList.filter(passesFilters);
    const filteredRegions = regionList.filter(passesFilters);
    const filteredCountries = countryList.filter(passesFilters);

    const takeWithLimit = (list) => list.slice(0, numericLimit);

    if (['city', 'region', 'country'].includes(normalizedScope)) {
      const scoped = normalizedScope === 'city'
        ? filteredCities
        : normalizedScope === 'region'
          ? filteredRegions
          : filteredCountries;
      return res.json({ locationStats: takeWithLimit(scoped) });
    }

    const merged = [];
    let cityIndex = 0;
    let regionIndex = 0;
    let countryIndex = 0;

    while (merged.length < numericLimit) {
      let added = false;
      if (cityIndex < filteredCities.length && merged.length < numericLimit) {
        merged.push(filteredCities[cityIndex++]);
        added = true;
      }
      if (regionIndex < filteredRegions.length && merged.length < numericLimit) {
        merged.push(filteredRegions[regionIndex++]);
        added = true;
      }
      if (countryIndex < filteredCountries.length && merged.length < numericLimit) {
        merged.push(filteredCountries[countryIndex++]);
        added = true;
      }
      if (!added) {
        break;
      }
    }

    if (merged.length < numericLimit) {
      const remaining = filteredCities.slice(cityIndex)
        .concat(filteredRegions.slice(regionIndex))
        .concat(filteredCountries.slice(countryIndex));
      for (const item of remaining) {
        merged.push(item);
        if (merged.length >= numericLimit) break;
      }
    }

    res.json({ locationStats: merged.slice(0, numericLimit) });
  } catch (err) {
    console.error('Error fetching location suggestions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
