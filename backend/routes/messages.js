const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');

// @route   POST api/messages
// @desc    Send a message (direct or group)
// @access  Private
router.post('/', [
  auth,
  body('recipient').custom((value, { req }) => {
    // Recipient is required for direct messages, groupId for group messages
    if (!value && !req.body.groupId) {
      throw new Error('Either recipient or groupId is required');
    }
    if (value && req.body.groupId) {
      throw new Error('Cannot specify both recipient and groupId');
    }
    return true;
  }),
  body('content').custom((value, { req }) => {
    // Content is required for non-file messages
    if (req.body.messageType !== 'file' && (!value || value.trim().length === 0)) {
      throw new Error('Message content is required');
    }
    // Content length validation for text messages
    if (value && value.length > 1000) {
      throw new Error('Message content cannot exceed 1000 characters');
    }
    return true;
  }),
  body('messageType', 'Invalid message type').optional().isIn(['text', 'gig_application', 'system', 'file']),
  body('attachment').custom((value, { req }) => {
    // Attachment is required for file messages
    if (req.body.messageType === 'file' && !value) {
      throw new Error('Attachment is required for file messages');
    }
    return true;
  })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recipient, groupId, content, messageType = 'text', attachment, gigApplication } = req.body;
    
    let messageData = {
      sender: req.user.id,
      messageType
    };
    
    if (groupId) {
      // Group message
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ msg: 'Group not found' });
      }
      
      // Check if user is a member of the group
      if (!group.isMember(req.user.id)) {
        return res.status(403).json({ msg: 'You are not a member of this group' });
      }
      
      messageData.groupId = groupId;
    } else {
      // Direct message
      // Prevent sending message to self
      if (recipient === req.user.id) {
        return res.status(400).json({ msg: 'Cannot send message to yourself' });
      }
      
      // Check if recipient exists
      const recipientUser = await User.findById(recipient);
      if (!recipientUser) {
        return res.status(404).json({ msg: 'Recipient not found' });
      }
      
      messageData.recipient = recipient;
    }
    
    // Add content for non-file messages
    if (messageType !== 'file' && content) {
      messageData.content = content.trim();
    }
    
    // Add attachment for file messages
    if (messageType === 'file' && attachment) {
      messageData.attachment = attachment;
    }
    
    // Add gig application data for gig application messages
    if (messageType === 'gig_application' && gigApplication) {
      messageData.gigApplication = gigApplication;
    }
    
    const newMessage = new Message(messageData);
    
    const message = await newMessage.save();
    await message.populate('sender', 'name avatar');
    
    if (message.recipient) {
      await message.populate('recipient', 'name avatar');
    }
    
    if (message.groupId) {
      await message.populate('groupId', 'name avatar members');
    }
    
    res.status(201).json(message);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET api/messages/group/:groupId
