/*
  Fix user records that were saved with the erroneous "London Osh" location.

  Usage:
    node backend/scripts/fixLondonOshLocation.js
*/

const path = require('path');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const { normalizeLocation } = require('../utils/location');

async function connectToDatabase() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI not set');
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });

    console.log('Connected to MongoDB Atlas:', conn.connection.host);
  } catch (err) {
    console.warn('Atlas connection failed:', err.message);
    console.log('Attempting local MongoDB connection...');

    await mongoose.connect('mongodb://localhost:27017/giglink', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 3000
    });

    console.log('Connected to local MongoDB');
  }
}

async function fixLondonOshUsers() {
  const query = {
    location: {
      $regex: /london[\s,]*osh/i
    }
  };

  const users = await User.find(query).lean();

  if (!users.length) {
    console.log('No users found with the erroneous "London Osh" location.');
    return { updated: 0 };
  }

  const correctedLocation = normalizeLocation('London, England, United Kingdom');
  const update = {
    location: correctedLocation,
    locationData: {
      city: 'London',
      region: 'England',
      country: 'United Kingdom'
    }
  };

  let updated = 0;

  for (const user of users) {
    await User.updateOne(
      { _id: user._id },
      {
        $set: update
      }
    );
    updated++;
    console.log(`Updated user ${user._id} (${user.email}) to location "${correctedLocation}"`);
  }

  return { updated };
}

(async () => {
  try {
    await connectToDatabase();
    const { updated } = await fixLondonOshUsers();
    console.log(`Users updated: ${updated}`);
  } catch (error) {
    console.error('Error fixing London Osh users:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
