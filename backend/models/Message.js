const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
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
  messageType: {
    type: String,
    enum: ['text', 'gig_application', 'system'],
    default: 'text'
  },
  conversationId: {
    type: String,
    index: true,
    default: function() {
      if (this.sender && this.recipient) {
        const userIds = [this.sender.toString(), this.recipient.toString()].sort();
        return userIds.join('_');
      }
      return undefined;
    }
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound indexes for better query performance
MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ recipient: 1, read: 1 });

// Pre-save middleware to update timestamps and generate conversationId
MessageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Generate conversationId if not exists (sorted user IDs for consistency)
  if (!this.conversationId) {
    const userIds = [this.sender.toString(), this.recipient.toString()].sort();
    this.conversationId = userIds.join('_');
  }
  
  next();
});

// Instance method to mark message as read
MessageSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to get conversation between two users
MessageSchema.statics.getConversation = function(userId1, userId2, limit = 50, skip = 0) {
  const userIds = [userId1.toString(), userId2.toString()].sort();
  const conversationId = userIds.join('_');
  
  return this.find({
    conversationId,
    isDeleted: false
  })
  .populate('sender', 'name avatar')
  .populate('recipient', 'name avatar')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Static method to get all conversations for a user
MessageSchema.statics.getUserConversations = function(userId) {
  return this.aggregate([
    {
      $match: {
        $or: [{ sender: new mongoose.Types.ObjectId(userId) }, { recipient: new mongoose.Types.ObjectId(userId) }],
        isDeleted: false
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$recipient', new mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$read', false] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'lastMessage.sender',
        foreignField: '_id',
        as: 'senderInfo'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'lastMessage.recipient',
        foreignField: '_id',
        as: 'recipientInfo'
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    }
  ]);
};

module.exports = mongoose.model('Message', MessageSchema);