// @desc    Get group conversation messages
// @access  Private
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    
    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }
    
    if (!group.isMember(req.user.id)) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const messages = await Message.getGroupConversation(groupId, parseInt(limit), parseInt(skip));
    
    res.json(messages.reverse()); // Reverse to show oldest first
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/messages/conversation/:userId
// @desc    Get conversation between current user and another user
// @access  Private
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Validate userId
    if (!userId || userId === req.user.id) {
      return res.status(400).json({ msg: 'Invalid user ID' });
    }
    
    // Check if the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    const skip = (page - 1) * limit;
    const messages = await Message.getConversation(req.user.id, userId, parseInt(limit), skip);
    
    // Mark messages as read (where current user is recipient)
    await Message.updateMany(
      {
        sender: userId,
        recipient: req.user.id,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );
    
    res.json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET api/messages
// @desc    Get all messages for a user (deprecated - use /conversations instead)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id },
        { recipient: req.user.id }
      ],
      isDeleted: false
    })
    .populate('sender', 'name avatar')
    .populate('recipient', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(100);
    
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET api/messages/conversations
// @desc    Get all conversations for a user (direct and group)
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Message.getUserConversations(req.user.id);
    
    // Transform the aggregation result to match frontend expectations
    const formattedConversations = conversations.map(conv => {
      const lastMessage = conv.lastMessage;
      const senderInfo = conv.senderInfo[0];
      const recipientInfo = conv.recipientInfo[0];
      const groupInfo = conv.groupInfo[0];
      
      if (groupInfo) {
        // Group conversation
        return {
          _id: conv._id, // conversationId
          isGroup: true,
          group: {
            _id: groupInfo._id,
            name: groupInfo.name,
            avatar: groupInfo.avatar || '',
            memberCount: groupInfo.members ? groupInfo.members.length : 0
          },
          lastMessage: {
            _id: lastMessage._id,
            content: lastMessage.content,
            sender: {
              _id: senderInfo._id,
              name: senderInfo.name,
              avatar: senderInfo.avatar || ''
            },
            createdAt: lastMessage.createdAt,
            read: lastMessage.read,
            messageType: lastMessage.messageType
          },
          unreadCount: conv.unreadCount || 0
        };
      } else {
        // Direct conversation
        // Determine the conversation partner (the other user)
        const isCurrentUserSender = lastMessage.sender.toString() === req.user.id;
        const partner = isCurrentUserSender ? recipientInfo : senderInfo;
        
        return {
          _id: conv._id, // conversationId
          isGroup: false,
          user: {
            _id: partner._id,
            name: partner.name,
            avatar: partner.avatar || ''
          },
          lastMessage: {
            _id: lastMessage._id,
            content: lastMessage.content,
            sender: {
              _id: senderInfo._id,
              name: senderInfo.name,
              avatar: senderInfo.avatar || ''
            },
            recipient: {
              _id: recipientInfo._id,
              name: recipientInfo.name,
              avatar: recipientInfo.avatar || ''
            },
            createdAt: lastMessage.createdAt,
            read: lastMessage.read,
            messageType: lastMessage.messageType
          },
          unreadCount: conv.unreadCount || 0
        };
      }
    });
    
    res.json(formattedConversations);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   PUT api/messages/mark-read/:userId
// @desc    Mark all messages in a direct conversation as read
// @access  Private
router.put('/mark-read/:userId', auth, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    
    // Generate conversationId
    const userIds = [req.user.id, otherUserId].sort();
    const conversationId = userIds.join('_');
    
    // Mark all unread messages in this conversation as read
    const result = await Message.updateMany(
      {
        conversationId,
        recipient: req.user.id,
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );
    
    res.json({ 
      msg: 'Messages marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   PUT api/messages/mark-read-group/:groupId
// @desc    Mark all messages in a group conversation as read
// @access  Private
router.put('/mark-read-group/:groupId', auth, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    
    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }
    
    if (!group.isMember(req.user.id)) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    // For group messages, we mark them as read for the current user
    // Note: Group messages don't have a specific recipient, so we need a different approach
    // We could add a readBy array to track who has read each message
    // For now, we'll use a simpler approach and mark based on sender
    const conversationId = `group_${groupId}`;
    
    const result = await Message.updateMany(
      {
        conversationId,
        sender: { $ne: req.user.id }, // Don't mark own messages as read
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );
    
    res.json({ 
      msg: 'Group messages marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   PUT api/messages/:messageId/read
// @desc    Mark a message as read
// @access  Private
router.put('/:messageId/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ msg: 'Message not found' });
    }
    
    // Only the recipient can mark a message as read
    if (message.recipient.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to mark this message as read' });
    }
    
    await message.markAsRead();
    
    res.json({ msg: 'Message marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   DELETE api/messages/:messageId
// @desc    Soft delete a message
// @access  Private
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ msg: 'Message not found' });
    }
    
    // Only the sender can delete a message
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this message' });
    }
    
    message.isDeleted = true;
    message.content = 'This message has been deleted';
    await message.save();
    
    res.json({ msg: 'Message deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;