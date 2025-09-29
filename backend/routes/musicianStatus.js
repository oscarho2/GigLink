const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route   PUT api/profiles/musician-status
// @desc    Update only the isMusician field
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
// @desc    Get current musician status
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

module.exports = router;