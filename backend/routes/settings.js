const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route   GET api/settings/notifications
// @desc    Get user notification preferences
// @access  Private
router.get('/notifications', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notificationPreferences');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Return default preferences if none exist
    const preferences = user.notificationPreferences || {
      emailNotifications: true,
      pushNotifications: false,
      commentNotifications: true,
      messageNotifications: true,
      gigResponseNotifications: true,
      gigApplicationNotifications: true,
      linkRequestNotifications: true,
      likeNotifications: true
    };
    
    res.json(preferences);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/settings/notifications
// @desc    Update user notification preferences
// @access  Private
router.put('/notifications', auth, async (req, res) => {
  try {
    const {
      emailNotifications,
      pushNotifications,
      commentNotifications,
      messageNotifications,
      gigResponseNotifications,
      gigApplicationNotifications,
      linkRequestNotifications,
      likeNotifications
    } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Update notification preferences
    user.notificationPreferences = {
      emailNotifications: emailNotifications !== undefined ? emailNotifications : user.notificationPreferences?.emailNotifications || true,
      pushNotifications: pushNotifications !== undefined ? pushNotifications : user.notificationPreferences?.pushNotifications || false,
      commentNotifications: commentNotifications !== undefined ? commentNotifications : user.notificationPreferences?.commentNotifications || true,
      messageNotifications: messageNotifications !== undefined ? messageNotifications : user.notificationPreferences?.messageNotifications || true,
      gigResponseNotifications: gigResponseNotifications !== undefined ? gigResponseNotifications : user.notificationPreferences?.gigResponseNotifications || true,
      gigApplicationNotifications: gigApplicationNotifications !== undefined ? gigApplicationNotifications : user.notificationPreferences?.gigApplicationNotifications || true,
      linkRequestNotifications: linkRequestNotifications !== undefined ? linkRequestNotifications : user.notificationPreferences?.linkRequestNotifications || true,
      likeNotifications: likeNotifications !== undefined ? likeNotifications : user.notificationPreferences?.likeNotifications || true
    };
    
    await user.save();
    
    res.json({
      msg: 'Notification preferences updated successfully',
      preferences: user.notificationPreferences
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;