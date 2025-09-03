require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function fixJanePasswordDirect() {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    // Hash the password using the same method as User model
    const newPassword = 'password123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log('New password hash:', hashedPassword);
    
    // Update Jane's password directly in the database to bypass pre-save hook
    const result = await User.updateOne(
      { email: 'jane.smith@example.com' },
      { $set: { password: hashedPassword } }
    );
    
    console.log('Update result:', result);
    
    // Verify the new password works
    const jane = await User.findOne({ email: 'jane.smith@example.com' });
    if (jane) {
      console.log('\nVerification:');
      console.log('Hash in DB:', jane.password);
      
      const isValid = await jane.comparePassword(newPassword);
      console.log('Password verification result:', isValid);
      
      // Test with direct bcrypt comparison too
      const directMatch = await bcrypt.compare(newPassword, jane.password);
      console.log('Direct bcrypt comparison:', directMatch);
    } else {
      console.log('Jane not found after update');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nConnection closed');
  }
}

fixJanePasswordDirect();