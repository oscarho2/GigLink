const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: false,
    maxlength: 2000,
    default: ''
  },
  parsedContent: {
    type: String,
    default: ''
  },
  mentions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    originalText: {
      type: String,
      required: true
    }
  }],
  instruments: [{
    type: String,
    trim: true
  }],
  genres: [{
    type: String,
    trim: true
  }],
  media: [{
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    }
  }],
  pinned: {
    type: Boolean,
    default: false
  },
  pinnedAt: {
    type: Date,
    default: null
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 500
    },
    parsedContent: {
      type: String,
      default: ''
    },
    mentions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      username: {
        type: String,
        required: true
      },
      originalText: {
        type: String,
        required: true
      }
    }],
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    pinned: {
      type: Boolean,
      default: false
    },
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true,
        maxlength: 500
      },
      parsedContent: {
        type: String,
        default: ''
      },
      mentions: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        username: {
          type: String,
          required: true
        },
        originalText: {
          type: String,
          required: true
        }
      }],
      likes: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }],
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  moderationStatus: {
    type: String,
    enum: ['visible', 'needs_review', 'blocked'],
    default: 'visible'
  },
  moderationReason: {
    type: String,
    default: ''
  },
  flaggedAt: {
    type: Date,
    default: null
  }
});

// Update the updatedAt field before saving
PostSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isModified('pinned')) {
    this.pinnedAt = this.pinned ? new Date() : null;
  }
  next();
});

// Indexes for better query performance
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ 'likes.user': 1 });
PostSchema.index({ 'comments.user': 1 });
PostSchema.index({ pinned: -1, pinnedAt: -1, createdAt: -1 });
PostSchema.index({ moderationStatus: 1, createdAt: -1 });

// Static method to get posts with populated author and comment users
PostSchema.statics.getPostsWithDetails = async function(limit = 20, skip = 0, filter = {}) {
  return this.find(filter)
    .populate('author', 'name avatar email')
    .populate('comments.user', 'name avatar')
    .populate('likes.user', 'name')
    .sort({ pinned: -1, pinnedAt: -1, createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Helper method to manage likes on any array
PostSchema.methods._manageLike = function(likesArray, userId, action) {
  const userIdStr = userId.toString();
  const existingLikeIndex = likesArray.findIndex(like => like.user.toString() === userIdStr);
  
  if (action === 'add' && existingLikeIndex === -1) {
    likesArray.push({ user: userId });
  } else if (action === 'remove' && existingLikeIndex !== -1) {
    likesArray.splice(existingLikeIndex, 1);
  }
};

// Instance method to add a like
PostSchema.methods.addLike = function(userId) {
  this._manageLike(this.likes, userId, 'add');
  return this.save();
};

// Instance method to remove a like
PostSchema.methods.removeLike = function(userId) {
  this._manageLike(this.likes, userId, 'remove');
  return this.save();
};

// Instance method to add a comment
PostSchema.methods.addComment = function(userId, content, parsedContent = '', mentions = []) {
  this.comments.push({ 
    user: userId, 
    content, 
    parsedContent,
    mentions
  });
  return this.save();
};

// Instance method to remove a comment
PostSchema.methods.removeComment = function(commentId) {
  this.comments = this.comments.filter(comment => comment._id.toString() !== commentId.toString());
  return this.save();
};

// Instance method to add a like to a comment
PostSchema.methods.addCommentLike = function(commentId, userId) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Comment not found');
  
  this._manageLike(comment.likes, userId, 'add');
  return this.save();
};

// Instance method to remove a like from a comment
PostSchema.methods.removeCommentLike = function(commentId, userId) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Comment not found');
  
  this._manageLike(comment.likes, userId, 'remove');
  return this.save();
};

// Instance method to toggle comment pin status
PostSchema.methods.toggleCommentPin = function(commentId) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Comment not found');
  
  comment.pinned = !comment.pinned;
  return this.save();
};

// Instance method to add a reply
PostSchema.methods.addReply = function(commentId, userId, content, parsedContent = '', mentions = []) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Comment not found');
  
  comment.replies.push({ 
    user: userId, 
    content,
    parsedContent,
    mentions
  });
  return this.save();
};

// Instance method to add a like to a reply
PostSchema.methods.addReplyLike = function(commentId, replyId, userId) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Comment not found');
  
  const reply = comment.replies.id(replyId);
  if (!reply) throw new Error('Reply not found');
  
  this._manageLike(reply.likes, userId, 'add');
  return this.save();
};

// Instance method to remove a like from a reply
PostSchema.methods.removeReplyLike = function(commentId, replyId, userId) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Comment not found');
  
  const reply = comment.replies.id(replyId);
  if (!reply) throw new Error('Reply not found');
  
  this._manageLike(reply.likes, userId, 'remove');
  return this.save();
};

module.exports = mongoose.model('Post', PostSchema);
