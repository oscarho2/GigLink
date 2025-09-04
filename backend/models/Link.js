const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'blocked'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  },
  note: {
    type: String,
    maxlength: 200
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate link requests
linkSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Instance methods
linkSchema.methods.accept = function() {
  this.status = 'accepted';
  this.respondedAt = new Date();
  return this.save();
};

linkSchema.methods.decline = function() {
  this.status = 'declined';
  this.respondedAt = new Date();
  return this.save();
};

linkSchema.methods.block = function() {
  this.status = 'blocked';
  this.respondedAt = new Date();
  return this.save();
};

// Static methods
linkSchema.statics.findLink = function(userId1, userId2) {
  return this.findOne({
    $or: [
      { requester: userId1, recipient: userId2 },
      { requester: userId2, recipient: userId1 }
    ]
  });
};

linkSchema.statics.getLinks = function(userId) {
  return this.find({
    $or: [
      { requester: userId, status: 'accepted' },
      { recipient: userId, status: 'accepted' }
    ]
  }).populate('requester recipient', 'name email avatar');
};

linkSchema.statics.getPendingRequests = function(userId) {
  return this.find({
    recipient: userId,
    status: 'pending'
  }).populate('requester', 'name email avatar');
};

linkSchema.statics.getSentRequests = function(userId) {
  return this.find({
    requester: userId,
    status: 'pending'
  }).populate('recipient', 'name email avatar');
};

linkSchema.statics.areLinked = function(userId1, userId2) {
  return this.findOne({
    $or: [
      { requester: userId1, recipient: userId2, status: 'accepted' },
      { requester: userId2, recipient: userId1, status: 'accepted' }
    ]
  });
};

module.exports = mongoose.model('Link', linkSchema);