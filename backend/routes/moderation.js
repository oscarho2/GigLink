const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const PostReport = require('../models/PostReport');
const GigReport = require('../models/GigReport');
const Post = require('../models/Post');
const Gig = require('../models/Gig');
const User = require('../models/User');

const REPORT_MODELS = {
  posts: {
    Report: PostReport,
    Content: Post,
    ownerField: 'author'
  },
  gigs: {
    Report: GigReport,
    Content: Gig,
    ownerField: 'user'
  }
};

const sanitizeNotes = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.trim().slice(0, 1000);
};

router.get('/reports', auth, requireAdmin, async (req, res) => {
  try {
    const { type = 'all', status = 'pending' } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const fetchPosts = async () => {
      if (type !== 'all' && type !== 'posts') return [];
      return PostReport.find({ status })
        .sort({ dueAt: 1 })
        .limit(limit)
        .populate('post', 'content author moderationStatus')
        .populate('reporter', 'name email');
    };

    const fetchGigs = async () => {
      if (type !== 'all' && type !== 'gigs') return [];
      return GigReport.find({ status })
        .sort({ dueAt: 1 })
        .limit(limit)
        .populate('gig', 'title user moderationStatus')
        .populate('reporter', 'name email');
    };

    const [posts, gigs] = await Promise.all([fetchPosts(), fetchGigs()]);

    res.json({
      posts,
      gigs,
      total: posts.length + gigs.length
    });
  } catch (error) {
    console.error('Error fetching moderation reports:', error);
    res.status(500).json({ message: 'Failed to load moderation queue' });
  }
});

router.put('/reports/:type/:reportId/action', auth, requireAdmin, async (req, res) => {
  try {
    const { type, reportId } = req.params;
    const { action, notes } = req.body;
    const normalizedAction = (action || '').trim();

    if (!['mark_safe', 'remove_content', 'suspend_user'].includes(normalizedAction)) {
      return res.status(400).json({ message: 'Invalid moderation action' });
    }

    const context = REPORT_MODELS[type];
    if (!context) {
      return res.status(400).json({ message: 'Unsupported report type' });
    }

    const report = await context.Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const content = await context.Content.findById(report[type.slice(0, -1)]);
    if (!content) {
      return res.status(404).json({ message: 'Content already removed' });
    }

    const now = new Date();
    const adminNotes = sanitizeNotes(notes);

    if (normalizedAction === 'mark_safe') {
      content.moderationStatus = 'visible';
      content.moderationReason = '';
      content.flaggedAt = null;
      await content.save();
      report.actionTaken = 'none';
    } else if (normalizedAction === 'remove_content') {
      content.moderationStatus = 'blocked';
      content.moderationReason = `admin_${report.reason}`;
      content.flaggedAt = now;
      await content.save();
      report.actionTaken = 'removed';
    } else if (normalizedAction === 'suspend_user') {
      content.moderationStatus = 'blocked';
      content.moderationReason = `admin_${report.reason}`;
      content.flaggedAt = now;
      await content.save();
      const ownerId = content[context.ownerField];
      if (ownerId) {
        await User.findByIdAndUpdate(ownerId, {
          accountStatus: 'suspended',
          suspendedAt: now
        });
      }
      report.actionTaken = 'user_suspended';
    }

    report.status = 'reviewed';
    report.resolvedAt = now;
    report.updatedAt = now;
    report.adminNotes = adminNotes;

    await report.save();

    res.json({ report });
  } catch (error) {
    console.error('Error acting on moderation report:', error);
    res.status(500).json({ message: 'Failed to update report status' });
  }
});

module.exports = router;
