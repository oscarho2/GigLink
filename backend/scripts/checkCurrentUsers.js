require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB Atlas');
    
    const users = await User.find({}, 'name email createdAt').sort({ createdAt: 1 });
    
    console.log('\nCurrent users in database:');
    console.log('==========================');
    
    if (users.length === 0) {
      console.log('No users found in database');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log('---');
      });
    }
    
    console.log(`\nTotal users: ${users.length}`);
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    mongoose.connection.close();
  }
};

checkUsers();