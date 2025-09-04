const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient conversation queries
messageSchema.index({ conversationId: 1, createdAt: -1 });

// Index for unread message queries
messageSchema.index({ recipient: 1, read: 1 });

// Static method to generate conversation ID
messageSchema.statics.generateConversationId = function(userId1, userId2) {
  // Sort IDs to ensure consistent conversation ID regardless of order
  const sortedIds = [userId1.toString(), userId2.toString()].sort();
  return sortedIds.join('_');
};

// Instance method to mark as read
messageSchema.methods.markAsRead = function() {
  this.read = true;
  return this.save();
};

module.exports = mongoose.model('Message', messageSchema);