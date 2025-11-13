const normalizeReason = (value = '') => {
  if (typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
};

const REPORT_SEVERITY_MAP = {
  spam: 'low',
  harassment: 'medium',
  hate_speech: 'high',
  inappropriate: 'medium',
  misinformation: 'medium',
  self_harm: 'critical',
  other: 'low'
};

const AUTO_HIDE_REASONS = new Set(['hate_speech', 'self_harm']);
const CONDITIONAL_HIDE_REASONS = new Set(['harassment', 'inappropriate']);
const AUTO_SUSPEND_REASONS = new Set(['hate_speech', 'self_harm']);

const mapReasonToSeverity = (reason) => REPORT_SEVERITY_MAP[reason] || 'medium';

const shouldAutoHideContent = (reason, pendingCount = 1) => {
  if (AUTO_HIDE_REASONS.has(reason)) return true;
  if (CONDITIONAL_HIDE_REASONS.has(reason)) {
    return pendingCount > 1;
  }
  return false;
};

const shouldAutoSuspendUser = (reason, pendingCount = 1) => {
  if (AUTO_SUSPEND_REASONS.has(reason)) return true;
  return pendingCount > 2 && reason === 'harassment';
};

module.exports = {
  normalizeReason,
  mapReasonToSeverity,
  shouldAutoHideContent,
  shouldAutoSuspendUser
};
