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
  appleId: {
    type: String,
    unique: true,
    sparse: true
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
  locationData: {
    country: {
      type: String,
      default: ''
    },
    region: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    }
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
    default: 'no'
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
  notificationPreferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: false
    },
    commentNotifications: {
      type: Boolean,
      default: true
    },
    messageNotifications: {
      type: Boolean,
      default: true
    },
    gigResponseNotifications: {
      type: Boolean,
      default: true
    },
    gigApplicationNotifications: {
      type: Boolean,
      default: true
    },
    gigPostedNotifications: {
      type: Boolean,
      default: true
    },
    gigPostedOnlyMyInstruments: {
      type: Boolean,
      default: true
    },
    linkRequestNotifications: {
      type: Boolean,
      default: true
    },
    likeNotifications: {
      type: Boolean,
      default: true
    }
  },
  pushSubscriptions: [{
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    }
  }],
  apnsDevices: [{
    deviceToken: {
      type: String,
      required: true
    },
    environment: {
      type: String,
      enum: ['sandbox', 'production'],
      default: 'production'
    },
    bundleId: String,
    appVersion: String,
    deviceModel: String,
    osVersion: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    }
  }],
  fcmTokens: [{
    token: {
      type: String,
      required: true
    },
    deviceModel: String,
    osVersion: String,
    appVersion: String,
    bundleId: String,
    platform: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  suspendedAt: {
    type: Date
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
