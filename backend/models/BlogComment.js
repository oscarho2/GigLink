const mongoose = require('mongoose');

const BlogCommentSchema = new mongoose.Schema(
  {
    articleSlug: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    }
  },
  {
    timestamps: true
  }
);

BlogCommentSchema.index({ articleSlug: 1, createdAt: -1 });
BlogCommentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('BlogComment', BlogCommentSchema);
