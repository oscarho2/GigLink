const mongoose = require('mongoose');
require('dotenv').config();
const Message = require('./models/Message');
const User = require('./models/User');

const deleteTestMessages = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    // Find Jane and Oscar
    const jane = await User.findOne({ email: 'jane.smith@example.com' });
    const oscar = await User.findOne({ email: 'oscar.ho@example.com' });

    if (!jane || !oscar) {
      console.log('Jane or Oscar not found');
      return;
    }

    console.log('Jane ID:', jane._id);
    console.log('Oscar ID:', oscar._id);

    // Delete all messages between Jane and Oscar
    const deleteResult = await Message.deleteMany({
      $or: [
        { sender: jane._id, recipient: oscar._id },
        { sender: oscar._id, recipient: jane._id }
      ]
    });

    console.log(`Deleted ${deleteResult.deletedCount} messages between Jane and Oscar`);

  } catch (error) {
    console.error('Error deleting messages:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

deleteTestMessages();