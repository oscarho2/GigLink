const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Gig = require('../models/Gig');
const User = require('../models/User');
const Message = require('../models/Message');
const { createNotification } = require('./notifications');

const ACRONYM_SET = new Set([
  'UK', 'GB', 'USA', 'US', 'UAE', 'EU', 'NYC',
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT',
  'NSW','VIC','QLD','SA','WA','TAS','ACT','NT'
]);

const stripPostalCodes = (value = '') => {
  if (!value) return '';
  let result = String(value);

  result = result.replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi, '');
  result = result.replace(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/gi, '');

  const segments = result
    .split(',')
    .map(segment => {
      const words = segment
        .split(/\s+/)
        .filter(Boolean);
      const filtered = words.filter((word, idx) => {
        const normalized = word.replace(/[^A-Za-z0-9-]/g, '');
        if (!normalized) return false;
        const isNumericPostal = /^\d{4,6}$/.test(normalized);
        const isPlusFour = /^\d{5}-\d{4}$/.test(normalized);
        if ((isNumericPostal || isPlusFour) && idx >= words.length - 1) {
          return false;
        }
        return true;
      });
      return filtered.join(' ');
    })
    .filter(Boolean);

  result = segments.join(', ');

  return result
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/^,\s*/, '')
    .replace(/,\s*$/, '')
    .trim();
};

const titleCaseToken = (token = '') => {
  if (!token) return '';
  const upper = token.toUpperCase();
  if (upper === token && (token.length <= 3 || ACRONYM_SET.has(upper))) {
    return upper;
  }
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
};

