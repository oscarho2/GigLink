const express = require('express');
const router = express.Router();
const BlogComment = require('../models/BlogComment');
const auth = require('../middleware/auth');
const { assertCleanContent } = require('../utils/moderation');
const { getPublicUrl } = require('../utils/r2Config');

const normalizeComment = (comment) => {
  const commentObj = typeof comment.toObject === 'function' ? comment.toObject() : { ...comment };

  if (commentObj.user) {
    commentObj.user = {
      ...commentObj.user,
      avatar: getPublicUrl(commentObj.user.avatar)
    };
  }

  return commentObj;
};

// @route   GET /api/blog-comments/:slug/comments
// @desc    Get comments for a blog article
// @access  Public
router.get('/:slug/comments', async (req, res) => {
  try {
    const { slug } = req.params;

    const comments = await BlogComment.find({ articleSlug: slug })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.json(comments.map(normalizeComment));
  } catch (error) {
    console.error('Error fetching blog comments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/blog-comments/:slug/comments
// @desc    Add a comment to a blog article
// @access  Private
router.post('/:slug/comments', auth, async (req, res) => {
  try {
    const { slug } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const cleanContent = assertCleanContent(content, { context: 'blog_comment', userId });

    const comment = await BlogComment.create({
      articleSlug: slug,
      user: userId,
      content: cleanContent.trim()
    });

    const populatedComment = await BlogComment.findById(comment._id)
      .populate('user', 'name avatar')
      .lean();

    res.status(201).json(normalizeComment(populatedComment));
  } catch (error) {
    console.error('Error adding blog comment:', error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
        code: error.code
      });
    }

    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/blog-comments/:slug/comments/:commentId
// @desc    Delete a blog comment
// @access  Private
router.delete('/:slug/comments/:commentId', auth, async (req, res) => {
  try {
    const { slug, commentId } = req.params;
    const userId = req.user.id;

    const comment = await BlogComment.findOne({ _id: commentId, articleSlug: slug });

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.user.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await BlogComment.deleteOne({ _id: commentId });

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Error deleting blog comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
