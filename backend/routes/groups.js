const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for group avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/group-avatars/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'group-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Create a new group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPrivate, maxMembers } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    
    const group = new Group({
      name: name.trim(),
      description: description?.trim() || '',
      admin: req.user.id,
      isPrivate: isPrivate || false,
      maxMembers: maxMembers || 100,
      members: [{
        user: req.user.id,
        role: 'admin',
        joinedAt: new Date()
      }]
    });
    
    await group.save();
    await group.populate('admin', 'name avatar');
    await group.populate('members.user', 'name avatar');
    
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Get user's groups
router.get('/my-groups', auth, async (req, res) => {
  try {
    const groups = await Group.getUserGroups(req.user.id);
    res.json(groups);
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get group details
router.get('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('admin', 'name avatar')
      .populate('members.user', 'name avatar');
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is a member
    if (!group.isMember(req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Update group details
router.put('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is admin
    if (!group.isAdmin(req.user.id)) {
      return res.status(403).json({ error: 'Only admins can update group details' });
    }
    
    const { name, description, isPrivate, maxMembers } = req.body;
    
    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (isPrivate !== undefined) group.isPrivate = isPrivate;
    if (maxMembers) {
      if (maxMembers < group.members.length) {
        return res.status(400).json({ error: 'Cannot set max members below current member count' });
      }
      group.maxMembers = maxMembers;
    }
    
    await group.save();
    await group.populate('admin', 'name avatar');
    await group.populate('members.user', 'name avatar');
    
    res.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Upload group avatar
router.post('/:groupId/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is admin
    if (!group.isAdmin(req.user.id)) {
      return res.status(403).json({ error: 'Only admins can update group avatar' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    group.avatar = `/uploads/group-avatars/${req.file.filename}`;
    await group.save();
    
    res.json({ avatar: group.avatar });
  } catch (error) {
    console.error('Error uploading group avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Add member to group
router.post('/:groupId/members', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if current user is admin
    if (!group.isAdmin(req.user.id)) {
      return res.status(403).json({ error: 'Only admins can add members' });
    }
    
    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await group.addMember(userId);
    await group.populate('admin', 'name avatar');
    await group.populate('members.user', 'name avatar');
    
    // Send system message about new member
    const systemMessage = new Message({
      sender: req.user.id,
      groupId: group._id,
      content: `${targetUser.name} joined the group`,
      messageType: 'system'
    });
    await systemMessage.save();
    
    res.json(group);
  } catch (error) {
    console.error('Error adding member:', error);
    if (error.message.includes('already a member') || error.message.includes('maximum capacity')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove member from group
router.delete('/:groupId/members/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const targetUserId = req.params.userId;
    
    // Check if current user is admin or removing themselves
    if (!group.isAdmin(req.user.id) && req.user.id !== targetUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await group.removeMember(targetUserId);
    await group.populate('admin', 'name avatar');
    await group.populate('members.user', 'name avatar');
    
    // Send system message about member leaving
    const systemMessage = new Message({
      sender: req.user.id,
      groupId: group._id,
      content: `${targetUser.name} left the group`,
      messageType: 'system'
    });
    await systemMessage.save();
    
    res.json(group);
  } catch (error) {
    console.error('Error removing member:', error);
    if (error.message.includes('Cannot remove group admin')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Join group (for public groups)
router.post('/:groupId/join', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    if (group.isPrivate) {
      return res.status(403).json({ error: 'Cannot join private group without invitation' });
    }
    
    await group.addMember(req.user.id);
    await group.populate('admin', 'name avatar');
    await group.populate('members.user', 'name avatar');
    
    // Send system message about new member
    const systemMessage = new Message({
      sender: req.user.id,
      groupId: group._id,
      content: `${req.user.name} joined the group`,
      messageType: 'system'
    });
    await systemMessage.save();
    
    res.json(group);
  } catch (error) {
    console.error('Error joining group:', error);
    if (error.message.includes('already a member') || error.message.includes('maximum capacity')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// Leave group
router.post('/:groupId/leave', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    await group.removeMember(req.user.id);
    
    // Send system message about member leaving
    const systemMessage = new Message({
      sender: req.user.id,
      groupId: group._id,
      content: `${req.user.name} left the group`,
      messageType: 'system'
    });
    await systemMessage.save();
    
    res.json({ message: 'Successfully left the group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    if (error.message.includes('Cannot remove group admin')) {
      return res.status(400).json({ error: 'Group admin cannot leave. Transfer admin role first.' });
    }
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// Delete group
router.delete('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is admin
    if (!group.isAdmin(req.user.id)) {
      return res.status(403).json({ error: 'Only admins can delete the group' });
    }
    
    // Delete all group messages
    await Message.deleteMany({ groupId: group._id });
    
    // Delete the group
    await Group.findByIdAndDelete(req.params.groupId);
    
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Search public groups
router.get('/search/:query', auth, async (req, res) => {
  try {
    const query = req.params.query;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const groups = await Group.find({
      $and: [
        { isPrivate: false },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .populate('admin', 'name avatar')
    .limit(20)
    .sort({ createdAt: -1 });
    
    res.json(groups);
  } catch (error) {
    console.error('Error searching groups:', error);
    res.status(500).json({ error: 'Failed to search groups' });
  }
});

module.exports = router;