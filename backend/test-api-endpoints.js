const mongoose = require('mongoose');
const User = require('./models/User');
const Link = require('./models/Link');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/giglink', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

async function testAPIEndpoints() {
  try {
    // Find Oscar (the recipient who should see the pending request)
    const oscar = await User.findOne({ email: 'oscar@oscarho.co.uk' });
    if (!oscar) {
      console.log('❌ Oscar user not found');
      return;
    }
    console.log('✅ Found Oscar:', oscar.name, oscar.email);

    // Test pending requests endpoint (what Oscar should see)
    console.log('\n🔍 Testing pending requests for Oscar...');
    const pendingRequests = await Link.find({
      recipient: oscar._id,
      status: 'pending'
    }).populate('requester', 'name email avatar');
    
    console.log('📋 Pending requests:', pendingRequests.length);
    pendingRequests.forEach(request => {
      console.log(`  - From: ${request.requester.name} (${request.requester.email})`);
      console.log(`    Note: ${request.note}`);
      console.log(`    Created: ${request.createdAt}`);
      console.log(`    Link ID: ${request._id}`);
    });

    // Test sent requests endpoint (what Jane should see)
    console.log('\n🔍 Testing sent requests...');
    const jane = await User.findOne({ email: 'jane.smith@example.com' });
    if (jane) {
      const sentRequests = await Link.find({
        requester: jane._id,
        status: 'pending'
      }).populate('recipient', 'name email avatar');
      
      console.log('📤 Sent requests:', sentRequests.length);
      sentRequests.forEach(request => {
        console.log(`  - To: ${request.recipient.name} (${request.recipient.email})`);
        console.log(`    Note: ${request.note}`);
        console.log(`    Created: ${request.createdAt}`);
        console.log(`    Link ID: ${request._id}`);
      });
    }

    // Test links endpoint (should be empty for now)
    console.log('\n🔍 Testing links for Oscar...');
    const links = await Link.find({
      $or: [
        { requester: oscar._id, status: 'accepted' },
        { recipient: oscar._id, status: 'accepted' }
      ]
    }).populate('requester recipient', 'name email avatar');
    
    console.log('👥 Links:', links.length);
    links.forEach(link => {
      const linkedUser = link.requester._id.toString() === oscar._id.toString() 
        ? link.recipient 
        : link.requester;
      console.log(`  - Link: ${linkedUser.name} (${linkedUser.email})`);
    });

    console.log('\n✅ API endpoint test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing API endpoints:', error);
  } finally {
    mongoose.connection.close();
  }
}

testAPIEndpoints();