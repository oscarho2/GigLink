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

async function testAcceptRequest() {
  try {
    // Find Oscar (the recipient who will accept the request)
    const oscar = await User.findOne({ email: 'oscar@oscarho.co.uk' });
    if (!oscar) {
      console.log('❌ Oscar user not found');
      return;
    }
    console.log('✅ Found Oscar:', oscar.name, oscar.email);

    // Find the pending request
    const pendingRequest = await Link.findOne({
      recipient: oscar._id,
      status: 'pending'
    }).populate('requester', 'name email');

    if (!pendingRequest) {
      console.log('❌ No pending link request found for Oscar');
      return;
    }

    console.log('📋 Found pending request:', {
      from: pendingRequest.requester.name,
      note: pendingRequest.note,
      linkId: pendingRequest._id
    });

    // Accept the link request
    pendingRequest.status = 'accepted';
    pendingRequest.acceptedAt = new Date();
    await pendingRequest.save();

    console.log('🎉 Link request accepted successfully!');
    console.log('✅ Updated request status:', {
      status: pendingRequest.status,
      acceptedAt: pendingRequest.acceptedAt
    });

    // Verify the link
    const link = await Link.findById(pendingRequest._id)
      .populate('requester recipient', 'name email');
    
    console.log('👥 Verified link:', {
      requester: link.requester.name,
      recipient: link.recipient.name,
      status: link.status,
      createdAt: link.createdAt,
      acceptedAt: link.acceptedAt
    });

    // Test links endpoint after acceptance
    console.log('\n🔍 Testing links list after acceptance...');
    const links = await Link.find({
      $or: [
        { requester: oscar._id, status: 'accepted' },
        { recipient: oscar._id, status: 'accepted' }
      ]
    }).populate('requester recipient', 'name email avatar');
    
    console.log('👥 Oscar\'s links:', links.length);
    links.forEach(link => {
      const linkedUser = link.requester._id.toString() === oscar._id.toString() 
        ? link.recipient 
        : link.requester;
      console.log(`  - Link: ${linkedUser.name} (${linkedUser.email})`);
      console.log(`    Linked since: ${link.acceptedAt}`);
    });

    console.log('\n✅ Link request acceptance test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing link request acceptance:', error);
  } finally {
    mongoose.connection.close();
  }
}

testAcceptRequest();