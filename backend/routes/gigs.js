const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Gig = require('../models/Gig');
const User = require('../models/User');

// Shared mock data array
let mockGigs = [
  {
    _id: '6',
    title: 'Dep Bass Player Needed',
    venue: 'Restaurant',
    location: 'London',
    date: '2025-09-05',
    time: '22:00',
    payment: '£100',
    instruments: ['Bass'],
    genres: ['Jazz'],
    description: 'Easy restaurant gig',
    requirements: 'Knowledge of jazz standards, bring an amp',
    user: {
      _id: '2',
      name: 'Oscar Ho',
      avatar: null
    }
  },
  {
    _id: '7',
    title: 'Pianist Needed for Wedding',
    venue: 'Grand Hotel',
    location: 'London',
    date: '2024-06-15',
    time: '15:00',
    payment: '£400',
    instruments: ['Piano'],
    genres: ['Classical', 'Jazz'],
    description: 'Looking for an experienced pianist for a wedding ceremony and reception.',
    requirements: 'Must be able to play both classical and contemporary pieces.',
    user: {
      _id: '2',
      name: 'Oscar Ho',
      avatar: null
    }
  },
  {
    _id: '8',
    title: 'Violinist for Corporate Dinner',
    venue: 'City Hall',
    location: 'London',
    date: '2024-07-20',
    time: '19:30',
    payment: '£250',
    instruments: ['Violin'],
    genres: ['Classical'],
    description: 'Corporate dinner event needs elegant violin music during dinner service.',
    requirements: 'Professional attire required. Classical repertoire preferred.',
    user: {
      _id: '2',
      name: 'Oscar Ho',
      avatar: null
    }
  },
  {
    _id: '9',
    title: 'Acoustic Guitarist for Coffee Shop',
    venue: 'The Bean Cafe',
    location: 'Brighton',
    date: '2024-03-15',
    time: '16:00',
    payment: '£120',
    instruments: ['Guitar'],
    genres: ['Folk', 'Acoustic'],
    description: 'Looking for a talented acoustic guitarist for a cozy coffee shop performance.',
    requirements: 'Own acoustic guitar and microphone. Repertoire of folk and contemporary songs.',
    user: {
      _id: '7',
      name: 'Test One',
      avatar: null
    }
  },
  {
    _id: '10',
    title: 'Pianist for Restaurant Dinner',
    venue: 'Bella Vista Restaurant',
    location: 'Edinburgh',
    date: '2024-04-20',
    time: '19:30',
    payment: '£200',
    instruments: ['Piano'],
    genres: ['Jazz', 'Classical'],
    description: 'Elegant restaurant seeks pianist for dinner service background music.',
    requirements: 'Professional appearance required. Jazz standards and light classical repertoire.',
    user: {
      _id: '8',
      name: 'Test Two',
      avatar: null
    }
  },
  {
    _id: '11',
    title: 'Drummer for Indie Band',
    venue: 'The Underground',
    location: 'Birmingham',
    date: '2024-05-10',
    time: '21:00',
    payment: '£150',
    instruments: ['Drums'],
    genres: ['Indie', 'Rock'],
    description: 'Local indie band needs drummer for live performance at popular venue.',
    requirements: 'Own drum kit preferred. Experience with indie/alternative rock essential.',
    user: {
      _id: '9',
      name: 'Test Three',
      avatar: null
    }
  },
  {
    _id: '12',
    title: 'Violinist for Wedding Ceremony',
    venue: 'St. Andrews Church',
    location: 'Liverpool',
    date: '2024-06-08',
    time: '14:00',
    payment: '£300',
    instruments: ['Violin'],
    genres: ['Classical', 'Contemporary'],
    description: 'Beautiful church wedding needs skilled violinist for ceremony music.',
    requirements: 'Classical training required. Must know traditional wedding repertoire.',
    user: {
      _id: '10',
      name: 'Test Four',
      avatar: null
    }
  },
  {
    _id: '13',
    title: 'Bass Player for Funk Band',
    venue: 'Jazz Cafe',
    location: 'Bristol',
    date: '2024-07-12',
    time: '20:30',
    payment: '£180',
    instruments: ['Bass'],
    genres: ['Funk', 'Soul'],
    description: 'Established funk band seeks bass player for regular gig at popular jazz venue.',
    requirements: 'Strong groove and timing essential. Own bass and amp required.',
    user: {
      _id: '11',
      name: 'Test Five',
      avatar: null
    }
  }
];

// @route   POST api/gigs
// @desc    Create a gig
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    // Generate a new ID
    const newId = (mockGigs.length + 1).toString();
    
    // Create new gig object
    const newGig = {
      _id: newId,
      ...req.body,
      user: {
        _id: req.user.id,
        name: req.user.name,
        avatar: null
      }
    };
    
    // Add to mock data array
    mockGigs.push(newGig);
    
    res.json(newGig);
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
    res.json(mockGigs);
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
    const gig = mockGigs.find(g => g._id === req.params.id);
    
    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    
    res.json(gig);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/gigs
// @desc    Create a gig
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, venue, location, date, time, payment, instruments, genres, description, requirements } = req.body;
    
    const gigIndex = mockGigs.findIndex(g => g._id === req.params.id);
    
    if (gigIndex === -1) {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    
    const gig = mockGigs[gigIndex];
    
    // Check if user owns this gig
    if (gig.user._id !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Update gig fields
    mockGigs[gigIndex] = {
      ...gig,
      title: title !== undefined ? title : gig.title,
      venue: venue !== undefined ? venue : gig.venue,
      location: location !== undefined ? location : gig.location,
      date: date !== undefined ? date : gig.date,
      time: time !== undefined ? time : gig.time,
      payment: payment !== undefined ? payment : gig.payment,
      instruments: instruments !== undefined ? instruments : gig.instruments,
      genres: genres !== undefined ? genres : gig.genres,
      description: description !== undefined ? description : gig.description,
      requirements: requirements !== undefined ? requirements : gig.requirements
    };
    
    res.json(mockGigs[gigIndex]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/gigs/:id
// @desc    Delete a gig
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const gigIndex = mockGigs.findIndex(g => g._id === req.params.id);
    
    if (gigIndex === -1) {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    
    const gig = mockGigs[gigIndex];
    
    // Check if user owns this gig
    if (gig.user._id !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Remove gig from mock data array
    mockGigs.splice(gigIndex, 1);
    
    res.json({ msg: 'Gig removed' });
  } catch (err) {
    console.error(err.message);
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