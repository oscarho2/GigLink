const getNavigator = () => {
  if (typeof navigator === 'undefined') {
    return null;
  }
  return navigator;
};

export const isIosDevice = () => {
  const nav = getNavigator();
  if (!nav) {
    return false;
  }

  const platform = nav.platform || '';
  const userAgent = nav.userAgent || '';
  const isTouchMac = platform === 'MacIntel' && nav.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(platform) || /iPad|iPhone|iPod/.test(userAgent) || isTouchMac;
};

export const isStandalonePWA = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  const matchMediaStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const navigatorStandalone = window.navigator?.standalone === true;
  return Boolean(matchMediaStandalone || navigatorStandalone);
};

export const isIosInAppBrowser = () => {
  const nav = getNavigator();
  if (!nav || typeof window === 'undefined') {
    return false;
  }

  const platform = nav.platform || '';
  const userAgent = nav.userAgent || '';
  const isIosLike = /iPad|iPhone|iPod/.test(platform) || /iPad|iPhone|iPod/.test(userAgent);
  if (!isIosLike) {
    return false;
  }

  const isSafari = /Safari/i.test(userAgent) && !/CriOS|FxiOS|OPiOS|EdgiOS|DuckDuckGo|GSA|YaBrowser/i.test(userAgent);
  const lacksSafariToken = /AppleWebKit/i.test(userAgent) && !/Safari/i.test(userAgent);
  const hasCapacitorBridge = typeof window.Capacitor !== 'undefined';
  const mentionsAppWrapper = /GigLink/i.test(userAgent) && /Mobile/i.test(userAgent);

  return Boolean(!isSafari || lacksSafariToken || hasCapacitorBridge || mentionsAppWrapper);
};
