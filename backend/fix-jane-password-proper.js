require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function fixJanePassword() {
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

    console.log('Current Jane data:');
    console.log('Password hash:', jane.password);
    
    // Hash the password using the same method as User model pre-save hook
    const saltRounds = 10;
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('\nNew password hash:', hashedPassword);
    
    // Update Jane's password directly
    jane.password = hashedPassword;
    await jane.save();
    
    console.log('Password updated successfully');
    
    // Verify the new password works
    const updatedJane = await User.findOne({ email: 'jane.smith@example.com' });
    const isValid = await updatedJane.comparePassword(newPassword);
    
    console.log('\nVerification:');
    console.log('New hash in DB:', updatedJane.password);
    console.log('Password verification result:', isValid);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nConnection closed');
  }
}

fixJanePassword();