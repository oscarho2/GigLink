const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get conversations for the authenticated user
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all messages where user is sender or recipient
    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }]
    })
    .populate('sender', 'name email')
    .populate('recipient', 'name email')
    .sort({ createdAt: -1 });
    
    // Group messages by conversation and get latest message for each
    const conversationsMap = new Map();
    
    messages.forEach(message => {
      const conversationId = message.conversationId;
      if (!conversationsMap.has(conversationId)) {
        const otherUser = message.sender._id.toString() === userId ? message.recipient : message.sender;
        conversationsMap.set(conversationId, {
          conversationId,
          otherUser,
          lastMessage: message,
          unreadCount: 0
        });
      }
      
      // Count unread messages for this user
      if (message.recipient._id.toString() === userId && !message.read) {
        conversationsMap.get(conversationId).unreadCount++;
      }
    });
    
    const conversations = Array.from(conversationsMap.values());
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a specific conversation
router.get('/conversation/:otherUserId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.otherUserId;
    
    // Validate other user exists
    const otherUser = await User.findById(otherUserId).select('name email');
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const conversationId = Message.generateConversationId(userId, otherUserId);
    
    const messages = await Message.find({ conversationId })
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: 1 });
    
    // Mark messages as read for the current user
    await Message.updateMany(
      { conversationId, recipient: userId, read: false },
      { read: true }
    );
    
    res.json({
      otherUser,
      messages
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a new message
router.post('/send', auth, async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    const senderId = req.user.id;
    
    // Validate input
    if (!recipientId || !content) {
      return res.status(400).json({ message: 'Recipient and content are required' });
    }
    
    if (content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content cannot be empty' });
    }
    
    if (content.length > 1000) {
      return res.status(400).json({ message: 'Message too long (max 1000 characters)' });
    }
    
    // Validate recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    
    // Cannot send message to yourself
    if (senderId === recipientId) {
      return res.status(400).json({ message: 'Cannot send message to yourself' });
    }
    
    const conversationId = Message.generateConversationId(senderId, recipientId);
    
    const message = new Message({
      sender: senderId,
      recipient: recipientId,
      content: content.trim(),
      conversationId
    });
    
    await message.save();
    
    // Populate sender and recipient info
    await message.populate('sender', 'name email');
    await message.populate('recipient', 'name email');
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread message count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const unreadCount = await Message.countDocuments({
      recipient: userId,
      read: false
    });
    
    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark conversation as read
router.put('/conversation/:otherUserId/read', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.otherUserId;
    
    const conversationId = Message.generateConversationId(userId, otherUserId);
    
    await Message.updateMany(
      { conversationId, recipient: userId, read: false },
      { read: true }
    );
    
    res.json({ message: 'Conversation marked as read' });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;