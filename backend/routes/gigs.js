const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Gig = require('../models/Gig');
const User = require('../models/User');
const Message = require('../models/Message');

// @route   POST api/gigs
// @desc    Create a gig
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const newGig = new Gig({
      ...req.body,
      user: req.user.id
    });
    
    const gig = await newGig.save();
    await gig.populate('user', ['name', 'avatar']);
    
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
    const gigs = await Gig.find().populate('user', ['name', 'avatar']).sort({ date: -1 });
    
    // Add applicant count and applicant info for gig owners
    const gigsWithApplicantCount = gigs.map(gig => {
      const gigObj = gig.toObject();
      gigObj.applicantCount = gig.applicants ? gig.applicants.length : 0;
      
      // Include applicant details if user is authenticated and owns the gig
      const token = req.header('x-auth-token');
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (gig.user._id.toString() === decoded.user.id) {
            gigObj.applicants = gig.applicants;
          }
        } catch (err) {
          // Token invalid, don't include applicants
        }
      }
      
      return gigObj;
    });
    
    res.json(gigsWithApplicantCount);
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
    const gig = await Gig.findById(req.params.id)
      .populate('user', ['_id', 'name', 'avatar'])
      .populate('applicants.user', ['_id', 'name', 'avatar']);

    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }

    // Add applicant count to the gig
    const gigObj = gig.toObject();
    gigObj.applicantCount = gig.applicants ? gig.applicants.length : 0;

    // Securely provide applicants only to the gig owner
    const token = req.header('x-auth-token');
    let isOwner = false;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const ownerId = (gig.user && typeof gig.user === 'object' && gig.user._id)
          ? gig.user._id.toString()
          : (gig.user && typeof gig.user.toString === 'function')
            ? gig.user.toString()
            : '';
        if (ownerId && ownerId === decoded.user.id) {
          isOwner = true;
        }
      } catch (err) {
        // Invalid token or comparison failure; treat as non-owner
      }
    }

    // For non-owners, include only the current user's application status (if any)
    if (!isOwner && token) {
      try {
        const jwt = require('jsonwebtoken');
        const decodedForStatus = jwt.verify(token, process.env.JWT_SECRET);
        const myId = decodedForStatus.user.id;
        const myApp = Array.isArray(gig.applicants)
          ? gig.applicants.find(a => {
              const userId = a.user && a.user._id ? a.user._id.toString() : (a.user && a.user.toString ? a.user.toString() : a.user);
              return userId === myId;
            })
          : null;
        if (myApp) {
          gigObj.yourApplicationStatus = myApp.status || 'pending';
        }
      } catch (err) {
        console.error('DEBUG: Error in status check:', err);
      }
    }

    if (!isOwner) {
      delete gigObj.applicants; // Hide applicants from non-owners
    }

    res.json(gigObj);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/gigs/:id
// @desc    Update a gig
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    let gig = await Gig.findById(req.params.id);
    
    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    
    // Check if user owns this gig
    if (gig.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Update gig
    gig = await Gig.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('user', ['name', 'avatar']);
    
    res.json(gig);
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
    const gig = await Gig.findById(req.params.id);
    
    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    
    // Check if user owns this gig
    if (gig.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    await Gig.findByIdAndRemove(req.params.id);
    
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
      message: req.body.message,
      status: 'pending'
    });
    
    await gig.save();

    // Also send a gig_application message to the gig owner so they can accept/undo from chat
    try {
      const io = req.app.get('io');
      const senderId = req.user.id; // applicant
      const recipientId = gig.user.toString(); // gig owner
      const conversationId = Message.generateConversationId(senderId, recipientId);
      
      const gigApplicationPayload = {
        gigId: gig._id,
        gigTitle: gig.title,
        gigVenue: gig.venue || gig.location || '',
        gigDate: gig.date || gig.eventDate || new Date(),
        gigPayment: gig.payment || gig.pay || 0,
        gigInstruments: Array.isArray(gig.instruments) ? gig.instruments : [],
        gigGenres: Array.isArray(gig.genres) ? gig.genres : []
      };
      
      const appMessage = new Message({
        sender: senderId,
        recipient: recipientId,
        content: req.body.message || 'Applied for your gig',
        conversationId,
        messageType: 'gig_application',
        gigApplication: gigApplicationPayload
      });
      await appMessage.save();
      await appMessage.populate('sender', 'name email');
      await appMessage.populate('recipient', 'name email');
      
      if (io) {
        io.to(conversationId).emit('new_message', appMessage);
        io.to(recipientId).emit('conversation_update', {
          conversationId,
          lastMessage: appMessage,
          unreadCount: 1
        });
      }
    } catch (emitErr) {
      console.error('Failed to emit gig_application message:', emitErr);
      // Non-blocking: proceed regardless
    }
    
    res.json(gig.applicants);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/gigs/:id/accept/:applicantId
