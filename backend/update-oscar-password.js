const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/giglink', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateOscarPassword() {
  try {
    console.log('Connected to MongoDB');
    
    // Find Oscar's user account
    const user = await User.findOne({ email: 'oscar@oscarho.co.uk' });
    
    if (!user) {
      console.log('❌ Oscar Ho user not found');
      return;
    }
    
    console.log('✅ Found Oscar Ho user');
    
    // Set a new password
    const newPassword = 'OscarHo2024!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the password
    user.password = hashedPassword;
    await user.save();
    
    console.log('✅ Password updated successfully');
    console.log('New password:', newPassword);
    console.log('New hash:', hashedPassword);
    
    // Test the new password
    const isMatch = await bcrypt.compare(newPassword, hashedPassword);
    console.log('✅ Password verification:', isMatch ? 'SUCCESS' : 'FAILED');
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error updating password:', error.message);
    mongoose.connection.close();
  }
}

updateOscarPassword();