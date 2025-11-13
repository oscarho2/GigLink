const mongoose = require('mongoose');

const GigSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    name: { type: String, required: true },
    street: { type: String },
    city: { type: String, required: true },
    region: { type: String },
    country: { type: String, required: true }
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    default: ''
  },
  payment: {
    type: String,
    required: true
  },
  // New: currency code for payment (e.g., GBP, USD, EUR)
  currency: {
    type: String,
    default: 'GBP'
  },
  // New: support multiple schedules (date with start and optional end time)
  schedules: [
    {
      date: { type: String },
      startTime: { type: String },
      endTime: { type: String }
    }
  ],
  instruments: [{
    type: String,
    required: true
  }],
  genres: [{
    type: String
  }],
  requirements: {
    type: String
  },
  contactEmail: {
    type: String
  },
  contactPhone: {
    type: String
  },
  isFilled: {
    type: Boolean,
    default: false
  },
  applicants: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
      },
      message: {
        type: String
      },
      date: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdAt: {
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

GigSchema.index({ moderationStatus: 1, date: 1 });

module.exports = mongoose.model('Gig', GigSchema);