// @desc    Accept an applicant and mark gig as filled
// @access  Private
router.post('/:id/accept/:applicantId', auth, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    
    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    
    // Check if user owns this gig
    if (gig.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Find the applicant
    const applicant = gig.applicants.find(
      app => app.user.toString() === req.params.applicantId
    );
    
    if (!applicant) {
      return res.status(404).json({ msg: 'Applicant not found' });
    }
    
    // Update applicant status to accepted
    applicant.status = 'accepted';
    
    // Mark gig as filled
    gig.isFilled = true;
    
    await gig.save();
    
    // Emit socket event to notify about application status change
    try {
      const io = req.app.get('io');
      if (io) {
        console.log(`Emitting application_status_update for accept: gigId=${gig._id}, applicantId=${req.params.applicantId}, status=accepted`);
        
        // Notify the accepted applicant
        io.to(req.params.applicantId).emit('application_status_update', {
          gigId: gig._id,
          applicantId: req.params.applicantId,
          status: 'accepted',
          gigTitle: gig.title
        });
        
        // Notify the gig owner
        io.to(req.user.id).emit('application_status_update', {
          gigId: gig._id,
          applicantId: req.params.applicantId,
          status: 'accepted',
          gigTitle: gig.title
        });
        
        console.log(`Socket events emitted to applicant ${req.params.applicantId} and owner ${req.user.id}`);
      } else {
        console.log('Socket.io instance not found');
      }
    } catch (emitErr) {
      console.error('Failed to emit application status update:', emitErr);
    }
    
    res.json({ msg: 'Applicant accepted and gig marked as filled', gig });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/gigs/:id/undo/:applicantId
// @desc    Undo acceptance of an applicant
// @access  Private
router.post('/:id/undo/:applicantId', auth, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    
    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    
    // Check if user owns this gig
    if (gig.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Find the applicant
    const applicant = gig.applicants.find(
      app => app.user.toString() === req.params.applicantId
    );
    
    if (!applicant) {
      return res.status(404).json({ msg: 'Applicant not found' });
    }
    
    // Update applicant status back to pending
    applicant.status = 'pending';
    
    // Check if there are any other accepted applicants
    const hasOtherAcceptedApplicants = gig.applicants.some(
      app => app.status === 'accepted' && app.user.toString() !== req.params.applicantId
    );
    
    // Only mark gig as not filled if no other applicants are accepted
    if (!hasOtherAcceptedApplicants) {
      gig.isFilled = false;
    }
    
    await gig.save();
    
    // Emit socket event to notify about application status change
    try {
      const io = req.app.get('io');
      if (io) {
        console.log(`Emitting application_status_update for undo: gigId=${gig._id}, applicantId=${req.params.applicantId}, status=pending`);
        
        // Notify the applicant whose acceptance was undone
        io.to(req.params.applicantId).emit('application_status_update', {
          gigId: gig._id,
          applicantId: req.params.applicantId,
          status: 'pending',
          gigTitle: gig.title
        });
        
        // Notify the gig owner
        io.to(req.user.id).emit('application_status_update', {
          gigId: gig._id,
          applicantId: req.params.applicantId,
          status: 'pending',
          gigTitle: gig.title
        });
        
        console.log(`Socket events emitted to applicant ${req.params.applicantId} and owner ${req.user.id}`);
      } else {
        console.log('Socket.io instance not found');
      }
    } catch (emitErr) {
      console.error('Failed to emit application status update:', emitErr);
    }
    
    res.json({ msg: 'Applicant acceptance undone', gig });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/gigs/user/applications
// @desc    Get current user's gig applications
// @access  Private
router.get('/user/applications', auth, async (req, res) => {
  try {
    const gigs = await Gig.find({
      'applicants.user': req.user.id
    })
    .populate('user', ['name', 'avatar'])
    .populate('applicants.user', ['name', 'avatar'])
    .sort({ 'applicants.date': -1 });

    // Map to include only the current user's application status and gig details
    const userApplications = gigs.map(gig => {
      const userApplication = gig.applicants.find(
        app => app.user._id.toString() === req.user.id
      );
      
      return {
        _id: gig._id,
        title: gig.title,
        venue: gig.venue,
        location: gig.location,
        date: gig.date,
        time: gig.time,
        payment: gig.payment,
        instruments: gig.instruments,
        genres: gig.genres,
        description: gig.description,
        isFilled: gig.isFilled,
        poster: gig.user,
        applicationStatus: userApplication.status,
        applicationDate: userApplication.date,
        applicationMessage: userApplication.message,
        // Check if someone else was accepted
        acceptedByOther: gig.applicants.some(
          app => app.status === 'accepted' && app.user._id.toString() !== req.user.id
        )
      };
    });

    res.json(userApplications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;