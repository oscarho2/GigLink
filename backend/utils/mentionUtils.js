const User = require('../models/User');

/**
 * Parse mentions from text content and convert @username to user IDs
 * @param {string} content - The text content containing mentions
 * @returns {Object} - Object containing parsed content and mention data
 */
const parseMentions = async (content) => {
  if (!content || typeof content !== 'string') {
    return {
      content,
      mentions: [],
      parsedContent: content
    };
  }

  // Regex to find @username mentions (alphanumeric, underscore, hyphen, spaces)
  const mentionRegex = /@([a-zA-Z0-9_\s-]+)/g;
  const mentions = [];
  const foundUsernames = [];
  let match;

  // Extract all mentioned usernames
  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1];
    if (!foundUsernames.includes(username)) {
      foundUsernames.push(username);
    }
  }

  if (foundUsernames.length === 0) {
    return {
      content,
      mentions: [],
      parsedContent: content
    };
  }

  // Find users by username (case-insensitive)
  const users = await User.find({
    name: { $in: foundUsernames.map(name => new RegExp(`^${name}$`, 'i')) }
  }).select('_id name');

  // Create mention objects with user IDs
  let parsedContent = content;
  foundUsernames.forEach(username => {
    const user = users.find(u => u.name.toLowerCase() === username.toLowerCase());
    if (user) {
      mentions.push({
        userId: user._id,
        username: user.name,
        originalText: `@${username}`
      });
      
      // Replace @username with a placeholder that includes the user ID
      const placeholder = `@[${user.name}](${user._id})`;
      const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`@${escapedUsername}(?=\\s|$|[^a-zA-Z0-9])`, 'gi');
      parsedContent = parsedContent.replace(regex, placeholder);
    }
  });

  return {
    content,
    mentions,
    parsedContent
  };
};

/**
 * Render mentions in content by replacing user ID placeholders with current usernames
 * @param {string} parsedContent - Content with mention placeholders
 * @param {Array} mentions - Array of mention objects
 * @returns {string} - Content with current usernames
 */
const renderMentions = async (parsedContent, mentions = []) => {
  if (!parsedContent || !mentions.length) {
    return parsedContent;
  }

  let renderedContent = parsedContent;
  
  // Get current user data for all mentioned users
  const userIds = mentions.map(mention => mention.userId);
  const users = await User.find({ _id: { $in: userIds } }).select('_id name');
  
  // Replace placeholders with current usernames
  mentions.forEach(mention => {
    const user = users.find(u => u._id.toString() === mention.userId.toString());
    if (user) {
      const placeholder = `@[${mention.username}](${mention.userId})`;
      const currentMention = `@${user.name}`;
      renderedContent = renderedContent.replace(placeholder, currentMention);
    }
  });

  return renderedContent;
};

/**
 * Extract mention data for frontend rendering with profile links
 * @param {string} parsedContent - Content with mention placeholders
 * @param {Array} mentions - Array of mention objects
 * @returns {Object} - Object with rendered content and mention metadata
 */
const extractMentionsForFrontend = async (parsedContent, mentions = []) => {
  if (!parsedContent || !mentions.length) {
    return {
      content: parsedContent,
      mentionData: []
    };
  }

  let renderedContent = parsedContent;
  const mentionData = [];
  
  // Get current user data for all mentioned users
  const userIds = mentions.map(mention => mention.userId);
  const users = await User.find({ _id: { $in: userIds } }).select('_id name avatar');
  
  // Replace placeholders and collect mention metadata
  mentions.forEach(mention => {
    const user = users.find(u => u._id.toString() === mention.userId.toString());
    if (user) {
      const placeholder = `@[${mention.username}](${mention.userId})`;
      const mentionId = `mention-${mention.userId}`;
      const mentionSpan = `<span class="mention" data-user-id="${mention.userId}" id="${mentionId}">@${user.name}</span>`;
      
      renderedContent = renderedContent.replace(placeholder, mentionSpan);
      
      mentionData.push({
        userId: mention.userId,
        username: user.name,
        avatar: user.avatar,
        mentionId
      });
    }
  });

  return {
    content: renderedContent,
    mentionData
  };
};

/**
 * Get users mentioned in content for notifications
 * @param {Array} mentions - Array of mention objects
 * @returns {Array} - Array of user IDs that were mentioned
 */
const getMentionedUserIds = (mentions = []) => {
  return mentions.map(mention => mention.userId);
};

/**
 * Search users for mention autocomplete
 * @param {string} query - Search query (partial username)
 * @param {number} limit - Maximum number of results
 * @returns {Array} - Array of user objects for autocomplete
 */
const searchUsersForMention = async (query, limit = 10) => {
  if (!query || query.length < 1) {
    return [];
  }

  const users = await User.find({
    name: { $regex: query, $options: 'i' }
  })
  .select('_id name avatar')
  .limit(limit)
  .sort({ name: 1 });

  return users;
};

module.exports = {
  parseMentions,
  renderMentions,
  extractMentionsForFrontend,
  getMentionedUserIds,
  searchUsersForMention
};