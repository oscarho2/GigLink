const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const listAllUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/giglink');
    console.log('Connected to MongoDB');

    // Find all users
    const users = await User.find({}).select('firstName lastName email createdAt');

    console.log(`\nTotal users in database: ${users.length}`);
    console.log('\nAll users:');
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

listAllUsers();