/*
  Backfill Gig.location from the gig owner's User.location when missing or invalid.

  Usage:
    node scripts/backfillGigLocations.js
*/

require('dotenv').config();
const mongoose = require('mongoose');
const Gig = require('../models/Gig');
const User = require('../models/User');
const { normalizeLocation } = require('../utils/location');

const INVALID = new Set(['', 'unknown', 'n/a', 'not set', 'location not specified', 'none', 'null', 'undefined']);

async function connect() {
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set');
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB Atlas:', conn.connection.host);
  } catch (err) {
    console.warn('Atlas connect failed:', err.message);
    console.log('Falling back to local MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/giglink', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 3000,
    });
    console.log('Connected to local MongoDB');
  }
}

function isInvalidLocation(s) {
  if (!s || typeof s !== 'string') return true;
  const clean = s.trim().toLowerCase();
  return !clean || INVALID.has(clean);
}

async function run() {
  await connect();
  try {
    const gigs = await Gig.find({}).select('user location').lean();
    let updated = 0;
    for (const g of gigs) {
      const current = g.location || '';
      const norm = normalizeLocation(current);
      if (!isInvalidLocation(norm)) continue;

      // Fetch user location
      const user = await User.findById(g.user).select('location').lean();
      const userLoc = normalizeLocation(user && user.location || '');
      if (!isInvalidLocation(userLoc)) {
        await Gig.updateOne({ _id: g._id }, { $set: { location: userLoc } });
        updated++;
      }
    }
    console.log(`Gigs backfilled from user location: ${updated}/${gigs.length}`);
  } catch (e) {
    console.error('Backfill error:', e);
  } finally {
    await mongoose.disconnect();
  }
}

run();

