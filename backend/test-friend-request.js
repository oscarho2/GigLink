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

async function testLinkRequest() {
  try {
    // Find Jane Smith (sender)
    const jane = await User.findOne({ email: 'jane.smith@example.com' });
    if (!jane) {
      console.log('❌ Jane Smith user not found. Please run create-test-user.js first.');
      return;
    }
    console.log('✅ Found Jane Smith:', jane.name, jane.email);

    // Find Oscar (recipient)
    const oscar = await User.findOne({ email: 'oscar@oscarho.co.uk' });
    if (!oscar) {
      console.log('❌ Oscar user not found. Looking for other users...');
      const users = await User.find({}).select('name email');
      console.log('Available users:');
      users.forEach(user => console.log(`  - ${user.name} (${user.email})`));
      return;
    }
    console.log('✅ Found Oscar:', oscar.name, oscar.email);

    // Check if link request already exists
    const existingLink = await Link.findOne({
      $or: [
        { requester: jane._id, recipient: oscar._id },
        { requester: oscar._id, recipient: jane._id }
      ]
    });

    if (existingLink) {
      console.log('🔗 Existing link found:', {
        status: existingLink.status,
        requester: existingLink.requester.toString() === jane._id.toString() ? 'Jane' : 'Oscar',
        recipient: existingLink.recipient.toString() === jane._id.toString() ? 'Jane' : 'Oscar',
        createdAt: existingLink.createdAt
      });
      
      if (existingLink.status === 'pending') {
        console.log('📋 Link request already exists and is pending.');
        return;
      }
      if (existingLink.status === 'accepted') {
        console.log('👥 Users are already linked.');
        return;
      }
    }

    // Create new link request from Jane to Oscar
    const newLink = new Link({
      requester: jane._id,
      recipient: oscar._id,
      note: 'Hi! I\'d like to connect and collaborate on some music projects. I saw your profile and think we could work well together!'
    });

    await newLink.save();
    console.log('🎉 Link request sent successfully!');
    console.log('📋 Request details:', {
      from: jane.name,
      to: oscar.name,
      note: newLink.note,
      status: newLink.status,
      createdAt: newLink.createdAt
    });

    // Verify the request was created
    const savedLink = await Link.findById(newLink._id)
      .populate('requester', 'name email')
      .populate('recipient', 'name email');
    
    console.log('✅ Verification - Link saved:', {
      id: savedLink._id,
      requester: savedLink.requester.name,
      recipient: savedLink.recipient.name,
      status: savedLink.status
    });

  } catch (error) {
    console.error('❌ Error testing link request:', error);
  } finally {
    mongoose.connection.close();
  }
}

testLinkRequest();