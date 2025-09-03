const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Load environment variables and connect to MongoDB Atlas
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('MongoDB connection error:', err));

async function resetJanePassword() {
  try {
    console.log('🔍 Finding Jane Smith user...');
    
    const janeUser = await User.findOne({ email: 'jane.smith@example.com' });
    
    if (!janeUser) {
      console.log('❌ Jane Smith user not found');
      return;
    }
    
    console.log('✅ Found Jane Smith user');
    
    // Set password to 'password123'
    const hashedPassword = await bcrypt.hash('password123', 10);
    janeUser.password = hashedPassword;
    await janeUser.save();
    
    console.log('✅ Jane Smith password updated to: password123');
    
    // Test the password
    const isMatch = await bcrypt.compare('password123', hashedPassword);
    console.log('✅ Password verification:', isMatch ? 'SUCCESS' : 'FAILED');
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

resetJanePassword();