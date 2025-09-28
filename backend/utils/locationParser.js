
const { AsYouTypeFormatter } = require('google-libphonenumber');

function parseLocation(locationString) {
  if (!locationString) {
    return {
      city: null,
      region: null,
      country: null,
    };
  }

  const formatter = new AsYouTypeFormatter('US');
  let formatted = '';
  for (let i = 0; i < locationString.length; i++) {
    formatted = formatter.inputDigit(locationString[i]);
  }

  const parts = formatted.split(' ');
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
