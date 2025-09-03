const express = require('express');
const router = express.Router();
const Link = require('../models/Link');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Send friend request
router.post('/request', auth, async (req, res) => {
  try {
    const { recipientId, note } = req.body;
    const requesterId = req.user.id;

    // Check if trying to add themselves
    if (requesterId === recipientId) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if friendship already exists
    const existingLink = await Link.findFriendship(requesterId, recipientId);
    if (existingLink) {
      if (existingLink.status === 'accepted') {
        return res.status(400).json({ message: 'You are already friends with this user' });
      }
      if (existingLink.status === 'pending') {
        return res.status(400).json({ message: 'Friend request already sent' });
      }
      if (existingLink.status === 'blocked') {
        return res.status(400).json({ message: 'Cannot send friend request to this user' });
      }
    }

    // Create new friend request
    const newLink = new Link({
      requester: requesterId,
      recipient: recipientId,
      note: note || ''
    });

    await newLink.save();
    await newLink.populate('requester recipient', 'name email avatar');

    res.status(201).json({
      message: 'Friend request sent successfully',
      link: newLink
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept friend request
router.put('/accept/:linkId', auth, async (req, res) => {
  try {
    const { linkId } = req.params;
    const userId = req.user.id;

    const link = await Link.findById(linkId);
    if (!link) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Check if user is the recipient
    if (link.recipient.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    // Check if request is still pending
    if (link.status !== 'pending') {
      return res.status(400).json({ message: 'Friend request is no longer pending' });
    }

    await link.accept();
    await link.populate('requester recipient', 'name email avatar');

    res.json({
      message: 'Friend request accepted',
      link: link
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Decline friend request
router.put('/decline/:linkId', auth, async (req, res) => {
  try {
    const { linkId } = req.params;
    const userId = req.user.id;

    const link = await Link.findById(linkId);
    if (!link) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Check if user is the recipient
    if (link.recipient.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to decline this request' });
    }

    // Check if request is still pending
    if (link.status !== 'pending') {
      return res.status(400).json({ message: 'Friend request is no longer pending' });
    }

    await link.decline();
    await link.populate('requester recipient', 'name email avatar');

    res.json({
      message: 'Friend request declined',
      link: link
    });
  } catch (error) {
    console.error('Error declining friend request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove friend/Cancel request
router.delete('/:linkId', auth, async (req, res) => {
  try {
    const { linkId } = req.params;
    const userId = req.user.id;

    const link = await Link.findById(linkId);
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    // Check if user is involved in this friendship
    if (link.requester.toString() !== userId && link.recipient.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to remove this link' });
    }

    await Link.findByIdAndDelete(linkId);

    res.json({ message: 'Link removed successfully' });
  } catch (error) {
    console.error('Error removing link:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Block user
router.put('/block/:linkId', auth, async (req, res) => {
  try {
    const { linkId } = req.params;
    const userId = req.user.id;

    const link = await Link.findById(linkId);
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    // Check if user is involved in this link
    if (link.requester.toString() !== userId && link.recipient.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to block this user' });
    }

    await link.block();
    await link.populate('requester recipient', 'name email avatar');

    res.json({
      message: 'User blocked successfully',
      link: link
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's friends
router.get('/friends', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const friends = await Link.getFriends(userId);

    // Format friends list
    const friendsList = friends.map(link => {
      const friend = link.requester._id.toString() === userId 
        ? link.recipient 
        : link.requester;
      
      return {
        linkId: link._id,
        friend: {
          id: friend._id,
          name: friend.name,
          email: friend.email,
          avatar: friend.avatar
        },
        connectedAt: link.respondedAt || link.createdAt
      };
    });

    res.json({ friends: friendsList });
  } catch (error) {
    console.error('Error getting friends:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pending friend requests (received)
router.get('/requests/pending', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const pendingRequests = await Link.getPendingRequests(userId);

    const requests = pendingRequests.map(link => ({
      linkId: link._id,
      requester: {
        id: link.requester._id,
        name: link.requester.name,
        email: link.requester.email,
        avatar: link.requester.avatar
      },
      note: link.note,
      requestedAt: link.requestedAt
    }));

    res.json({ requests });
  } catch (error) {
    console.error('Error getting pending requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sent friend requests
router.get('/requests/sent', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const sentRequests = await Link.getSentRequests(userId);

    const requests = sentRequests.map(link => ({
      linkId: link._id,
      recipient: {
        id: link.recipient._id,
        name: link.recipient.name,
        email: link.recipient.email,
        avatar: link.recipient.avatar
      },
      note: link.note,
      requestedAt: link.requestedAt
    }));

    res.json({ requests });
  } catch (error) {
    console.error('Error getting sent requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users (for adding friends)
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.id;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    // Search users by name or email
    const users = await User.find({
      _id: { $ne: userId }, // Exclude current user
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('name email avatar').limit(20);

    // Get existing links for these users
    const userIds = users.map(user => user._id);
    const existingLinks = await Link.find({
      $or: [
        { requester: userId, recipient: { $in: userIds } },
        { requester: { $in: userIds }, recipient: userId }
      ]
    });

    // Create a map of existing relationships
    const linkMap = {};
    existingLinks.forEach(link => {
      const otherUserId = link.requester.toString() === userId 
        ? link.recipient.toString() 
        : link.requester.toString();
      linkMap[otherUserId] = link.status;
    });

    // Add relationship status to users
    const usersWithStatus = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      relationshipStatus: linkMap[user._id.toString()] || 'none'
    }));

    res.json({ users: usersWithStatus });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check friendship status
router.get('/status/:userId', auth, async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const userId = req.user.id;

    if (userId === otherUserId) {
      return res.json({ status: 'self' });
    }

    const link = await Link.findFriendship(userId, otherUserId);
    
    if (!link) {
      return res.json({ status: 'none' });
    }

    let status = link.status;
    let role = null;

    if (status === 'pending') {
      role = link.requester.toString() === userId ? 'requester' : 'recipient';
    }

    res.json({ 
      status,
      role,
      linkId: link._id,
      requestedAt: link.requestedAt,
      respondedAt: link.respondedAt
    });
  } catch (error) {
    console.error('Error checking friendship status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;