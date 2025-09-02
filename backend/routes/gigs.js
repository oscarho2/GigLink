const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Gig = require('../models/Gig');
const User = require('../models/User');

// @route   POST api/gigs
// @desc    Create a gig
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    const newGig = new Gig({
      user: req.user.id,
      ...req.body
    });
    
    const gig = await newGig.save();
    
    res.json(gig);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/gigs
// @desc    Get all gigs
// @access  Public
router.get('/', async (req, res) => {
  try {
    const gigs = await Gig.find().sort({ date: -1 }).populate('user', ['name', 'avatar']);
    res.json(gigs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/gigs/:id
// @desc    Get gig by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id).populate('user', ['name', 'avatar']);
    
    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    
    res.json(gig);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/gigs/:id/apply
// @desc    Apply to a gig
// @access  Private
router.post('/:id/apply', auth, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    
    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    
    // Check if already applied
    if (gig.applicants.some(applicant => applicant.user.toString() === req.user.id)) {
      return res.status(400).json({ msg: 'Already applied to this gig' });
    }
    
    gig.applicants.unshift({
      user: req.user.id,
      message: req.body.message
    });
    
    await gig.save();
    
    res.json(gig.applicants);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;