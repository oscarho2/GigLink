const INSTALL_PROMPT_KEY = '__giglinkDeferredInstallPrompt';
const INSTALL_TRACKING_KEY = '__giglinkInstallTrackingInitialized';

export const PWA_INSTALL_AVAILABLE_EVENT = 'giglink:pwa-install-available';
export const PWA_INSTALLED_EVENT = 'giglink:pwa-installed';

export const initializePwaInstallTracking = () => {
  if (typeof window === 'undefined' || window[INSTALL_TRACKING_KEY]) {
    return;
  }

  window[INSTALL_TRACKING_KEY] = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window[INSTALL_PROMPT_KEY] = event;
    window.dispatchEvent(new CustomEvent(PWA_INSTALL_AVAILABLE_EVENT));
  });

  window.addEventListener('appinstalled', () => {
    window[INSTALL_PROMPT_KEY] = null;
    window.dispatchEvent(new CustomEvent(PWA_INSTALLED_EVENT));
  });
};

export const getDeferredInstallPrompt = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window[INSTALL_PROMPT_KEY] || null;
};

export const clearDeferredInstallPrompt = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window[INSTALL_PROMPT_KEY] = null;
};
