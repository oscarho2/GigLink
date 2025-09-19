const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { createNotification } = require('./notifications');
const { parseMentions, getMentionedUserIds } = require('../utils/mentionUtils');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/messages');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for message file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed file types for messages
  const allowedTypes = {
    // Images
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    // Documents
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'application/vnd.ms-excel': true,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
    'application/vnd.ms-powerpoint': true,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
    'text/plain': true,
    'text/csv': true,
    'application/rtf': true,
    // Audio
    'audio/mpeg': true,
    'audio/wav': true,
    'audio/mp3': true,
    // Video
    'video/mp4': true,
    'video/mpeg': true,
    'video/quicktime': true
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, audio, and video files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for documents and media
  }
});

// Get conversations for the authenticated user
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('GET /conversations called for user:', userId);
    
    // Get all messages where user is sender or recipient
    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }]
    })
    .populate('sender', 'name email avatar')
    .populate('recipient', 'name email avatar')
    .sort({ createdAt: -1 });
    
    console.log('Found messages:', messages.length);
    
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
      } else {
        // Update with more recent message if this one is newer
        const existingConversation = conversationsMap.get(conversationId);
        if (new Date(message.createdAt) > new Date(existingConversation.lastMessage.createdAt)) {
          existingConversation.lastMessage = message;
        }
      }
      
      // Count unread messages for this user
      if (message.recipient._id.toString() === userId && !message.read) {
        conversationsMap.get(conversationId).unreadCount++;
      }
    });
    
    // Sort conversations by last message timestamp (most recent first)
    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
    console.log('Returning conversations:', conversations.length);
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    console.log('GET /conversation called for user:', userId, 'with otherUser:', otherUserId, 'page:', page, 'limit:', limit);
    
    // Validate other user exists
    const otherUser = await User.findById(otherUserId).select('name email avatar');
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const conversationId = Message.generateConversationId(userId, otherUserId);
    console.log('Generated conversationId:', conversationId);
    
    // Get total count for pagination info
    const totalMessages = await Message.countDocuments({ conversationId });
    
    // Fetch messages with pagination (most recent first, then reverse for display)
    const messages = await Message.find({ conversationId })
      .populate('sender', 'name email avatar')
      .populate('recipient', 'name email avatar')
      .populate({
        path: 'replyTo',
        select: 'content sender createdAt',
        populate: {
          path: 'sender',
          select: 'name email avatar'
        }
      })
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limit);
    
    // Reverse to show oldest to newest in the returned batch
    const reversedMessages = messages.reverse();
    
    console.log('Found messages for conversation:', reversedMessages.length, 'of', totalMessages, 'total');
    
    // Mark messages as read for the current user (only for first page)
    if (page === 1) {
      await Message.updateMany(
        { conversationId, recipient: userId, read: false },
        { read: true }
      );
    }
    
    // Return messages with pagination info
    res.json({
      messages: reversedMessages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
        hasMore: page < Math.ceil(totalMessages / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload file for message
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/api/messages/files/${req.file.filename}`;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    res.json({
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Server error during file upload' });
  }
});

// Serve uploaded files
router.get('/files/:filename', auth, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  res.sendFile(filePath);
});

// Send a new message
router.post('/send', auth, async (req, res) => {
  console.log('POST /send called, body:', req.body);
  try {
    const { recipientId, content, messageType = 'text', fileUrl = null, fileName = null, fileSize = null, mimeType = null, gigApplication = null, replyTo = null } = req.body;
    const senderId = req.user.id;
    
    // Validate input
    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient is required' });
    }
    
    // Either content or file must be provided
    if (!content && !fileUrl) {
      return res.status(400).json({ message: 'Message content or file is required' });
    }
    
    if (content && content.trim().length === 0 && !fileUrl) {
      return res.status(400).json({ message: 'Message content cannot be empty' });
    }
    
    if (content && content.length > 1000) {
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
    
    // Parse mentions from message content
    let mentionData = { content: '', parsedContent: '', mentions: [] };
    if (content && content.trim()) {
      mentionData = await parseMentions(content.trim());
    }
    
    const message = new Message({
      sender: senderId,
      recipient: recipientId,
      content: mentionData.content || '',
      parsedContent: mentionData.parsedContent || '',
      mentions: mentionData.mentions || [],
      conversationId,
      messageType,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      replyTo,
      ...(messageType === 'gig_application' && gigApplication ? { gigApplication } : {})
    });
    
    await message.save();
    
    // Populate sender and recipient info
    await message.populate('sender', 'name email');
    await message.populate('recipient', 'name email');
    if (message.replyTo) {
      await message.populate({
        path: 'replyTo',
        select: 'content sender createdAt',
        populate: {
          path: 'sender',
          select: 'name email'
        }
      });
    }
    
    // Create notification for message recipient
    await createNotification(
      recipientId,
      senderId,
      'message',
      `${message.sender.name} sent you a message`,
      senderId, // Use sender ID so notification can open conversation with sender
      'Message',
      req
    );
    
    // Emit real-time message to conversation participants
    const io = req.app.get('io');
    if (io) {
      io.to(conversationId).emit('new_message', message);
      io.to(recipientId).emit('conversation_update', {
        conversationId,
        lastMessage: message,
        unreadCount: 1
      });
    }
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    if (error && error.stack) {
      console.error('Error stack:', error.stack);
    }
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

// Add reaction to message
router.post('/:messageId/react', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;
    
    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      reaction => reaction.user.toString() === userId && reaction.emoji === emoji
    );
    
    if (existingReaction) {
      // Remove reaction
      message.reactions = message.reactions.filter(
        reaction => !(reaction.user.toString() === userId && reaction.emoji === emoji)
      );
    } else {
      // Add reaction
      message.reactions.push({ user: userId, emoji });
    }
    
    await message.save();
    await message.populate('reactions.user', 'name email');
    
    // Emit real-time reaction update
    const io = req.app.get('io');
    if (io) {
      io.to(message.conversationId).emit('message_reaction', { 
        messageId: message._id, 
        reactions: message.reactions 
      });
    }
    
    res.json(message.reactions);
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update message status (delivered/read)
router.put('/:messageId/status', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body; // 'delivered' or 'read'
    const userId = req.user.id;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Only recipient can update message status
    if (message.recipient.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (status === 'delivered') {
      message.delivered = true;
    } else if (status === 'read') {
      message.read = true;
      message.delivered = true;
    }
    
    await message.save();
    
    // Emit real-time status update
    const io = req.app.get('io');
    if (io) {
      io.to(message.conversationId).emit('message_status_update', {
        messageId,
        status,
        delivered: message.delivered,
        read: message.read
      });
    }
    
    res.json({ delivered: message.delivered, read: message.read });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;