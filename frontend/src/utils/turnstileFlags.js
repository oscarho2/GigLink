const truthyValues = new Set(['1', 'true', 'yes', 'on']);

const isTruthy = (value) => truthyValues.has(String(value || '').toLowerCase());

const computeTurnstileDisabled = () => {
  if (isTruthy(process.env.REACT_APP_DISABLE_TURNSTILE ?? process.env.REACT_APP_DEV_MODE)) {
    return true;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (!hostname) {
      return false;
    }
    const loweredHost = hostname.toLowerCase();
    if (
      loweredHost === 'localhost' ||
      loweredHost === '127.0.0.1' ||
      loweredHost === '0.0.0.0' ||
      loweredHost.endsWith('.local')
    ) {
      return true;
    }
  }

  return false;
};

export const TURNSTILE_DEV_BYPASS_TOKEN = 'bypass';

export const isTurnstileDisabled = () => computeTurnstileDisabled();

