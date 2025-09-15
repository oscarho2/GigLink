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
  }
});

// Update the updatedAt field before saving
PostSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get posts with populated author and comment users
PostSchema.statics.getPostsWithDetails = async function(limit = 20, skip = 0, filter = {}) {
  return this.find(filter)
    .populate('author', 'name avatar email')
    .populate('comments.user', 'name avatar')
    .populate('likes.user', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Instance method to add a like
PostSchema.methods.addLike = function(userId) {
  const existingLike = this.likes.find(like => like.user.toString() === userId.toString());
  if (!existingLike) {
    this.likes.push({ user: userId });
  }
  return this.save();
};

// Instance method to remove a like
PostSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
  return this.save();
};

// Instance method to add a comment
PostSchema.methods.addComment = function(userId, content) {
  this.comments.push({ user: userId, content });
  return this.save();
};

// Instance method to remove a comment
PostSchema.methods.removeComment = function(commentId) {
  this.comments = this.comments.filter(comment => comment._id.toString() !== commentId.toString());
  return this.save();
};

module.exports = mongoose.model('Post', PostSchema);