const titleCaseSegment = (segment = '') => {
  if (!segment) return '';
  return segment
    .split(/([\s\-'])/)
    .map((part) => {
      if (!part) return part;
      if (/^[\s\-']$/.test(part)) return part;
      return titleCaseToken(part);
    })
    .join('')
    .trim();
};

const dedupeSegments = (segments) => {
  const seen = new Set();
  const result = [];
  for (const segment of segments) {
    if (!segment) continue;
    const key = segment.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(segment);
  }
  return result;
};

const buildLocationObject = ({ venue = '', street = '', city = '', region = '', country = '' }) => {
  const cleanVenue = titleCaseSegment(stripPostalCodes(venue));
  const cleanStreet = titleCaseSegment(stripPostalCodes(street));
  const cleanCity = titleCaseSegment(stripPostalCodes(city));
  const cleanRegion = titleCaseSegment(stripPostalCodes(region));
  const cleanCountry = titleCaseSegment(stripPostalCodes(country));

  const nameSegments = dedupeSegments([
    cleanVenue,
    cleanStreet,
    cleanCity,
    cleanRegion,
    cleanCountry,
  ]);

  return {
    name: nameSegments.join(', '),
    street: cleanStreet,
    city: cleanCity,
    region: cleanRegion,
    country: cleanCountry,
  };
};

const normalizeLocationInput = (input) => {
  if (!input) return null;

  if (typeof input === 'string') {
    const sanitized = stripPostalCodes(input);
    const parts = sanitized.split(',').map(part => part.trim()).filter(Boolean);
    if (!parts.length) return null;

    const [venue, ...rest] = parts;
    const remaining = [...rest];
    const country = remaining.length ? remaining.pop() : '';
    const region = remaining.length ? remaining.pop() : '';
    const city = remaining.length ? remaining.pop() : '';
    const street = remaining.join(', ');

    return buildLocationObject({ venue, street, city, region, country });
  }

  if (typeof input === 'object') {
    const sanitizedName = stripPostalCodes(input.name || '');
    const nameParts = sanitizedName.split(',').map(part => part.trim()).filter(Boolean);
    const venue = nameParts.length ? nameParts[0] : (input.venue || '');

    const street = input.street || (nameParts.length > 1 ? nameParts[1] : '');
    const city = input.city || (nameParts.length > 2 ? nameParts[2] : '');
    const countryFallbackIndex = nameParts.length ? nameParts.length - 1 : -1;
    const regionFromName = nameParts.length > 3 ? nameParts[nameParts.length - 2] : '';
    const countryFromName = countryFallbackIndex >= 0 ? nameParts[countryFallbackIndex] : '';

    const region = input.region || regionFromName;
    const country = input.country || countryFromName;

    return buildLocationObject({ venue, street, city, region, country });
  }

  return null;
};

// @route   POST api/gigs
// @desc    Create a gig
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const payload = { ...req.body };
    const { title, description, location, date, time, payment, instruments, genres } = payload;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ msg: 'Title is required and must be a string.' });
    }
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ msg: 'Description is required and must be a string.' });
    }
    if (!location) {
      return res.status(400).json({ msg: 'Location is required.' });
    }
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ msg: 'Date is required and must be a string.' });
    }
    if (!time || typeof time !== 'string') {
      return res.status(400).json({ msg: 'Time is required and must be a string.' });
    }
    if (!payment || typeof payment !== 'string') {
      return res.status(400).json({ msg: 'Payment is required and must be a string.' });
    }
    if (!Array.isArray(instruments) || instruments.length === 0) {
      return res.status(400).json({ msg: 'Instruments are required and must be a non-empty array.' });
    }
    if (genres && !Array.isArray(genres)) {
      return res.status(400).json({ msg: 'Genres must be an array.' });
    }

    payload.location = normalizeLocationInput(payload.location);

    if (!payload.location || !payload.location.city || !payload.location.country) {
      return res.status(400).json({ msg: 'Location must include both a city and a country.' });
    }

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
    console.error('Error creating gig:', err);
    console.error('Request Body:', req.body);
    res.status(500).json({ msg: 'Server Error', error: err.message, details: err });
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
          { instruments: rx },
          { genres: rx },
          { location: rx },
          { 'location.name': rx },
          { 'location.city': rx },
          { 'location.region': rx },
          { 'location.country': rx }
        ]
      });
    }

    // Location filter (match gig.location or fallback to gig owner's user.location)
    if (location && location.trim()) {
      const rxLoc = new RegExp(location.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      // Pre-fetch user IDs whose location matches
      const matchingUsers = await User.find({
        $or: [
          { 'locationData.country': { $regex: rxLoc } },
          { 'locationData.region': { $regex: rxLoc } },
          { 'locationData.city': { $regex: rxLoc } },
        ]
      }).select('_id').lean();
      const userIds = matchingUsers.map(u => u._id);
      and.push({
        $or: [
          { 'location.name': { $regex: rxLoc } },
          { 'location.street': { $regex: rxLoc } },
          { 'location.city': { $regex: rxLoc } },
          { 'location.region': { $regex: rxLoc } },
          { 'location.country': { $regex: rxLoc } },
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
      .populate('user', ['name', 'avatar', 'locationData'])
      .populate('applicants.user', ['_id', 'name', 'avatar'])
      .sort({ date: 1, createdAt: -1 })
      .limit(numericLimit)
      .skip(skip);
    
    // Add applicant count and applicant info for gig owners, plus application status for users
    const gigsWithApplicantCount = gigs.map(gig => {
      const gigObj = gig.toObject();
      gigObj.applicantCount = gig.applicants ? gig.applicants.length : 0;

      
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
        $project: {
          loc: '$location.city'
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
    const locationStats = locationAgg;
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
    const trimmed = (q || '').trim();
    const rx = trimmed ? new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const gigs = await Gig.find({}, { location: 1 }).lean();
    const counts = new Map();

    const pushLabel = (label) => {
      if (!label) return;
      if (rx && !rx.test(label)) return;
      const key = label.toLowerCase();
      const entry = counts.get(key);
      if (entry) {
        entry.count += 1;
      } else {
        counts.set(key, { label, count: 1 });
      }
    };

    for (const gig of gigs) {
      const loc = gig?.location || {};
      const city = String(loc.city || '').trim();
      const region = String(loc.region || '').trim();
      const country = String(loc.country || '').trim();
      const name = String(loc.name || '').trim();

      const components = [];
      if (city) components.push(city);
      if (region && !components.some(part => part.toLowerCase() === region.toLowerCase())) components.push(region);
      if (country && !components.some(part => part.toLowerCase() === country.toLowerCase())) components.push(country);
      if (!components.length && name) components.push(name);

      const label = components.join(', ');
      pushLabel(label);
    }

    const sorted = Array.from(counts.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, numericLimit);

    res.json({ locationStats: sorted });
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
      .populate('user', ['_id', 'name', 'avatar', 'locationData'])
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
    
    // Update gig
    const update = { ...req.body };

    if (update.location) {
      update.location = normalizeLocationInput(update.location);
    }

    gig = await Gig.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).populate('user', ['name', 'avatar']);
    
    res.json(gig);
  } catch (err) {
    console.error('Error updating gig:', err);
    console.error('Request Body:', req.body);
    res.status(500).json({ msg: 'Server Error', error: err.message, details: err });
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
        gigVenue: gig.location.name || '',
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
// @desc    Accept an applicant and mark gig as fixed
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
    
    // Mark gig as fixed
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
    
    res.json({ msg: 'Applicant accepted and gig marked as fixed', gig });
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
    
    // Only mark gig as not fixed if no other applicants are accepted
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
