export const isAndroid = () => {
    return typeof window !== 'undefined' && /android/i.test(window.navigator.userAgent);
};

export const isIOS = () => {
    return typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !window.MSStream;
};

export const isPWA = () => {
    return typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
};
