/*
  Normalize all Gig.location and User.location strings to a consistent format.

  Usage:
    node scripts/normalizeLocations.js

  The script attempts to connect using MONGO_URI from env, with a local
  fallback to mongodb://localhost:27017/giglink (same as server.js).
*/

require('dotenv').config();
const mongoose = require('mongoose');
const Gig = require('../models/Gig');
const User = require('../models/User');
const { normalizeLocation } = require('../utils/location');

async function connect() {
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set');
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB Atlas:', conn.connection.host);
    return;
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

async function normalizeGigs() {
  const gigs = await Gig.find({}).select('location').lean();
  let updated = 0;
  for (const g of gigs) {
    const current = g.location || '';
    const norm = normalizeLocation(current);
    if (current && norm && current !== norm) {
      await Gig.updateOne({ _id: g._id }, { $set: { location: norm } });
      updated++;
    }
  }
  console.log(`Gigs normalized: ${updated}/${gigs.length}`);
}

async function normalizeUsers() {
  const users = await User.find({}).select('location').lean();
  let updated = 0;
  for (const u of users) {
    const current = u.location || '';
    const norm = normalizeLocation(current);
    if (current && norm && current !== norm) {
      await User.updateOne({ _id: u._id }, { $set: { location: norm } });
      updated++;
    }
  }
  console.log(`Users normalized: ${updated}/${users.length}`);
}

(async () => {
  try {
    await connect();
    await normalizeGigs();
    await normalizeUsers();
  } catch (e) {
    console.error('Error during normalization:', e);
  } finally {
    await mongoose.disconnect();
  }
})();

