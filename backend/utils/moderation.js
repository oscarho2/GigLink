const fs = require('fs/promises');
const path = require('path');
const { sendModerationAlertEmail } = require('./emailService');

const MODERATION_LOG_PATH = path.join(__dirname, '..', 'logs', 'moderation-alerts.log');
const ALERT_EMAIL_FALLBACK = process.env.MODERATION_ALERT_EMAILS || process.env.SAFETY_EMAIL || process.env.ADMIN_EMAIL || '';

const HOMOGLYPH_MAP = new Map([
  ['0', 'o'],
  ['1', 'i'],
  ['!', 'i'],
  ['3', 'e'],
  ['4', 'a'],
  ['@', 'a'],
  ['5', 's'],
  ['$', 's'],
  ['7', 't'],
  ['8', 'b'],
  ['9', 'g'],
  ['€', 'e'],
  ['£', 'l'],
  ['¥', 'y']
]);

const MODERATION_RULES = [
  {
    key: 'sexual_exploitation',
    severity: 'critical',
    description: 'Sexual exploitation of minors or CSAE references',
    regex: /\b(?:csae|child\s*(?:porn|abuse|molestation|grooming|sex)|minor\s*(?:sex|nude|porn|naked)|cp\b)\b/i
  },
  {
    key: 'hate_speech',
    severity: 'high',
    description: 'Hate speech or extremist propaganda',
    regex: /\b(?:nazi|white\s*power|heil\s*hitler|kkk|neo-?nazi|racist|supremacy|nigger|nigga|chink|spic|faggot|kike)\b/i
  },
  {
    key: 'threats',
    severity: 'high',
    description: 'Credible threats or incitement of violence',
    regex: /\b(?:kill(?:\s+myself|\s+you|\s+them)?|shoot\s*(?:up)?|bomb\s*(?:threat)?|terrorist|behead|murder|rape)\b/i
  },
  {
    key: 'self_harm',
    severity: 'high',
    description: 'Self-harm or suicide ideation',
    regex: /\b(?:self[\s-]*harm|kill\s+myself|commit\s+suicide|suicidal|cutting\s+myself|end\s+my\s+life)\b/i
  },
  {
    key: 'sexual_content',
    severity: 'medium',
    description: 'Explicit sexual solicitation',
    regex: /\b(?:onlyfans|nsfw|sext(?:ing)?|porn(?:hub)?|x[-\s]?rated|send\s+nudes?|nude\s+pics?)\b/i
  },
  {
    key: 'profanity',
    severity: 'low',
    description: 'Profanity or harassing language',
    keywords: ['fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dickhead', 'slut', 'whore']
  }
];

const sanitizeUserText = (value) => {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeForAnalysis = (value) => {
  if (!value) return '';
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s{2,}/g, ' ');

  return normalized
    .split('')
    .map(char => {
      const lower = char.toLowerCase();
      return HOMOGLYPH_MAP.get(lower) || lower;
    })
    .join('');
};

const analyzeText = (input, meta = {}) => {
  const sanitizedText = sanitizeUserText(input);
  if (!sanitizedText) {
    return {
      sanitizedText,
      normalizedText: '',
      condensedText: '',
      isFlagged: false,
      matches: []
    };
  }

  const normalizedText = normalizeForAnalysis(sanitizedText);
  const condensedText = normalizedText.replace(/[^a-z0-9]/g, '');
  const matches = [];

  for (const rule of MODERATION_RULES) {
    let hit = false;
    let sample = null;

    if (rule.regex && rule.regex.test(normalizedText)) {
      hit = true;
      const exec = normalizedText.match(rule.regex);
      sample = exec ? exec[0] : null;
    } else if (Array.isArray(rule.keywords)) {
      for (const keyword of rule.keywords) {
        const cleanKeyword = keyword.replace(/[^a-z0-9]/g, '');
        if (
          normalizedText.includes(keyword) ||
          (cleanKeyword && condensedText.includes(cleanKeyword))
        ) {
          hit = true;
          sample = keyword;
          break;
        }
      }
    }

    if (hit) {
      matches.push({
        key: rule.key,
        severity: rule.severity,
        description: rule.description,
        sample,
        context: meta.context || null
      });
    }
  }

  return {
    sanitizedText,
    normalizedText,
    condensedText,
    isFlagged: matches.length > 0,
    matches
  };
};

const buildModerationError = (analysis, meta = {}) => {
  const detail = analysis.matches[0];
  const error = new Error(detail?.key === 'profanity'
    ? 'Please remove profanity before posting.'
    : 'Content violates our community guidelines.');
  error.statusCode = 400;
  error.code = 'CONTENT_MODERATION_BLOCKED';
  error.meta = {
    context: meta.context || null,
    matches: analysis.matches
  };
  return error;
};

const assertCleanContent = (text, meta = {}) => {
  const analysis = analyzeText(text, meta);
  if (analysis.isFlagged) {
    throw buildModerationError(analysis, meta);
  }
  return analysis.sanitizedText;
};

const ensureLogDirectory = async () => {
  try {
    await fs.mkdir(path.dirname(MODERATION_LOG_PATH), { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error('Failed to ensure moderation log directory:', err);
    }
  }
};

const persistModerationAlert = async (payload) => {
  await ensureLogDirectory();
  const logLine = JSON.stringify({
    ...payload,
    loggedAt: new Date().toISOString()
  });
  await fs.appendFile(MODERATION_LOG_PATH, `${logLine}\n`, 'utf8');
};

const queueModerationAlert = async (alert = {}) => {
  const payload = {
    severity: alert.severity || 'medium',
    reportId: alert.reportId || null,
    contentType: alert.contentType || 'unknown',
    contentId: alert.contentId || null,
    reporter: alert.reporter || null,
    reporterEmail: alert.reporterEmail || null,
    reason: alert.reason || 'unspecified',
    details: alert.details || '',
    snapshot: alert.snapshot || null,
    flaggedAt: alert.flaggedAt || new Date().toISOString()
  };

  try {
    await persistModerationAlert(payload);
  } catch (err) {
    console.error('Failed to persist moderation alert:', err);
  }

  try {
    if (ALERT_EMAIL_FALLBACK || process.env.MODERATION_ALERT_EMAILS) {
      await sendModerationAlertEmail(payload);
    }
  } catch (err) {
    console.error('Failed to send moderation alert email:', err);
  }

  return payload;
};

module.exports = {
  analyzeText,
  assertCleanContent,
  queueModerationAlert,
  sanitizeUserText,
  MODERATION_RULES
};
