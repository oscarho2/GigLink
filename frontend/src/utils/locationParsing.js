import { formatLocationString } from './text';

const getComponentValue = (components, typeCandidates) => {
  if (!Array.isArray(components)) return '';
  const candidates = Array.isArray(typeCandidates) ? typeCandidates : [typeCandidates];
  for (const candidate of candidates) {
    const match = components.find((component) => Array.isArray(component.types) && component.types.includes(candidate));
    if (match) return match.long_name || '';
  }
  return '';
};

const STRIP_POSTCODE_REGEXES = [
  /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi, // UK style
  /\b\d{5}(?:-\d{4})?\b/g // US ZIP (5 or ZIP+4)
];

const UK_REGION_NAMES = new Set(['england', 'scotland', 'wales', 'northern ireland', 'greater london']);
const REGION_KEYWORD_REGEX = /( county| state| province| region| territory| prefecture)$/i;

const cleanSegment = (segment) => {
  if (!segment) return '';
  let result = segment.trim();
  for (const regex of STRIP_POSTCODE_REGEXES) {
    result = result.replace(regex, '').trim();
  }
  return result.replace(/\s{2,}/g, ' ').trim();
};

const stripLeadingNumber = (value) => {
  if (!value) return '';
  const match = value.trim().match(/^\d+[\s,-]+(.+)$/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return value.trim();
};

const isRegionCandidate = (segment, country) => {
  if (!segment) return false;
  const lower = segment.toLowerCase();
  if (UK_REGION_NAMES.has(lower)) return true;
  if (/^\d/.test(segment)) return false;
  if (REGION_KEYWORD_REGEX.test(segment)) return true;
  if (/^[A-Z]{2}$/.test(segment)) {
    const countryLower = (country || '').toLowerCase();
    if (countryLower.includes('united states') || countryLower.includes('usa') || countryLower.includes('canada')) {
      return true;
    }
  }
  return false;
};

const isTwoLetterCode = (value) => /^[A-Z]{2}$/.test(value);

const isCityCandidate = (segment, country) => {
  if (!segment) return false;
  if (/^\d/.test(segment)) return false;
  const upper = segment.toUpperCase();
  const countryLower = (country || '').toLowerCase();
  if (isTwoLetterCode(upper)) {
    if (countryLower.includes('united states') || countryLower.includes('usa') || countryLower.includes('canada')) {
      return false;
    }
  }
  if (UK_REGION_NAMES.has(segment.toLowerCase())) return false;
  if (REGION_KEYWORD_REGEX.test(segment)) return false;
  return true;
};

export const buildLocationFromDescription = (description) => {
  const formatted = formatLocationString(description || '');
  const segments = formatted.split(',').map((part) => part.trim()).filter(Boolean);
  const primaryName = segments[0] || formatted;

  if (!segments.length) {
    return {
      name: formatted,
      street: '',
      city: '',
      region: '',
      country: ''
    };
  }

  if (segments.length === 1) {
    const only = cleanSegment(segments[0]) || segments[0].trim();
    return {
      name: formatted,
      street: '',
      city: only,
      region: '',
      country: ''
    };
  }

  const countryIndex = segments.length - 1;
  const countryRaw = segments[countryIndex] || '';
  const country = cleanSegment(countryRaw) || countryRaw.trim();

  let cityIndex = -1;
  for (let i = countryIndex - 1; i >= 0; i -= 1) {
    const cleaned = cleanSegment(segments[i]);
    if (!cleaned) continue;
    if (isRegionCandidate(cleaned, country)) {
      continue;
    }
    if (isCityCandidate(cleaned, country)) {
      cityIndex = i;
      break;
    }
  }

  let regionIndex = -1;
  for (let i = countryIndex - 1; i >= 0; i -= 1) {
    if (i === cityIndex) continue;
    const cleaned = cleanSegment(segments[i]);
    if (!cleaned) continue;
    if (isRegionCandidate(cleaned, country)) {
      regionIndex = i;
      break;
    }
  }

  let city = cityIndex >= 0 ? (cleanSegment(segments[cityIndex]) || segments[cityIndex].trim()) : '';
  let region = regionIndex >= 0 ? (cleanSegment(segments[regionIndex]) || segments[regionIndex].trim()) : '';

  if (!city && region) {
    city = region;
    region = '';
  }

  const cutoffIndex = cityIndex >= 0 ? cityIndex : regionIndex >= 0 ? regionIndex : countryIndex;
  const streetSourceSegments = segments.slice(0, cutoffIndex);
  const streetRaw = streetSourceSegments.length
    ? streetSourceSegments[streetSourceSegments.length - 1]
    : '';
  const street = stripLeadingNumber(cleanSegment(streetRaw) || streetRaw.trim());

  return {
    name: formatted,
    street,
    city,
    region,
    country
  };
};

export const buildLocationFromPlace = (place, fallbackDescription = '') => {
  const components = Array.isArray(place?.address_components) ? place.address_components : [];
  const streetNumber = getComponentValue(components, 'street_number');
  const route = getComponentValue(components, 'route');
  const locality = getComponentValue(components, ['locality', 'postal_town']);
  const adminLevel2 = getComponentValue(components, 'administrative_area_level_2');
  const adminLevel1 = getComponentValue(components, 'administrative_area_level_1');
  const country = getComponentValue(components, 'country');

  const streetParts = [];
  if (streetNumber) streetParts.push(streetNumber);
  if (route) streetParts.push(route);

  const description = fallbackDescription || place?.formatted_address || place?.name || '';
  const formattedName = formatLocationString(description);
  const fallback = buildLocationFromDescription(formattedName);

  return {
    name: formattedName,
    street: route || (fallback.street ? stripLeadingNumber(fallback.street) : '') || stripLeadingNumber(streetParts.join(' ').trim()),
    city: locality || adminLevel2 || fallback.city,
    region: adminLevel1 || fallback.region,
    country: country || fallback.country
  };
};

export const extractComponentValue = getComponentValue;
