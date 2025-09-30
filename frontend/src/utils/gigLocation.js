import { buildLocationFromDescription } from './locationParsing';

const US_STATE_MAP = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming'
}; 

const normalizeCountry = (value = '') => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  if (upper === 'GB' || upper === 'UK' || upper === 'UNITED KINGDOM' || upper === 'GREAT BRITAIN') return 'UK';
  return trimmed.length === 2 ? upper : trimmed;
};

const sanitizeSegment = (value = '') => {
  if (!value) return '';
  let result = String(value);

  // Remove complex alphanumeric postal codes (e.g., UK, Canada)
  result = result.replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi, '');
  result = result.replace(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/gi, '');

  const segments = result
    .split(',')
    .map(segment => {
      const words = segment
        .split(/\s+/)
        .filter(Boolean);
      const filtered = words.filter((word, idx) => {
        const normalized = word.replace(/[^A-Za-z0-9-]/g, '');
        if (!normalized) return false;
        const isNumericPostal = /^\d{4,6}$/.test(normalized);
        const isPlusFour = /^\d{5}-\d{4}$/.test(normalized);
        // Remove purely numeric postal codes when they appear at the end of the segment.
        if ((isNumericPostal || isPlusFour) && idx >= words.length - 1) {
          return false;
        }
        return true;
      });
      return filtered.join(' ');
    })
    .filter(Boolean);

  result = segments.join(', ');

  return result
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/^,\s*/, '')
    .replace(/,\s*$/, '')
    .trim();
};

const dedupeSegments = (segments) => {
  const seen = new Set();
  const result = [];
  for (const segment of segments) {
    if (!segment) continue;
    const key = segment.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(segment);
  }
  return result;
};

export const buildGigLocation = ({
  venueName = '',
  street = '',
  city = '',
  region = '',
  country = '',
}) => {
  const cleanVenue = sanitizeSegment(venueName);
  const cleanStreet = sanitizeSegment(street);
  let cleanCity = sanitizeSegment(city);
  let cleanRegion = sanitizeSegment(region);
  let cleanCountry = normalizeCountry(sanitizeSegment(country));

  if (!cleanCity && cleanRegion) {
    cleanCity = cleanRegion;
    cleanRegion = '';
  }

  if (cleanRegion && cleanCity && cleanRegion.toLowerCase() === cleanCity.toLowerCase()) {
    cleanRegion = '';
  }

  if (cleanCountry) {
    const countryLower = cleanCountry.toLowerCase();
    if (countryLower === 'uk') {
      cleanRegion = '';
    } else if (countryLower === 'us' || countryLower === 'usa' || countryLower === 'united states') {
      if (cleanRegion && cleanRegion.length === 2) {
        const mapped = US_STATE_MAP[cleanRegion.toUpperCase()];
        if (mapped) cleanRegion = mapped;
      }
    }
  }

  const segments = dedupeSegments([
    cleanVenue,
    cleanStreet,
    cleanCity,
    cleanRegion,
    cleanCountry,
  ]);

  const storedStreet = cleanStreet || ' ';

  const name = segments.join(', ');

  return {
    name,
    street: storedStreet,
    city: cleanCity,
    region: cleanRegion,
    country: cleanCountry,
  };
};

export const buildGigLocationFromFreeform = (rawInput = '') => {
  const sanitized = sanitizeSegment(rawInput);
  if (!sanitized) {
    return {
      name: '',
      street: '',
      city: '',
      region: '',
      country: '',
    };
  }

  const parts = sanitized.split(',').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) {
    return {
      name: sanitized,
      street: '',
      city: '',
      region: '',
      country: '',
    };
  }

  const [venueName, ...rest] = parts;
  const remainder = rest.join(', ');
  const parsed = buildLocationFromDescription(remainder);

  let street = parsed.street || (rest.length ? rest[0] : '');
  let city = parsed.city;
  let region = parsed.region;
  let country = parsed.country;

  if (!city && region) {
    city = region;
    region = '';
  }

  if (region && city && region.toLowerCase() === city.toLowerCase()) {
    region = '';
  }

  if (country) {
    let normalizedCountry = normalizeCountry(country);
    const countryLower = normalizedCountry.toLowerCase();
    if (countryLower === 'uk') {
      region = '';
    } else if (countryLower === 'us' || countryLower === 'usa' || countryLower === 'united states') {
      if (region && region.length === 2) {
        const mapped = US_STATE_MAP[region.toUpperCase()];
        if (mapped) region = mapped;
      }
    }
    country = normalizedCountry;
  }

  const location = buildGigLocation({
    venueName,
    street,
    city,
    region,
    country,
  });

  location.name = sanitized;

  return location;
};

export const stripPostalCodes = sanitizeSegment;

export const getLocationDisplayName = (location) => {
  if (!location) return '';
  if (typeof location === 'string') return location.trim();

  const name = (location.name || '').trim();
  if (name) return name;

  const street = sanitizeSegment(location.street);
  const city = sanitizeSegment(location.city);
  const region = sanitizeSegment(location.region);
  const country = normalizeCountry(sanitizeSegment(location.country));

  const segments = dedupeSegments([
    street,
    city,
    region,
    country
  ]).filter(Boolean);

  return segments.join(', ');
};
