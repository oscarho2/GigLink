const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

// @route   POST api/messages
// @desc    Send a message
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { recipient, content } = req.body;
    
    // Check if recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({ msg: 'Recipient not found' });
    }
    
    const newMessage = new Message({
      sender: req.user.id,
      recipient,
      content
    });
    
    const message = await newMessage.save();
    await message.populate(['sender', 'recipient'], 'name avatar');
    
    res.json(message);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/messages
// @desc    Get all messages for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id },
        { recipient: req.user.id }
      ]
    })
    .populate('sender', 'name avatar')
    .populate('recipient', 'name avatar')
    .sort({ createdAt: -1 });
    
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/messages/conversations
// @desc    Get all conversations for a user
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    // Get all messages where user is sender or recipient
    const userMessages = await Message.find({
      $or: [
        { sender: req.user.id },
        { recipient: req.user.id }
      ]
    })
    .populate('sender', 'name avatar')
    .populate('recipient', 'name avatar')
    .sort({ createdAt: -1 });
    
    // Extract unique conversation partners
    const conversations = {};
    
    userMessages.forEach(message => {
      const conversationPartnerId = 
        message.sender._id.toString() === req.user.id 
          ? message.recipient._id.toString() 
          : message.sender._id.toString();
      
      if (!conversations[conversationPartnerId]) {
        const partner = message.sender._id.toString() === req.user.id ? message.recipient : message.sender;
        conversations[conversationPartnerId] = {
          user: partner,
          lastMessage: message,
          unreadCount: message.recipient._id.toString() === req.user.id && !message.read ? 1 : 0
        };
      } else if (message.recipient._id.toString() === req.user.id && !message.read) {
        conversations[conversationPartnerId].unreadCount++;
      }
    });
    
    // Convert to array
    const conversationsArray = Object.values(conversations);
    
    res.json(conversationsArray);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;