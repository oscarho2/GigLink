const mongoose = require('mongoose');

const REPORT_REASONS = [
  'spam',
  'harassment',
  'hate_speech',
  'inappropriate',
  'misinformation',
  'self_harm',
  'other'
];

const GigReportSchema = new mongoose.Schema({
  gig: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: true
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    enum: REPORT_REASONS,
    required: true
  },
  details: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed'],
    default: 'pending'
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

GigReportSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

GigReportSchema.index({ gig: 1, reporter: 1 }, { unique: true });

GigReportSchema.statics.REPORT_REASONS = REPORT_REASONS;

module.exports = mongoose.model('GigReport', GigReportSchema);
