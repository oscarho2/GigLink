const { normalizeLocation } = require('./location');

function parseLocation(locationString) {
  if (!locationString || typeof locationString !== 'string') {
    return {
      city: '',
      region: '',
      country: '',
    };
  }

  const normalized = normalizeLocation(locationString);
  if (!normalized) {
    return {
      city: '',
      region: '',
      country: '',
    };
  }

  const parts = normalized
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  let city = '';
  let region = '';
  let country = '';

  if (parts.length >= 3) {
    const offset = parts.length - 3;
    city = parts[offset];
    region = parts[offset + 1];
    country = parts[offset + 2];
  } else if (parts.length === 2) {
    city = parts[0];
    country = parts[1];
  } else if (parts.length === 1) {
    country = parts[0];
  }

  return {
    city,
    region,
    country,
  };
}

module.exports = { parseLocation };
