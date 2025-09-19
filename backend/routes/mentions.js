const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { extractMentionsForFrontend, searchUsersForMention } = require('../utils/mentionUtils');

// @route   POST /api/mentions/render
// @desc    Process content and mentions for frontend rendering
// @access  Private
router.post('/render', auth, async (req, res) => {
  try {
    const { parsedContent, mentions } = req.body;

    if (!parsedContent) {
      return res.status(400).json({ message: 'Parsed content is required' });
    }

    const result = await extractMentionsForFrontend(parsedContent, mentions || []);
    
    res.json(result);
  } catch (error) {
    console.error('Error rendering mentions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/mentions/search
// @desc    Search users for mention autocomplete
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.length < 1) {
      return res.json([]);
    }

    const users = await searchUsersForMention(query, parseInt(limit));
    
    res.json(users);
  } catch (error) {
    console.error('Error searching users for mentions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;