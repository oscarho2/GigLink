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
      .sort({ createdAt: -1 })
      .populate('sender', ['name', 'avatar'])
      .populate('recipient', ['name', 'avatar']);
    
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
    const messages = await Message.find({
      $or: [
        { sender: req.user.id },
        { recipient: req.user.id }
      ]
    }).sort({ createdAt: -1 });
    
    // Extract unique conversation partners
    const conversations = {};
    
    messages.forEach(message => {
      const conversationPartnerId = 
        message.sender.toString() === req.user.id 
          ? message.recipient.toString() 
          : message.sender.toString();
      
      if (!conversations[conversationPartnerId]) {
        conversations[conversationPartnerId] = {
          lastMessage: message,
          unreadCount: message.recipient.toString() === req.user.id && !message.read ? 1 : 0
        };
      } else if (message.recipient.toString() === req.user.id && !message.read) {
        conversations[conversationPartnerId].unreadCount++;
      }
    });
    
    // Get user details for conversation partners
    const conversationPartnerIds = Object.keys(conversations);
    const conversationPartners = await User.find({
      _id: { $in: conversationPartnerIds }
    }).select('name avatar');
    
    // Map user details to conversations
    const conversationsWithUserDetails = conversationPartners.map(partner => ({
      user: partner,
      lastMessage: conversations[partner._id.toString()].lastMessage,
      unreadCount: conversations[partner._id.toString()].unreadCount
    }));
    
    res.json(conversationsWithUserDetails);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;