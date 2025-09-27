// Cloudflare Turnstile helpers: lazy-load, render (invisible), execute, reset

let scriptLoading = null;

const loadScript = () => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptLoading) return scriptLoading;

  scriptLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });
  return scriptLoading;
};

let widgetId = null;
let lastResolve = null;

export const ensureInvisibleTurnstile = async ({ containerId, siteKey }) => {
  await loadScript();
  if (!window.turnstile) return null;
  if (widgetId !== null) return widgetId;

  widgetId = window.turnstile.render(`#${containerId}`, {
    sitekey: siteKey,
    size: 'invisible',
    callback: (token) => {
      if (typeof lastResolve === 'function') {
        const r = lastResolve;
        lastResolve = null;
        r(token);
      }
    },
    'error-callback': () => {
      if (typeof lastResolve === 'function') {
        const r = lastResolve;
        lastResolve = null;
        r(null);
      }
    },
    'expired-callback': () => {
      // Token expired; next execute will fetch a fresh one
    },
  });
  return widgetId;
};

export const executeTurnstile = async () => {
  if (!window.turnstile || widgetId === null) return null;
  return new Promise((resolve) => {
    lastResolve = resolve;
    try {
      window.turnstile.execute(widgetId);
    } catch (e) {
      resolve(null);
    }
  });
};

export const resetTurnstile = () => {
  if (window.turnstile && widgetId !== null) {
    try { window.turnstile.reset(widgetId); } catch (_) {}
  }
};

