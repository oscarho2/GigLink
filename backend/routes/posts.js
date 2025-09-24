const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { createNotification } = require('./notifications');
const { parseMentions, getMentionedUserIds } = require('../utils/mentionUtils');
const { upload, getPublicUrl, deleteFile } = require('../utils/r2Config');

// Helper function to add like status and counts to a post object
const addPostLikeStatus = (post, userId) => {
  const postObj = post.toObject();
  postObj.isLikedByUser = post.likes.some(like => like.user._id.toString() === userId);
  postObj.likesCount = post.likes.length;
  postObj.commentsCount = post.comments.length;
  
  // Add like status for each comment
  postObj.comments = postObj.comments.map(comment => {
    const commentObj = {
      ...comment,
      isLikedByUser: comment.likes.some(like => like.user._id.toString() === userId),
      likesCount: comment.likes.length
    };
    
    // Add like status for each reply
    if (comment.replies) {
      commentObj.replies = comment.replies.map(reply => ({
        ...reply,
        isLikedByUser: reply.likes.some(like => like.user._id.toString() === userId),
        likesCount: reply.likes.length
      }));
    }
    
    return commentObj;
  });
  
  return postObj;
};

// Helper function to populate and return post with like status
const getPopulatedPostWithLikeStatus = async (postId, userId) => {
  const post = await Post.findById(postId)
    .populate('author', 'name avatar email')
    .populate('comments.user', 'name avatar')
    .populate('comments.replies.user', 'name avatar')
    .populate('comments.replies.likes.user', 'name')
    .populate('comments.likes.user', 'name')
    .populate('likes.user', 'name');
  
  return addPostLikeStatus(post, userId);
};

