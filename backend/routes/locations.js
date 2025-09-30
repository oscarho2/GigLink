const express = require('express');
const router = express.Router();

if (typeof fetch !== 'function') {
  global.fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

const GOOGLE_PLACES_API_KEY = (process.env.GOOGLE_PLACES_API_KEY || '').trim();

const fetchWithTimeout = async (url, options = {}, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
};

const findComponent = (components, types) => {
  if (!Array.isArray(components)) return null;
  const typeList = Array.isArray(types) ? types : [types];
  return components.find(component => Array.isArray(component.types) && component.types.some(t => typeList.includes(t))) || null;
};

const buildLocationPayload = (place, placeId) => {
  const components = place?.address_components || [];
  const streetNumberComp = findComponent(components, 'street_number');
  const routeComp = findComponent(components, 'route');
  const cityComp = findComponent(components, ['locality', 'postal_town', 'sublocality', 'sublocality_level_1']);
  const regionComp = findComponent(components, 'administrative_area_level_1');
  const regionFallbackComp = findComponent(components, 'administrative_area_level_2');
  const countryComp = findComponent(components, 'country');

  const streetNumber = streetNumberComp?.long_name || streetNumberComp?.short_name || '';
  const route = routeComp?.long_name || routeComp?.short_name || '';
  const city = cityComp?.long_name || cityComp?.short_name || '';
  const region = regionComp?.long_name || regionComp?.short_name || regionFallbackComp?.long_name || regionFallbackComp?.short_name || '';
  const country = countryComp?.short_name || countryComp?.long_name || '';
  const formattedAddress = place?.formatted_address || components.map(c => c.long_name).filter(Boolean).join(', ');
  const street = [streetNumber, route].filter(Boolean).join(' ').trim();

  const nameParts = [];
  if (place?.name) nameParts.push(place.name);
  if (formattedAddress) nameParts.push(formattedAddress);
  const name = nameParts
    .map(part => part.trim())
    .filter((part, index, arr) => part && arr.findIndex(existing => existing.toLowerCase() === part.toLowerCase()) === index)
    .join(', ');

  const location = {
    placeId: placeId || place?.place_id || '',
    name: name || formattedAddress || place?.name || '',
    street,
    city,
    region,
    country,
    formattedAddress: formattedAddress || '',
    coordinates: {
      lat: place?.geometry?.location?.lat ?? null,
      lng: place?.geometry?.location?.lng ?? null
    }
  };

  return location;
};

router.post('/resolve', async (req, res) => {
  try {
    const { place_id: placeId } = req.body || {};
    if (!placeId || typeof placeId !== 'string') {
      return res.status(400).json({ message: 'place_id is required' });
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({ message: 'Google Places API key is not configured on the server' });
    }

    const params = new URLSearchParams();
    params.set('place_id', placeId);
    params.set('fields', 'name,address_component,formatted_address,geometry,place_id');
    params.set('key', GOOGLE_PLACES_API_KEY);

    const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;

    const response = await fetchWithTimeout(url, {}, 6000);
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return res.status(502).json({ message: 'Failed to fetch place details', status: response.status, body: errorText });
    }

    const data = await response.json();
    if (data.status !== 'OK' || !data.result) {
      return res.status(502).json({ message: 'Place details request did not return a valid result', status: data.status, error_message: data.error_message });
    }

    const location = buildLocationPayload(data.result, placeId);
    return res.json({ location, raw: process.env.NODE_ENV === 'development' ? data.result : undefined });
  } catch (error) {
    console.error('Error resolving place_id:', error);
    return res.status(500).json({ message: 'Server error resolving location', error: error.message });
  }
});

module.exports = router;
