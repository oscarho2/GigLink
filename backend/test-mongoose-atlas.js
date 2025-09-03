const mongoose = require('mongoose');
require('dotenv').config();

const uri = "mongodb+srv://oscarhuanxi_db_user:DwPibFAclkhKLkXK@cluster0.uh3xwth.mongodb.net/giglink?retryWrites=true&w=majority&appName=Cluster0";

async function testConnection() {
  try {
    console.log('🔄 Attempting to connect to MongoDB Atlas...');
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Test database operations
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Available collections:', collections.map(c => c.name));
    
    // Test a simple query
    const User = mongoose.model('User', new mongoose.Schema({}), 'users');
    const userCount = await User.countDocuments();
    console.log(`👥 Users in Atlas database: ${userCount}`);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('IP')) {
      console.log('\n🔧 IP Whitelist Issue:');
      console.log('- Go to MongoDB Atlas Dashboard');
      console.log('- Navigate to Network Access');
      console.log('- Add your current IP address');
    } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
      console.log('\n🔧 SSL/TLS Issue:');
      console.log('- This might be a network or firewall issue');
      console.log('- Try connecting from a different network');
      console.log('- Check if your ISP blocks MongoDB Atlas ports');
    } else if (error.message.includes('authentication')) {
      console.log('\n🔧 Authentication Issue:');
      console.log('- Check username and password');
      console.log('- Verify database user permissions');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

testConnection();