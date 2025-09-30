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

const titleCase = (value = '') => {
  if (!value) return '';
  return value
    .split(/([\s\-'])/)
    .map((part) => {
      if (!part) return part;
      if (/^[\s\-']$/.test(part)) return part;
      if (part.toUpperCase() === part && part.length <= 3) return part; // Preserve acronyms like UK, USA, NYC
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('')
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
  const cleanVenue = titleCase(sanitizeSegment(venueName));
  const cleanStreet = titleCase(sanitizeSegment(street));
  const cleanCity = titleCase(sanitizeSegment(city));
  const cleanRegion = titleCase(sanitizeSegment(region));
  const cleanCountry = titleCase(sanitizeSegment(country));

  const segments = dedupeSegments([
    cleanVenue,
    cleanStreet,
    cleanCity,
    cleanRegion,
    cleanCountry,
  ]);

  const name = segments.join(', ');

  return {
    name,
    street: cleanStreet,
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
  const country = rest.length ? rest.pop() : '';
  const region = rest.length ? rest.pop() : '';
  const city = rest.length ? rest.pop() : '';
  const street = rest.join(', ');

  return buildGigLocation({
    venueName,
    street,
    city,
    region,
    country,
  });
};

export const stripPostalCodes = sanitizeSegment;
