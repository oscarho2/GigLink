const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const findUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    // Find all users with Jane or Oscar in their name
    const users = await User.find({
      $or: [
        { name: /jane/i },
        { name: /oscar/i },
        { email: /jane/i },
        { email: /oscar/i }
      ]
    }).select('name email _id');

    console.log('Found users:');
    users.forEach(user => {
      console.log(`- Name: ${user.name}, Email: ${user.email}, ID: ${user._id}`);
    });

    if (users.length === 0) {
      console.log('No users found with Jane or Oscar in name/email');
      
      // Show all users
      const allUsers = await User.find({}).select('name email _id').limit(10);
      console.log('\nAll users (first 10):');
      allUsers.forEach(user => {
        console.log(`- Name: ${user.name}, Email: ${user.email}, ID: ${user._id}`);
      });
    }

  } catch (error) {
    console.error('Error finding users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

findUsers();