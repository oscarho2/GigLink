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
    required: function() {
      // Content is required only if no file is attached
      return !this.fileUrl;
    },
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
  delivered: {
    type: Boolean,
    default: false
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'emoji', 'gig_application'],
    default: 'text'
  },
  gigApplication: {
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig'
    },
    gigTitle: String,
    gigVenue: String,
    gigDate: Date,
    gigPayment: Number,
    gigInstruments: [String],
    gigGenres: [String]
  },
  fileUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: null
  },
  mimeType: {
    type: String,
    default: null
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  editedAt: {
    type: Date,
    default: null
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