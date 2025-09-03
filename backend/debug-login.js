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
    
    console.log('✅ User found:');
    console.log('- ID:', user._id);
    console.log('- Name:', user.name);
    console.log('- Email:', user.email);
    console.log('- Password hash:', user.password);
    
    // Test password verification
    const testPassword = 'OscarHo2024!';
    console.log('\n🔍 Testing password:', testPassword);
    
    // Method 1: Using bcrypt directly
    const isMatch1 = await bcrypt.compare(testPassword, user.password);
    console.log('✅ bcrypt.compare result:', isMatch1);
    
    // Method 2: Using user model method (if it exists)
    if (user.comparePassword) {
      const isMatch2 = await user.comparePassword(testPassword);
      console.log('✅ user.comparePassword result:', isMatch2);
    } else {
      console.log('⚠️ user.comparePassword method not available');
    }
    
    // Test with wrong password
    const wrongPassword = 'wrongpassword';
    const isMatch3 = await bcrypt.compare(wrongPassword, user.password);
    console.log('❌ Wrong password test:', isMatch3);
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error:', err.message);
    mongoose.connection.close();
  });