// R2 upload configuration is handled in r2Config.js

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', auth, upload.array('media', 5), async (req, res) => {
  try {
    const { content, instruments, genres } = req.body;
    const userId = req.user.id;

    if ((!content || content.trim().length === 0) && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: 'Post content or media is required' });
    }

    // Process uploaded files
    const media = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const mediaType = file.mimetype.startsWith('image/') ? 'image' : 'video';
        media.push({
          type: mediaType,
          url: getPublicUrl(file.key),
          filename: file.key.split('/').pop(),
          key: file.key
        });
      });
    }

    // Parse instruments and genres from form data
    const instrumentArray = instruments ? (Array.isArray(instruments) ? instruments : JSON.parse(instruments || '[]')) : [];
    const genreArray = genres ? (Array.isArray(genres) ? genres : JSON.parse(genres || '[]')) : [];

    // Parse mentions from content
    const mentionData = await parseMentions(content.trim());

    const newPost = new Post({
      author: userId,
      content: mentionData.content,
      parsedContent: mentionData.parsedContent,
      mentions: mentionData.mentions,
      media: media,
      instruments: instrumentArray,
      genres: genreArray
    });

    const savedPost = await newPost.save();
    
    // Populate author details before sending response
    const populatedPost = await Post.findById(savedPost._id)
      .populate('author', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .populate('likes.user', 'name');

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts
// @desc    Get all posts with optional filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { instruments, genres } = req.query;
    
    // Build filter object
    let filter = {};
    if (instruments) {
      const instrumentArray = Array.isArray(instruments) ? instruments : [instruments];
      filter.instruments = { $in: instrumentArray };
    }
    if (genres) {
      const genreArray = Array.isArray(genres) ? genres : [genres];
      filter.genres = { $in: genreArray };
    }

    const posts = await Post.find(filter)
      .populate('author', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .populate('comments.replies.user', 'name avatar')
      .populate('comments.likes.user', 'name')
      .populate('likes.user', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    
    // Add like status for current user
    const postsWithLikeStatus = posts.map(post => addPostLikeStatus(post, req.user.id));

    res.json(postsWithLikeStatus);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts/:postId
// @desc    Get a single post by ID
// @access  Private
router.get('/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await getPopulatedPostWithLikeStatus(postId, userId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts/user/:userId
// @desc    Get posts by specific user
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: userId })
      .populate('author', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .populate('comments.replies.user', 'name avatar')
      .populate('comments.likes.user', 'name')
      .populate('likes.user', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    // Add like status for current user
    const postsWithLikeStatus = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLikedByUser = post.likes.some(like => like.user._id.toString() === req.user.id);
      postObj.likesCount = post.likes.length;
      postObj.commentsCount = post.comments.length;
      
      // Add like status for each comment
      postObj.comments = postObj.comments.map(comment => ({
        ...comment,
        isLikedByUser: comment.likes.some(like => like.user._id.toString() === req.user.id),
        likesCount: comment.likes.length
      }));
      
      return postObj;
    });

    res.json(postsWithLikeStatus);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:postId/like
// @desc    Like a post
// @access  Private
router.post('/:postId/like', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user already liked the post
    const existingLike = post.likes.find(like => like.user.toString() === userId.toString());
    if (existingLike) {
      return res.status(400).json({ message: 'Post already liked' });
    }

    await post.addLike(userId);
    
    // Create notification for post author (if not liking own post)
    // Removed like notifications as per user request
    // if (post.author.toString() !== userId) {
    //   const liker = await User.findById(userId).select('name');
    //   await createNotification(
    //     post.author,
    //     userId,
    //     'like',
    //     `${liker.name} liked your post`,
    //     postId,
    //     'Post',
    //     req
    //   );
    // }
    
    // Return updated post with populated data
    const postObj = await getPopulatedPostWithLikeStatus(postId, userId);
    postObj.isLikedByUser = true;

    res.json(postObj);
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/posts/:postId/like
// @desc    Unlike a post
// @access  Private
router.delete('/:postId/like', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await post.removeLike(userId);
    
    // Return updated post with populated data
    const postObj = await getPopulatedPostWithLikeStatus(postId, userId);
    postObj.isLikedByUser = false;

    res.json(postObj);
  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:postId/comments
// @desc    Add a comment to a post
// @access  Private
router.post('/:postId/comments', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Parse mentions from comment content
    const mentionData = await parseMentions(content.trim());

    await post.addComment(userId, mentionData.content, mentionData.parsedContent, mentionData.mentions);
    
    // Create notification for post author (if not commenting on own post)
    if (post.author.toString() !== userId) {
      const commenter = await User.findById(userId).select('name');
      await createNotification(
        post.author,
        userId,
        'comment',
        `${commenter.name} commented on your post`,
        postId,
        'Post',
        req
      );
    }
    
    // Return updated post with populated data
    const postObj = await getPopulatedPostWithLikeStatus(postId, userId);

    res.json(postObj);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/posts/:postId/comments/:commentId
// @desc    Delete a comment from a post
// @access  Private
router.delete('/:postId/comments/:commentId', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Only allow comment author or post author to delete comment
    if (comment.user.toString() !== userId && post.author.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await post.removeComment(commentId);
    
    // Return updated post with populated data
    const postObj = await getPopulatedPostWithLikeStatus(postId, userId);

    res.json(postObj);
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:postId/comments/:commentId/like
// @desc    Like a comment
// @access  Private
router.post('/:postId/comments/:commentId/like', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    await post.addCommentLike(commentId, userId);
    
    // Return updated post with populated data
    const postObj = await getPopulatedPostWithLikeStatus(postId, userId);

    res.json(postObj);
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/posts/:postId/comments/:commentId/like
// @desc    Unlike a comment
// @access  Private
router.delete('/:postId/comments/:commentId/like', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    await post.removeCommentLike(commentId, userId);
    
    // Return updated post with populated data
    const postObj = await getPopulatedPostWithLikeStatus(postId, userId);

    res.json(postObj);
  } catch (error) {
    console.error('Error unliking comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/posts/:postId/comments/:commentId/pin
// @desc    Toggle pin status of a comment
// @access  Private
router.put('/:postId/comments/:commentId/pin', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Only allow post author to pin/unpin comments
    if (post.author.toString() !== userId) {
      return res.status(403).json({ message: 'Only post author can pin comments' });
    }

    await post.toggleCommentPin(commentId);
    
    // Return updated post with populated data
    const updatedPost = await Post.findById(postId)
      .populate('author', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .populate('comments.replies.user', 'name avatar')
      .populate('comments.likes.user', 'name')
      .populate('likes.user', 'name');

    const postObj = updatedPost.toObject();
    postObj.isLikedByUser = updatedPost.likes.some(like => like.user._id.toString() === userId);
    postObj.likesCount = updatedPost.likes.length;
    postObj.commentsCount = updatedPost.comments.length;
    
    // Add like status for each comment
    postObj.comments = postObj.comments.map(comment => ({
      ...comment,
      isLikedByUser: comment.likes.some(like => like.user._id.toString() === userId),
      likesCount: comment.likes.length
    }));

    res.json(postObj);
  } catch (error) {
    console.error('Error toggling comment pin:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:postId/comments/:commentId/replies
// @desc    Add a reply to a comment
// @access  Private
router.post('/:postId/comments/:commentId/replies', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Reply content is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Parse mentions from reply content
    const mentionData = await parseMentions(content.trim());

    await post.addReply(commentId, userId, mentionData.content, mentionData.parsedContent, mentionData.mentions);
    
    // Return updated post with populated data
    const updatedPost = await Post.findById(postId)
      .populate('author', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .populate('comments.replies.user', 'name avatar')
      .populate('comments.replies.likes.user', 'name')
      .populate('comments.likes.user', 'name')
      .populate('likes.user', 'name');

    const postObj = updatedPost.toObject();
    postObj.isLikedByUser = updatedPost.likes.some(like => like.user._id.toString() === userId);
    postObj.likesCount = updatedPost.likes.length;
    postObj.commentsCount = updatedPost.comments.length;
    
    // Add like status for each comment and reply
    postObj.comments = postObj.comments.map(comment => ({
      ...comment,
      isLikedByUser: comment.likes.some(like => like.user._id.toString() === userId),
      likesCount: comment.likes.length,
      replies: comment.replies.map(reply => ({
        ...reply,
        isLikedByUser: reply.likes.some(like => like.user._id.toString() === userId),
        likesCount: reply.likes.length
      }))
    }));

    res.json(postObj);
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/posts/:postId/comments/:commentId/replies/:replyId/like
// @desc    Like/unlike a reply
// @access  Private
router.put('/:postId/comments/:commentId/replies/:replyId/like', auth, async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reply = comment.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    const existingLike = reply.likes.find(like => like.user.toString() === userId);
    
    if (existingLike) {
      await post.removeReplyLike(commentId, replyId, userId);
    } else {
      await post.addReplyLike(commentId, replyId, userId);
    }
    
    // Return updated post with populated data
    const updatedPost = await Post.findById(postId)
      .populate('author', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .populate('comments.replies.user', 'name avatar')
      .populate('comments.replies.likes.user', 'name')
      .populate('comments.likes.user', 'name')
      .populate('likes.user', 'name');

    const postObj = updatedPost.toObject();
    postObj.isLikedByUser = updatedPost.likes.some(like => like.user._id.toString() === userId);
    postObj.likesCount = updatedPost.likes.length;
    postObj.commentsCount = updatedPost.comments.length;
    
    // Add like status for each comment and reply
    postObj.comments = postObj.comments.map(comment => ({
      ...comment,
      isLikedByUser: comment.likes.some(like => like.user._id.toString() === userId),
      likesCount: comment.likes.length,
      replies: comment.replies.map(reply => ({
        ...reply,
        isLikedByUser: reply.likes.some(like => like.user._id.toString() === userId),
        likesCount: reply.likes.length
      }))
    }));

    res.json(postObj);
  } catch (error) {
    console.error('Error toggling reply like:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/posts/:postId/comments/:commentId/replies/:replyId
// @desc    Delete a reply
// @access  Private
router.delete('/:postId/comments/:commentId/replies/:replyId', auth, async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reply = comment.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    // Check if user is the author of the reply or the post
    if (reply.user.toString() !== userId && post.author.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this reply' });
    }

    // Remove the reply
    comment.replies.pull(replyId);
    await post.save();

    // Return updated post with populated data
    const updatedPost = await Post.findById(postId)
      .populate('author', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .populate('comments.replies.user', 'name avatar')
      .populate('likes.user', 'name');

    // Add like status and counts
    const postObj = updatedPost.toObject();
    postObj.isLikedByUser = updatedPost.likes.some(like => like.user._id.toString() === userId);
    postObj.likesCount = updatedPost.likes.length;
    postObj.commentsCount = updatedPost.comments.length;

    // Add comment like status and reply like status
    postObj.comments = postObj.comments.map(comment => {
      const commentObj = { ...comment };
      commentObj.isLikedByUser = comment.likes.some(like => like.user.toString() === userId);
      commentObj.likesCount = comment.likes.length;
      
      if (comment.replies) {
        commentObj.replies = comment.replies.map(reply => {
          const replyObj = { ...reply };
          replyObj.isLikedByUser = reply.likes.some(like => like.user.toString() === userId);
          replyObj.likesCount = reply.likes.length;
          return replyObj;
        });
      }
      
      return commentObj;
    });

    res.json(postObj);
  } catch (error) {
    console.error('Error deleting reply:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/posts/:postId
// @desc    Delete a post
// @access  Private
router.delete('/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Only allow post author to delete post
    if (post.author.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Delete associated media files from R2
    if (post.media && post.media.length > 0) {
      for (const mediaItem of post.media) {
        if (mediaItem.key) {
          // Use R2 key if available (new format)
          await deleteFile(mediaItem.key);
        } else if (mediaItem.filename) {
          // Legacy format - construct key from filename
          const mediaType = mediaItem.type === 'image' ? 'images' : 'videos';
          const fileKey = `${mediaType}/${mediaItem.filename}`;
          await deleteFile(fileKey);
        }
      }
    }

    await Post.findByIdAndDelete(postId);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;