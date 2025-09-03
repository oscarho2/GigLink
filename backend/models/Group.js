const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  avatar: {
    type: String,
    default: ''
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    }
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  maxMembers: {
    type: Number,
    default: 100,
    min: 2,
    max: 500
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

// Create indexes for better query performance
GroupSchema.index({ admin: 1 });
GroupSchema.index({ 'members.user': 1 });
GroupSchema.index({ name: 'text', description: 'text' });

// Pre-save middleware to update timestamps
GroupSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance method to add member
GroupSchema.methods.addMember = function(userId, role = 'member') {
  // Check if user is already a member
  const existingMember = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('User is already a member of this group');
  }
  
  // Check if group is at capacity
  if (this.members.length >= this.maxMembers) {
    throw new Error('Group is at maximum capacity');
  }
  
  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date()
  });
  
  return this.save();
};

// Instance method to remove member
GroupSchema.methods.removeMember = function(userId) {
  // Cannot remove admin
  if (this.admin.toString() === userId.toString()) {
    throw new Error('Cannot remove group admin');
  }
  
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );
  
  return this.save();
};

// Instance method to check if user is member
GroupSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString()
  ) || this.admin.toString() === userId.toString();
};

// Instance method to check if user is admin
GroupSchema.methods.isAdmin = function(userId) {
  return this.admin.toString() === userId.toString() ||
    this.members.some(member => 
      member.user.toString() === userId.toString() && member.role === 'admin'
    );
};

// Static method to get user's groups
GroupSchema.statics.getUserGroups = function(userId) {
  return this.find({
    $or: [
      { admin: userId },
      { 'members.user': userId }
    ]
  })
  .populate('admin', 'name avatar')
  .populate('members.user', 'name avatar')
  .sort({ updatedAt: -1 });
};

module.exports = mongoose.model('Group', GroupSchema);