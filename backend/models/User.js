const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  avatar: {
    type: String
  },
  bio: {
    type: String
  },
  location: {
    type: String
  },
  instruments: [{
    type: String
  }],
  genres: [{
    type: String
  }],
  isMusician: {
    type: String,
    enum: ['yes', 'no'],
    default: ''
  },
  website: {
    type: String
  },
  socialLinks: {
    youtube: String,
    instagram: String,
    facebook: String,
    twitter: String,
    spotify: String,
    soundcloud: String
  },
  isAvailableForGigs: {
    type: Boolean,
    default: true
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// Virtual for getting user's links
UserSchema.virtual('links', {
  ref: 'Link',
  localField: '_id',
  foreignField: 'requester',
  match: { status: 'accepted' }
});

// Virtual for getting user's link requests
UserSchema.virtual('linkRequests', {
  ref: 'Link',
  localField: '_id',
  foreignField: 'recipient',
  match: { status: 'pending' }
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);