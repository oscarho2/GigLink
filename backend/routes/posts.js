const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { createNotification } = require('./notifications');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/posts');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

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
          url: `/uploads/posts/${file.filename}`,
          filename: file.filename
        });
      });
    }

    // Parse instruments and genres from form data
    const instrumentArray = instruments ? (Array.isArray(instruments) ? instruments : JSON.parse(instruments || '[]')) : [];
    const genreArray = genres ? (Array.isArray(genres) ? genres : JSON.parse(genres || '[]')) : [];

    const newPost = new Post({
      author: userId,
      content: content.trim(),
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

    const posts = await Post.getPostsWithDetails(limit, skip, filter);
    
    // Add like status for current user
    const postsWithLikeStatus = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLikedByUser = post.likes.some(like => like.user._id.toString() === req.user.id);
      postObj.likesCount = post.likes.length;
      postObj.commentsCount = post.comments.length;
      return postObj;
    });

    res.json(postsWithLikeStatus);
  } catch (error) {
    console.error('Error fetching posts:', error);
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
    if (post.author.toString() !== userId) {
      const liker = await User.findById(userId).select('name');
      await createNotification(
        post.author,
        userId,
        'like',
        `${liker.name} liked your post`,
        postId,
        'Post',
        req
      );
    }
    
    // Return updated post with populated data
    const updatedPost = await Post.findById(postId)
      .populate('author', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .populate('likes.user', 'name');

    const postObj = updatedPost.toObject();
    postObj.isLikedByUser = true;
    postObj.likesCount = updatedPost.likes.length;
    postObj.commentsCount = updatedPost.comments.length;

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
    const updatedPost = await Post.findById(postId)
      .populate('author', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .populate('likes.user', 'name');

    const postObj = updatedPost.toObject();
    postObj.isLikedByUser = false;
    postObj.likesCount = updatedPost.likes.length;
    postObj.commentsCount = updatedPost.comments.length;

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

    await post.addComment(userId, content.trim());
    
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
    const updatedPost = await Post.findById(postId)
      .populate('author', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .populate('likes.user', 'name');

    const postObj = updatedPost.toObject();
    postObj.isLikedByUser = updatedPost.likes.some(like => like.user._id.toString() === userId);
    postObj.likesCount = updatedPost.likes.length;
    postObj.commentsCount = updatedPost.comments.length;

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
    const updatedPost = await Post.findById(postId)
      .populate('author', 'name avatar email')
      .populate('comments.user', 'name avatar')
      .populate('likes.user', 'name');

    const postObj = updatedPost.toObject();
    postObj.isLikedByUser = updatedPost.likes.some(like => like.user._id.toString() === userId);
    postObj.likesCount = updatedPost.likes.length;
    postObj.commentsCount = updatedPost.comments.length;

    res.json(postObj);
  } catch (error) {
    console.error('Error deleting comment:', error);
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

    // Delete associated media files
    if (post.media && post.media.length > 0) {
      post.media.forEach(mediaItem => {
        const filePath = path.join(__dirname, '../uploads/posts', mediaItem.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    await Post.findByIdAndDelete(postId);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;