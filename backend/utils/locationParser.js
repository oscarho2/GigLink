
function parseLocation(locationString) {
  if (!locationString) {
    return {
      city: null,
      region: null,
      country: null,
    };
  }

  // Use frontend-formatted string directly
  const parts = locationString.split(', ').reverse();
  let city = null;
  let region = null;
  let country = null;

  if (parts.length === 3) {
    city = parts[0];
    region = parts[1];
    country = parts[2];
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
