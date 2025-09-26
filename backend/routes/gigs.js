const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Gig = require('../models/Gig');
const User = require('../models/User');
const Message = require('../models/Message');
const { createNotification } = require('./notifications');

const { normalizeLocation } = require('../utils/location');

// @route   POST api/gigs
// @desc    Create a gig
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.location) payload.location = normalizeLocation(payload.location);
    if (Array.isArray(payload.schedules)) {
      payload.schedules = payload.schedules.map(s => ({
        ...s,
        // no-op for times; normalize date separately if needed in future
        date: s && s.date ? String(s.date) : s.date
      }));
    }

    const newGig = new Gig({
      ...payload,
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
// @desc    Get gigs with optional server-side filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      q, // free-text search: title/description/venue/location
      instruments,
      genres,
      location,
      dateFrom,
      dateTo,
      limit = 50,
      page = 1
    } = req.query;

    // Build AND conditions for composable filtering
    const and = [];

    // Text search across common fields
    if (q && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      and.push({
        $or: [
          { title: rx },
          { description: rx },
          { venue: rx },
          { location: rx }
        ]
      });
    }

    // Location filter (match gig.location or fallback to gig owner's user.location)
    if (location && location.trim()) {
      const rxLoc = new RegExp(location.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      // Pre-fetch user IDs whose location matches
      const matchingUsers = await User.find({ location: { $regex: rxLoc } }).select('_id').lean();
      const userIds = matchingUsers.map(u => u._id);
      and.push({
        $or: [
          { location: { $regex: rxLoc } },
          ...(userIds.length ? [{ user: { $in: userIds } }] : [])
        ]
      });
    }

    // Instruments filtering (support comma-separated or repeated params)
    if (instruments) {
      const arr = Array.isArray(instruments)
        ? instruments
        : instruments.split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) and.push({ instruments: { $in: arr } });
    }

    // Genres filtering
    if (genres) {
      const arr = Array.isArray(genres)
        ? genres
        : genres.split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) and.push({ genres: { $in: arr } });
    }

    // Date range on ISO string YYYY-MM-DD (lexicographic compare works)
    if (dateFrom || dateTo) {
      const dateFilter = {};
      if (dateFrom) dateFilter.$gte = dateFrom;
      if (dateTo) dateFilter.$lte = dateTo;
      and.push({ date: dateFilter });
    }

    const filter = and.length ? { $and: and } : {};

    const numericLimit = Math.min(parseInt(limit) || 50, 100);
    const numericPage = Math.max(parseInt(page) || 1, 1);
    const skip = (numericPage - 1) * numericLimit;

    const gigs = await Gig.find(filter)
      .populate('user', ['name', 'avatar', 'location'])
      .populate('applicants.user', ['_id', 'name', 'avatar'])
      .sort({ date: 1, createdAt: -1 })
      .limit(numericLimit)
      .skip(skip);
    
    // Add applicant count and applicant info for gig owners, plus application status for users
    const gigsWithApplicantCount = gigs.map(gig => {
      const gigObj = gig.toObject();
      gigObj.applicantCount = gig.applicants ? gig.applicants.length : 0;
      // Ensure a usable, normalized location in response (fallback to owner location for display/filter consistency)
      const invalid = (s) => !s || !String(s).trim() || String(s).trim().toLowerCase() === 'location not specified';
      if (invalid(gigObj.location)) {
        const ownerLoc = gigObj.user && gigObj.user.location ? gigObj.user.location : '';
        const norm = normalizeLocation(ownerLoc || '');
        if (norm) gigObj.location = norm;
      } else {
        gigObj.location = normalizeLocation(gigObj.location);
      }
      
      // Include applicant details if user is authenticated and owns the gig
      const token = req.header('x-auth-token');
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const userId = decoded.user.id;
          
          if (gig.user._id.toString() === userId) {
            // User owns this gig - include applicants
            gigObj.applicants = gig.applicants;
          } else {
            // User doesn't own this gig - check if they applied
            const userApplication = gig.applicants.find(app => {
              const applicantUserId = app.user && app.user._id ? app.user._id.toString() : (app.user && app.user.toString ? app.user.toString() : app.user);
              return applicantUserId === userId;
            });
            
            if (userApplication) {
              gigObj.yourApplicationStatus = userApplication.status || 'pending';
            }
          }
        } catch (err) {
          // Token invalid, don't include applicants or application status
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

// @route   GET api/gigs/filters
// @desc    Get distinct filter values from existing gigs
// @access  Public
router.get('/filters', async (_req, res) => {
  try {
    const [instruments, genres] = await Promise.all([
      Gig.distinct('instruments'),
      Gig.distinct('genres')
    ]);

    // Suggestion stats with fallback to user.location when gig.location is empty
    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'u',
          pipeline: [ { $project: { location: 1 } } ]
        }
      },
      {
        $project: {
          loc: {
            $trim: {
              input: {
                $ifNull: [
                  { $cond: [ { $ne: ['$location', ''] }, '$location', null ] },
                  { $arrayElemAt: ['$u.location', 0] }
                ]
              }
            }
          }
        }
      },
      { $match: { loc: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: { $toLower: '$loc' },
          count: { $sum: 1 },
          label: { $first: '$loc' }
        }
      },
      { $sort: { count: -1, label: 1 } },
      { $limit: 200 },
      { $project: { _id: 0, label: 1, count: 1 } }
    ];

    const locationAgg = await Gig.aggregate(pipeline);
    // normalize labels for consistent display keys
    const normCount = new Map();
    for (const row of locationAgg) {
      const norm = normalizeLocation(row.label || '');
      if (!norm) continue;
      const key = norm.toLowerCase();
      const prev = normCount.get(key) || { label: norm, count: 0 };
      prev.count += row.count || 0;
      normCount.set(key, prev);
    }
    const locationStats = Array.from(normCount.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    const locations = locationStats.map(l => l.label);

    res.json({ locations, locationStats, instruments: (instruments || []).filter(Boolean).sort(), genres: (genres || []).filter(Boolean).sort() });
  } catch (err) {
    console.error('Error fetching gig filters:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/gigs/locations
// @desc    Predictive location suggestions from existing gigs (no GeoNames)
// @access  Public
router.get('/locations', async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;
    const numericLimit = Math.min(parseInt(limit) || 10, 50);

    const rx = q && q.trim()
      ? new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : null;

    // Aggregate distinct locations from gig.location with fallback to user.location
    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'u',
          pipeline: [ { $project: { location: 1 } } ]
        }
      },
      {
        $project: {
          loc: {
            $trim: {
              input: {
                $ifNull: [
                  { $cond: [ { $ne: ['$location', ''] }, '$location', null ] },
                  { $arrayElemAt: ['$u.location', 0] }
                ]
              }
            }
          }
        }
      },
      { $match: { loc: { $exists: true, $ne: '' } } },
      ...(rx ? [{ $match: { loc: { $regex: rx } } }] : []),
      {
        $group: {
          _id: { $toLower: '$loc' },
          count: { $sum: 1 },
          label: { $first: '$loc' }
        }
      },
      { $sort: { count: -1, label: 1 } },
      { $limit: numericLimit },
      { $project: { _id: 0, label: 1, count: 1 } }
    ];

    const agg = await Gig.aggregate(pipeline);
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

// @route   GET api/gigs/:id
// @desc    Get gig by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id)
      .populate('user', ['_id', 'name', 'avatar', 'location'])
      .populate('applicants.user', ['_id', 'name', 'avatar']);

    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }

    // Add applicant count to the gig
    const gigObj = gig.toObject();
    gigObj.applicantCount = gig.applicants ? gig.applicants.length : 0;
    // Normalize/fallback location for single view as well
    const invalid = (s) => !s || !String(s).trim() || String(s).trim().toLowerCase() === 'location not specified';
    if (invalid(gigObj.location)) {
      const ownerLoc = gigObj.user && gigObj.user.location ? gigObj.user.location : '';
      const norm = normalizeLocation(ownerLoc || '');
      if (norm) gigObj.location = norm;
    } else {
      gigObj.location = normalizeLocation(gigObj.location);
    }

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
          // Check if someone else was accepted (for 'fixed' status display)
          gigObj.acceptedByOther = gig.applicants.some(
            app => app.status === 'accepted' && (
              app.user && app.user._id ? app.user._id.toString() : 
              (app.user && app.user.toString ? app.user.toString() : app.user)
            ) !== myId
          );
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
    
    // Update gig (normalize location if present)
    const update = { ...req.body };
    if (update.location) update.location = normalizeLocation(update.location);
    gig = await Gig.findByIdAndUpdate(
      req.params.id,
      { $set: update },
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

    // Create notification for gig owner
    const applicant = await User.findById(req.user.id).select('name');
    await createNotification(
      gig.user,
      req.user.id,
      'gig_application',
      `${applicant.name} applied for your gig: ${gig.title}`,
      gig._id,
      'Gig',
      req
    );

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
