require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function debugJaneUser() {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    // Find Jane Smith
    const jane = await User.findOne({ email: 'jane.smith@example.com' });
    
    if (!jane) {
      console.log('Jane Smith not found in database');
      return;
    }

    console.log('Jane Smith found:');
    console.log('ID:', jane._id);
    console.log('Name:', jane.name);
    console.log('Email:', jane.email);
    console.log('Password hash:', jane.password);
    console.log('Created at:', jane.createdAt);
    console.log('Updated at:', jane.updatedAt);

    // Test password comparison
    const testPassword = 'password123';
    console.log('\nTesting password comparison:');
    console.log('Test password:', testPassword);
    
    // Direct bcrypt comparison
    const directMatch = await bcrypt.compare(testPassword, jane.password);
    console.log('Direct bcrypt.compare result:', directMatch);
    
    // Using model method
    const methodMatch = await jane.comparePassword(testPassword);
    console.log('Model comparePassword result:', methodMatch);
    
    // Test with wrong password
    const wrongMatch = await jane.comparePassword('wrongpassword');
    console.log('Wrong password test:', wrongMatch);
    
    // Check if password is properly hashed
    console.log('\nPassword analysis:');
    console.log('Password starts with $2b$:', jane.password.startsWith('$2b$'));
    console.log('Password length:', jane.password.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nConnection closed');
  }
}

debugJaneUser();