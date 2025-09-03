const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Mock data for messages
let mockMessages = [
  {
    _id: '1',
    sender: { _id: '1', name: 'John Doe' },
    recipient: { _id: '2', name: 'Jane Smith' },
    content: 'Hey! I saw your gig posting for a guitarist. I\'d love to apply!',
    read: false,
    createdAt: new Date('2024-01-15T10:30:00Z')
  },
  {
    _id: '2',
    sender: { _id: '2', name: 'Jane Smith' },
    recipient: { _id: '1', name: 'John Doe' },
    content: 'Hi John! Thanks for your interest. Can you tell me more about your experience?',
    read: true,
    createdAt: new Date('2024-01-15T11:00:00Z')
  },
  {
    _id: '3',
    sender: { _id: '1', name: 'John Doe' },
    recipient: { _id: '2', name: 'Jane Smith' },
    content: 'I\'ve been playing guitar for 8 years and have experience with rock, blues, and jazz.',
    read: false,
    createdAt: new Date('2024-01-15T11:15:00Z')
  }
];

// Mock users for reference
const mockUsers = [
  { _id: '1', name: 'John Doe' },
  { _id: '2', name: 'Jane Smith' },
  { _id: '3', name: 'Mike Johnson' }
];

// @route   POST api/messages
// @desc    Send a message
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { recipient, content } = req.body;
    
    // Check if recipient exists in mock users
    const recipientUser = mockUsers.find(user => user._id === recipient);
    if (!recipientUser) {
      return res.status(404).json({ msg: 'Recipient not found' });
    }
    
    // Find sender in mock users
    const senderUser = mockUsers.find(user => user._id === req.user.id);
    if (!senderUser) {
      return res.status(404).json({ msg: 'Sender not found' });
    }
    
    const newMessage = {
      _id: (mockMessages.length + 1).toString(),
      sender: { _id: req.user.id, name: senderUser.name },
      recipient: { _id: recipient, name: recipientUser.name },
      content,
      read: false,
      createdAt: new Date()
    };
    
    mockMessages.push(newMessage);
    
    res.json(newMessage);
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
    // Filter messages where user is sender or recipient
    const userMessages = mockMessages.filter(message => 
      message.sender._id === req.user.id || message.recipient._id === req.user.id
    );
    
    // Sort by creation date (newest first)
    const sortedMessages = userMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(sortedMessages);
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
    const userMessages = mockMessages.filter(message => 
      message.sender._id === req.user.id || message.recipient._id === req.user.id
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Extract unique conversation partners
    const conversations = {};
    
    userMessages.forEach(message => {
      const conversationPartnerId = 
        message.sender._id === req.user.id 
          ? message.recipient._id 
          : message.sender._id;
      
      if (!conversations[conversationPartnerId]) {
        conversations[conversationPartnerId] = {
          lastMessage: message,
          unreadCount: message.recipient._id === req.user.id && !message.read ? 1 : 0
        };
      } else if (message.recipient._id === req.user.id && !message.read) {
        conversations[conversationPartnerId].unreadCount++;
      }
    });
    
    // Map user details to conversations
    const conversationsWithUserDetails = Object.keys(conversations).map(partnerId => {
      const partner = mockUsers.find(user => user._id === partnerId);
      return {
        user: partner,
        lastMessage: conversations[partnerId].lastMessage,
        unreadCount: conversations[partnerId].unreadCount
      };
    }).filter(conv => conv.user); // Filter out conversations where user is not found
    
    res.json(conversationsWithUserDetails);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;