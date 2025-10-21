import { useEffect, useState } from 'react';

const getViewportHeight = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window.visualViewport && typeof window.visualViewport.height === 'number') {
    return window.visualViewport.height;
  }

  return window.innerHeight || null;
};

/**
 * Tracks the current viewport height, accounting for mobile browsers that keep
 * `100vh` static while the soft keyboard is visible.
 */
const useViewportHeight = () => {
  const [viewportHeight, setViewportHeight] = useState(() => getViewportHeight());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateViewportHeight = () => {
      const height = getViewportHeight();
      if (height) {
        setViewportHeight(height);
      }
    };

    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight);
      window.visualViewport.addEventListener('scroll', updateViewportHeight);
    }

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportHeight);
        window.visualViewport.removeEventListener('scroll', updateViewportHeight);
      }
    };
  }, []);

  return viewportHeight;
};

export default useViewportHeight;
