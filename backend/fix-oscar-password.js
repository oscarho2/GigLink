const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/giglink')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({email: 'oscar@oscarho.co.uk'});
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found');
    console.log('Current password hash:', user.password);
    
    // Set a new password and let the pre-save hook handle the hashing
    const newPassword = 'OscarHo2024!';
    console.log('Setting new password:', newPassword);
    
    // Directly update the password field and save
    // The pre-save hook will automatically hash it
    user.password = newPassword;
    await user.save();
    
    console.log('✅ Password updated');
    console.log('New password hash:', user.password);
    
    // Test the new password
    const isMatch = await user.comparePassword(newPassword);
    console.log('✅ Password verification:', isMatch ? 'SUCCESS' : 'FAILED');
    
    // Also test with bcrypt directly
    const isMatch2 = await bcrypt.compare(newPassword, user.password);
    console.log('✅ bcrypt verification:', isMatch2 ? 'SUCCESS' : 'FAILED');
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error:', err.message);
    mongoose.connection.close();
  });