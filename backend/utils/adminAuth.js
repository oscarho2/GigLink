const DEFAULT_ADMIN_EMAILS = [
  'oscar@oscarho.co.uk'
];

const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

const buildAdminEmailSet = () => {
  const envEmails = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map(normalizeEmail).filter(Boolean)
    : [];

  const combined = new Set(DEFAULT_ADMIN_EMAILS.map(normalizeEmail));
  envEmails.forEach((email) => combined.add(email));
  return combined;
};

const ADMIN_EMAIL_SET = buildAdminEmailSet();

const isAdminEmail = (email) => ADMIN_EMAIL_SET.has(normalizeEmail(email));

module.exports = {
  isAdminEmail
};
