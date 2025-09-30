const SCRIPT_ID = 'google-maps-script';
let loadPromise = null;

export function loadGoogleMapsScript(apiKey) {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    loadPromise = new Promise((resolve, reject) => {
      const onLoad = () => {
        existing.removeEventListener('load', onLoad);
        existing.removeEventListener('error', onError);
        resolve();
      };
      const onError = (event) => {
        existing.removeEventListener('load', onLoad);
        existing.removeEventListener('error', onError);
        reject(event);
      };
      existing.addEventListener('load', onLoad);
      existing.addEventListener('error', onError);
    });
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    if (!apiKey) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (event) => reject(event);
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function getPlacesService() {
  if (typeof window === 'undefined' || !window.google || !window.google.maps || !window.google.maps.places) {
    return null;
  }
  return new window.google.maps.places.PlacesService(document.createElement('div'));
}
