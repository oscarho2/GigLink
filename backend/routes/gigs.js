const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Gig = require('../models/Gig');
const User = require('../models/User');
const Message = require('../models/Message');
const { createNotification } = require('./notifications');
const { parseLocation } = require('../utils/locationParser');

const UK_REGION_NAMES = new Set(['england', 'scotland', 'wales', 'northern ireland', 'greater london']);
const REGION_KEYWORD_REGEX = /( county| state| province| region| territory| prefecture)$/i;

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

const normalizeCountryCode = (value = '') => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  if (upper === 'GB' || upper === 'UK' || upper === 'UNITED KINGDOM' || upper === 'GREAT BRITAIN') return 'UK';
  return trimmed.length === 2 ? upper : trimmed;
};

const escapeRegex = (value = '') => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const COUNTRY_CODE_EXPANSIONS = {
  UK: ['United Kingdom', 'Great Britain'],
  GB: ['United Kingdom', 'Great Britain'],
  US: ['United States', 'USA'],
  USA: ['United States', 'US'],
  UAE: ['United Arab Emirates'],
};

const COUNTRY_NAME_EXPANSIONS = {
  'united kingdom': ['great britain', 'uk'],
  'great britain': ['united kingdom', 'uk'],
  'united states': ['united states of america', 'usa', 'us', 'america'],
  'united states of america': ['united states', 'usa', 'us', 'america'],
  america: ['united states', 'usa', 'us']
};

const buildLocationSearchTokens = (values = []) => {
  const shortCodes = new Map();
  const generalTokens = new Map();

  const addGeneral = (token) => {
    const text = String(token || '').trim();
    if (!text || text.length <= 3) return;
    const key = text.toLowerCase();
    if (!generalTokens.has(key)) generalTokens.set(key, text);
  };

  const addShort = (code) => {
    const text = String(code || '').trim();
    if (!text || !/^[A-Za-z]{2,3}$/.test(text)) return;
    const upper = text.toUpperCase();
    if (!shortCodes.has(upper)) shortCodes.set(upper, upper);
    const expansions = COUNTRY_CODE_EXPANSIONS[upper];
    if (Array.isArray(expansions)) {
      expansions.forEach(addGeneral);
    }
  };

  const addValue = (value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach(addValue);
      return;
    }

    const text = String(value || '').trim();
    if (!text) return;

    if (text.length > 3) addGeneral(text);
    if (/^[A-Za-z]{2,3}$/.test(text)) {
      addShort(text);
    } else {
      const normalized = normalizeCountryCode(text);
      if (normalized && /^[A-Za-z]{2,3}$/.test(normalized)) {
        addShort(normalized);
      }
    }

    const segments = text.split(',').map(part => part.trim()).filter(Boolean);
    segments.forEach((segment) => {
      if (!segment) return;
      if (/^[A-Za-z]{2,3}$/.test(segment)) {
        addShort(segment);
      } else {
        addGeneral(segment);
        const normalizedSegment = normalizeCountryCode(segment);
        if (normalizedSegment && /^[A-Za-z]{2,3}$/.test(normalizedSegment)) {
          addShort(normalizedSegment);
        }
      }
    });
  };

  values.forEach(addValue);

  return {
    shortCodes: Array.from(shortCodes.values()),
    generalTokens: Array.from(generalTokens.values())
  };
};

const stripPostalCodes = (value = '') => {
  if (!value) return '';
  let result = String(value);

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

const cleanSegment = (segment = '') => {
  return stripPostalCodes(segment || '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const stripLeadingNumber = (value = '') => {
  return String(value || '').trim();
};

const isRegionCandidate = (segment = '', country = '') => {
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

const isCityCandidate = (segment = '', country = '') => {
  if (!segment) return false;
  if (/^\d/.test(segment)) return false;
  const upper = segment.toUpperCase();
  const countryLower = (country || '').toLowerCase();
  if (/^[A-Z]{2}$/.test(upper)) {
    if (countryLower.includes('united states') || countryLower.includes('usa') || countryLower.includes('canada')) {
      return false;
    }
  }
  if (UK_REGION_NAMES.has(segment.toLowerCase())) return false;
  if (REGION_KEYWORD_REGEX.test(segment)) return false;
  return true;
};

const deriveLocationComponents = (segments = []) => {
  const cleaned = segments
    .map(cleanSegment)
    .filter(Boolean);

  if (!cleaned.length) {
    return {
      street: '',
      city: '',
      region: '',
      country: ''
    };
  }

  let country = normalizeCountryCode(cleaned.pop() || '');
  if (country && country.length === 2) {
    country = country.toUpperCase();
  }
  let city = '';
  let region = '';

  for (let i = cleaned.length - 1; i >= 0; i -= 1) {
    const candidate = cleaned[i];
    if (isCityCandidate(candidate, country)) {
      city = candidate;
      cleaned.splice(i, 1);
      break;
    }
  }

  for (let i = cleaned.length - 1; i >= 0; i -= 1) {
    const candidate = cleaned[i];
    if (isRegionCandidate(candidate, country)) {
      region = candidate;
      cleaned.splice(i, 1);
      break;
    }
  }

  if (!city && region) {
    city = region;
    region = '';
  }

  if (region && city && region.toLowerCase() === city.toLowerCase()) {
    region = '';
  }

  const streetSegments = cleaned;
  const street = streetSegments.join(', ');

  return {
    street: stripLeadingNumber(street),
    city,
    region,
    country
  };
};

const buildLocationObject = ({ venue = '', street = '', city = '', region = '', country = '' }) => {
  const cleanVenue = stripPostalCodes(venue);
  let cleanStreet = stripPostalCodes(street);
  let cleanCity = stripPostalCodes(city);
  let cleanRegion = stripPostalCodes(region);
  let cleanCountry = normalizeCountryCode(stripPostalCodes(country));

  if (!cleanCity && cleanRegion) {
    cleanCity = cleanRegion;
    cleanRegion = '';
  }

  if (cleanRegion && cleanCity && cleanRegion.toLowerCase() === cleanCity.toLowerCase()) {
    cleanRegion = '';
  }

  if (cleanCountry) {
    const normalizedCountry = normalizeCountryCode(cleanCountry);
    const countryLower = normalizedCountry.toLowerCase();
    if (countryLower === 'uk') {
      cleanRegion = '';
    } else if (countryLower === 'us' || countryLower === 'usa' || countryLower === 'united states') {
      if (cleanRegion && cleanRegion.length === 2) {
        const mapped = US_STATE_MAP[cleanRegion.toUpperCase()];
        if (mapped) cleanRegion = mapped;
      }
    }
    cleanCountry = normalizedCountry;
  }

  const nameSegments = dedupeSegments([
    cleanVenue,
    cleanStreet,
    cleanCity,
    cleanRegion,
    cleanCountry,
  ]);

  const storedStreet = cleanStreet || ' ';

  return {
    name: nameSegments.join(', '),
    street: storedStreet,
    city: cleanCity,
    region: cleanRegion,
    country: cleanCountry,
  };
};

const normalizeLocationInput = (input) => {
  if (!input) return null;

  if (typeof input === 'string') {
    const sanitized = stripPostalCodes(input);
    const parts = sanitized.split(',').map(part => part.trim()).filter(Boolean);
    if (!parts.length) return null;

    const [venue, ...rest] = parts;
    const derived = deriveLocationComponents(rest);

    return buildLocationObject({
      venue,
      street: derived.street,
      city: derived.city,
      region: derived.region,
      country: derived.country
    });
  }

  if (typeof input === 'object') {
    const sanitizedName = stripPostalCodes(input.name || '');
    const nameParts = sanitizedName.split(',').map(part => part.trim()).filter(Boolean);
    const venue = nameParts.length ? nameParts[0] : (input.venue || '');

    const remainder = nameParts.slice(1);
    const derivedFromName = deriveLocationComponents(remainder);

    const street = input.street !== undefined ? stripPostalCodes(input.street) : derivedFromName.street;
    const city = input.city !== undefined ? stripPostalCodes(input.city) : derivedFromName.city;
    const region = input.region !== undefined ? stripPostalCodes(input.region) : derivedFromName.region;
    const country = input.country !== undefined ? normalizeCountryCode(stripPostalCodes(input.country)) : derivedFromName.country;

    return buildLocationObject({ venue, street, city, region, country });
  }

  return null;
};

// @route   POST api/gigs
// @desc    Create a gig
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const payload = { ...req.body };
    const { title, description, location, date, time, payment, instruments, genres } = payload;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ msg: 'Title is required and must be a string.' });
    }
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ msg: 'Description is required and must be a string.' });
    }
    if (!location) {
      return res.status(400).json({ msg: 'Location is required.' });
    }
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ msg: 'Date is required and must be a string.' });
    }
    if (!time || typeof time !== 'string') {
      return res.status(400).json({ msg: 'Time is required and must be a string.' });
    }
    if (!payment || typeof payment !== 'string') {
      return res.status(400).json({ msg: 'Payment is required and must be a string.' });
    }
    if (!Array.isArray(instruments) || instruments.length === 0) {
      return res.status(400).json({ msg: 'Instruments are required and must be a non-empty array.' });
    }
    if (genres && !Array.isArray(genres)) {
      return res.status(400).json({ msg: 'Genres must be an array.' });
    }

    payload.location = normalizeLocationInput(payload.location);

    if (!payload.location || !payload.location.city || !payload.location.country) {
      return res.status(400).json({ msg: 'Location must include both a city and a country.' });
    }

    if (Array.isArray(payload.schedules)) {
      payload.schedules = payload.schedules.map(s => ({
        ...s,
        // no-op for times; normalize date separately if needed in future
        date: s && s.date ? String(s.date) : s.date
      }));
    }

    const newGig = new Gig({
      ...payload,
      user: req.user.id
    });
    
    const gig = await newGig.save();
    await gig.populate('user', ['name', 'avatar']);
    
    res.json(gig);
  } catch (err) {
    console.error('Error creating gig:', err);
    console.error('Request Body:', req.body);
    res.status(500).json({ msg: 'Server Error', error: err.message, details: err });
  }
});

// @route   GET api/gigs
// @desc    Get gigs with optional server-side filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      q, // free-text search: title/description/venue/location
      instruments,
      genres,
      location,
      locationValue,
      locationCity,
      locationRegion,
      locationCountry,
      locationCodes,
      dateFrom,
      dateTo,
      limit = 50,
      page = 1
    } = req.query;

    // Build AND conditions for composable filtering
    const and = [];

    // Text search across common fields
    if (q && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      and.push({
        $or: [
          { title: rx },
          { instruments: rx },
          { genres: rx },
          { location: rx },
          { 'location.name': rx },
          { 'location.city': rx },
          { 'location.region': rx },
          { 'location.country': rx }
        ]
      });
    }

    // Location filter (match gig.location or fallback to gig owner's user.location)
    const hasLocationFilter = [location, locationValue, locationCity, locationRegion, locationCountry, locationCodes]
      .some((input) => {
        if (input === undefined || input === null) return false;
        if (Array.isArray(input)) {
          return input.some((val) => typeof val === 'string' ? val.trim().length > 0 : String(val || '').trim().length > 0);
        }
        if (typeof input === 'string') return input.trim().length > 0;
        return String(input).trim().length > 0;
      });

    if (hasLocationFilter) {
      const rawValues = [];

      const pushValue = (value) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
          value.forEach(pushValue);
          return;
        }
        const text = String(value).trim();
        if (text) rawValues.push(text);
      };

      pushValue(locationValue);
      pushValue(location);
      pushValue(locationCity);
      pushValue(locationRegion);
      pushValue(locationCountry);
      pushValue(locationCodes);

      if (!rawValues.length && typeof location === 'string' && location.trim()) {
        rawValues.push(location.trim());
      }

      const exactCity = typeof locationCity === 'string' ? locationCity.trim() : '';
      const exactRegion = typeof locationRegion === 'string' ? locationRegion.trim() : '';
      const exactCountry = typeof locationCountry === 'string' ? locationCountry.trim() : '';

      let { shortCodes, generalTokens } = buildLocationSearchTokens(rawValues);

      const normalizeLower = (value) => String(value || '').trim().toLowerCase();
      const lowerExactCity = normalizeLower(exactCity);
      const lowerExactRegion = normalizeLower(exactRegion);
      const lowerExactCountry = normalizeLower(exactCountry);

      const citySpecified = Boolean(lowerExactCity);
      const regionSpecified = Boolean(lowerExactRegion);
      const countrySpecified = Boolean(lowerExactCountry);

      const countrySynonyms = new Set();
      const countryRegexTargets = new Map();
      const addCountrySynonym = (value) => {
        const text = String(value || '').trim();
        if (!text) return;
        const lower = text.toLowerCase();
        if (lower) countrySynonyms.add(lower);
        if (!countryRegexTargets.has(lower)) {
          countryRegexTargets.set(lower, text);
        }
      };

      if (exactCountry) {
        addCountrySynonym(exactCountry);
      }

      if (countrySpecified) {
        const nameExpansions = COUNTRY_NAME_EXPANSIONS[lowerExactCountry];
        if (Array.isArray(nameExpansions)) {
          nameExpansions.forEach(addCountrySynonym);
        }
        const normalizedCountryCode = normalizeCountryCode(exactCountry);
        if (normalizedCountryCode) {
          addCountrySynonym(normalizedCountryCode);
          const lowerCode = normalizedCountryCode.toLowerCase();
          if (lowerCode && lowerCode !== normalizedCountryCode) {
            addCountrySynonym(lowerCode);
          }
          const codeExpansions = COUNTRY_CODE_EXPANSIONS[normalizedCountryCode]
            || COUNTRY_CODE_EXPANSIONS[normalizedCountryCode.toUpperCase()]
            || COUNTRY_CODE_EXPANSIONS[normalizedCountryCode.toLowerCase()];
          if (Array.isArray(codeExpansions)) {
            codeExpansions.forEach(addCountrySynonym);
          }
        }
      }

      const buildCountryClause = (field) => {
        if (!countryRegexTargets.size) return null;
        const clauses = Array.from(countryRegexTargets.values()).map((value) => ({
          [field]: new RegExp(`^${escapeRegex(value)}$`, 'i')
        }));
        if (!clauses.length) return null;
        if (clauses.length === 1) return clauses[0];
        return { $or: clauses };
      };

      const locationCountryClause = buildCountryClause('location.country');
      const userCountryClause = buildCountryClause('locationData.country');

      const tokenContains = (token, lowerTerm) => {
        if (!lowerTerm) return false;
        const normalizedToken = token.toLowerCase();
        if (!normalizedToken) return false;
        if (lowerTerm.length <= 3) {
          const boundaryRegex = new RegExp(`(^|[^A-Za-z0-9])${escapeRegex(lowerTerm)}([^A-Za-z0-9]|$)`, 'i');
          return boundaryRegex.test(token);
        }
        return normalizedToken.includes(lowerTerm);
      };

      const filterGeneralTokens = (tokens) => {
        return tokens
          .map(token => String(token || '').trim())
          .filter(Boolean)
          .filter((token) => {
            const lower = token.toLowerCase();
            if (citySpecified) {
              if (lowerExactCity && tokenContains(token, lowerExactCity)) return true;
              return false;
            }
            if (regionSpecified) {
              if (lowerExactRegion && tokenContains(token, lowerExactRegion)) return true;
              return false;
            }
            if (countrySpecified) {
              if (countrySynonyms.size && countrySynonyms.has(lower)) return true;
              return false;
            }
            return true;
          });
      };

      const filterShortCodes = (codes) => {
        if (!Array.isArray(codes) || !codes.length) return [];
        if (citySpecified) {
          return [];
        }
        if (regionSpecified) {
          return codes
            .map(code => String(code || '').trim())
            .filter(Boolean)
            .filter(code => !countrySynonyms.has(code.toLowerCase()));
        }
        if (countrySpecified) {
          return codes
            .map(code => String(code || '').trim())
            .filter(Boolean)
            .filter(code => countrySynonyms.has(code.toLowerCase()));
        }
        return codes.map(code => String(code || '').trim()).filter(Boolean);
      };

      generalTokens = filterGeneralTokens(generalTokens);
      shortCodes = filterShortCodes(shortCodes);

      const locationOr = [];
      const userOr = [];
      const seenLocation = new Set();
      const seenUser = new Set();

      const addClause = (collection, seen, field, regex) => {
        if (!regex) return;
        const key = `${field}|${regex.source}|${regex.flags}`;
        if (seen.has(key)) return;
        seen.add(key);
        collection.push({ [field]: { $regex: regex } });
      };

      const hasExactCity = citySpecified;
      const hasExactRegion = regionSpecified;
      const hasExactCountry = countrySpecified;

      shortCodes.forEach((code) => {
        if (!code) return;
        const anchored = new RegExp(`^${escapeRegex(code)}$`, 'i');
        addClause(locationOr, seenLocation, 'location.country', anchored);
        addClause(userOr, seenUser, 'locationData.country', anchored);

        const boundary = new RegExp(`\\b${escapeRegex(code)}\\b`, 'i');
        [
          { field: 'location.name', skip: false },
          { field: 'location.region', skip: false },
          { field: 'location.city', skip: false },
          { field: 'location.street', skip: false }
        ].forEach(({ field, skip }) => {
          if (skip) return;
          addClause(locationOr, seenLocation, field, boundary);
        });
        [
          { field: 'locationData.region', skip: false },
          { field: 'locationData.city', skip: false }
        ].forEach(({ field, skip }) => {
          if (skip) return;
          addClause(userOr, seenUser, field, boundary);
        });
      });

      generalTokens.forEach((token) => {
        if (!token) return;
        const regex = new RegExp(escapeRegex(token), 'i');
        [
          { field: 'location.name', skip: false },
          { field: 'location.street', skip: false },
          { field: 'location.city', skip: false },
          { field: 'location.region', skip: false },
          { field: 'location.country', skip: hasExactCountry }
        ].forEach(({ field, skip }) => {
          if (skip) return;
          addClause(locationOr, seenLocation, field, regex);
        });
        [
          { field: 'locationData.city', skip: false },
          { field: 'locationData.region', skip: false },
          { field: 'locationData.country', skip: hasExactCountry }
        ].forEach(({ field, skip }) => {
          if (skip) return;
          addClause(userOr, seenUser, field, regex);
        });
      });

      const locationExactClauses = [];
      const userExactClauses = [];

      if (!exactCity && exactRegion) {
        const regionRegex = new RegExp(`^${escapeRegex(exactRegion)}$`, 'i');
        locationExactClauses.push({ 'location.region': regionRegex });
        userExactClauses.push({ 'locationData.region': regionRegex });
      }

      if (exactCity) {
        const cityRegex = new RegExp(`^${escapeRegex(exactCity)}$`, 'i');
        locationExactClauses.push({ 'location.city': cityRegex });
        userExactClauses.push({ 'locationData.city': cityRegex });
      }

      if (!locationOr.length && !locationExactClauses.length && typeof location === 'string' && location.trim()) {
        const fallbackRegex = new RegExp(escapeRegex(location.trim()), 'i');
        ['location.name', 'location.street', 'location.city', 'location.region', 'location.country'].forEach((field) => {
          addClause(locationOr, seenLocation, field, fallbackRegex);
        });
        ['locationData.city', 'locationData.region', 'locationData.country'].forEach((field) => {
          addClause(userOr, seenUser, field, fallbackRegex);
        });
      }

      const userSpecificClauses = [];
      if (userExactClauses.length) userSpecificClauses.push(...userExactClauses);
      if (userOr.length) userSpecificClauses.push({ $or: userOr });

      let userClause = null;
      if (userSpecificClauses.length) {
        userClause = userSpecificClauses.length === 1
          ? userSpecificClauses[0]
          : { $or: userSpecificClauses };
      }
      if (userCountryClause) {
        userClause = userClause
          ? { $and: [userCountryClause, userClause] }
          : userCountryClause;
      }

      let userIds = [];
      if (userClause) {
        const matchingUsers = await User.find(userClause).select('_id').lean();
        userIds = matchingUsers.map(u => u._id);
      }

      const orConditions = [];

      const specificLocationClauses = [];
      if (locationExactClauses.length) specificLocationClauses.push(...locationExactClauses);
      if (locationOr.length) specificLocationClauses.push({ $or: locationOr });

      let locationClause = null;
      if (specificLocationClauses.length) {
        locationClause = specificLocationClauses.length === 1
          ? specificLocationClauses[0]
          : { $or: specificLocationClauses };
      }

      if (locationCountryClause) {
        if (locationClause) {
          locationClause = { $and: [locationCountryClause, locationClause] };
        } else {
          locationClause = locationCountryClause;
        }
      }

      if (locationClause) {
        orConditions.push(locationClause);
      }

      if (userIds.length) {
        const emptyLocationRegex = new RegExp('^\\s*$');
        const fallbackEligibleClause = {
          $or: [
            { location: { $exists: false } },
            { location: null },
            {
              $and: [
                { location: { $type: 'object' } },
                {
                  $or: [
                    { 'location.country': { $in: [null, ''] } },
                    { 'location.city': { $in: [null, ''] } },
                    { 'location.name': { $in: [null, ''] } }
                  ]
                }
              ]
            },
            {
              $and: [
                { location: { $type: 'string' } },
                { location: { $regex: emptyLocationRegex } }
              ]
            }
          ]
        };

        orConditions.push({
          $and: [
            { user: { $in: userIds } },
            fallbackEligibleClause
          ]
        });
      }

      if (orConditions.length) {
        and.push({ $or: orConditions });
      }
    }

    // Instruments filtering (support comma-separated or repeated params)
    if (instruments) {
      const arr = Array.isArray(instruments)
        ? instruments
        : instruments.split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) and.push({ instruments: { $in: arr } });
    }

    // Genres filtering
    if (genres) {
      const arr = Array.isArray(genres)
        ? genres
        : genres.split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) and.push({ genres: { $in: arr } });
    }

    // Date range on ISO string YYYY-MM-DD (lexicographic compare works)
    if (dateFrom || dateTo) {
      const dateFilter = {};
      if (dateFrom) dateFilter.$gte = dateFrom;
      if (dateTo) dateFilter.$lte = dateTo;
      and.push({ date: dateFilter });
    }

    const filter = and.length ? { $and: and } : {};

    const numericLimit = Math.min(parseInt(limit) || 50, 100);
    const numericPage = Math.max(parseInt(page) || 1, 1);
    const skip = (numericPage - 1) * numericLimit;

    const gigs = await Gig.find(filter)
      .populate('user', ['name', 'avatar', 'locationData'])
      .populate('applicants.user', ['_id', 'name', 'avatar'])
      .sort({ date: 1, createdAt: -1 })
      .limit(numericLimit)
      .skip(skip);
    
    // Add applicant count and applicant info for gig owners, plus application status for users
    const gigsWithApplicantCount = gigs.map(gig => {
      const gigObj = gig.toObject();
      gigObj.applicantCount = gig.applicants ? gig.applicants.length : 0;

      
      // Include applicant details if user is authenticated and owns the gig
      const token = req.header('x-auth-token');
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const userId = decoded.user.id;
          
          if (gig.user._id.toString() === userId) {
            // User owns this gig - include applicants
            gigObj.applicants = gig.applicants;
          } else {
            // User doesn't own this gig - check if they applied
            const userApplication = gig.applicants.find(app => {
              const applicantUserId = app.user && app.user._id ? app.user._id.toString() : (app.user && app.user.toString ? app.user.toString() : app.user);
              return applicantUserId === userId;
            });
            
            if (userApplication) {
              gigObj.yourApplicationStatus = userApplication.status || 'pending';
            }
          }
        } catch (err) {
          // Token invalid, don't include applicants or application status
        }
      }
      
      return gigObj;
      });
    
    res.json(gigsWithApplicantCount);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/gigs/filters
// @desc    Get distinct filter values from existing gigs
// @access  Public
router.get('/filters', async (_req, res) => {
  try {
    const [instruments, genres] = await Promise.all([
      Gig.distinct('instruments'),
      Gig.distinct('genres')
    ]);

    // Suggestion stats with fallback to user.location when gig.location is empty
    const pipeline = [
      {
        $project: {
          loc: '$location.city'
        }
      },
      { $match: { loc: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: { $toLower: '$loc' },
          count: { $sum: 1 },
          label: { $first: '$loc' }
        }
      },
      { $sort: { count: -1, label: 1 } },
      { $limit: 200 },
      { $project: { _id: 0, label: 1, count: 1 } }
    ];

    const locationAgg = await Gig.aggregate(pipeline);
    const locationStats = locationAgg;
    const locations = locationStats.map(l => l.label);

    res.json({ locations, locationStats, instruments: (instruments || []).filter(Boolean).sort(), genres: (genres || []).filter(Boolean).sort() });
  } catch (err) {
    console.error('Error fetching gig filters:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Region name helpers for location suggestions
const REGION_FALLBACK_MAP = {
  UK: 'United Kingdom',
  GB: 'United Kingdom',
  US: 'United States',
  USA: 'United States',
  UAE: 'United Arab Emirates'
};

const regionDisplayNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch (err) {
    return null;
  }
})();

const expandRegionName = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  if (REGION_FALLBACK_MAP[upper]) {
    return REGION_FALLBACK_MAP[upper];
  }
  if (regionDisplayNames && (upper.length === 2 || upper.length === 3)) {
    try {
      const resolved = regionDisplayNames.of(upper);
      if (resolved && resolved.toUpperCase() !== upper) {
        return resolved;
      }
    } catch (err) {
      // ignore bad codes
    }
  }
  return trimmed;
};

const normalizeIsoCode = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^[A-Za-z]{2,3}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return '';
};

// @route   GET api/gigs/locations
// @desc    Predictive location suggestions from existing gigs (no GeoNames)
// @access  Public
router.get('/locations', async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;
    const numericLimit = Math.min(parseInt(limit) || 10, 50);
    const trimmed = (q || '').trim();
    const rx = trimmed ? new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const gigs = await Gig.find({}, { location: 1 }).lean();
    const entries = new Map();

    const addHierarchyValue = (collection, value) => {
      if (!collection) return;
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      const existing = collection.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        collection.set(key, { value: trimmed, count: 1 });
      }
    };

    const ensureEntry = (label, key) => {
      let entry = entries.get(key);
      if (entry) return entry;
      entry = {
        label,
        count: 0,
        codes: new Set(),
        candidates: new Set(),
        cityCounts: new Map(),
        regionCounts: new Map(),
        countryCounts: new Map(),
        presence: { city: 0, region: 0, country: 0 }
      };
      entries.set(key, entry);
      return entry;
    };

    const upsertEntry = (label, meta) => {
      if (!label) return;
      const key = label.toLowerCase();
      const entry = ensureEntry(label, key);
      entry.count += 1;
      if (meta?.code) entry.codes.add(meta.code);
      if (Array.isArray(meta?.candidates)) {
        meta.candidates.forEach((candidate) => {
          if (candidate) entry.candidates.add(candidate.toLowerCase());
        });
      }

      if (meta) {
        if (meta.city !== undefined) {
          const trimmed = typeof meta.city === 'string' ? meta.city.trim() : '';
          if (trimmed) {
            addHierarchyValue(entry.cityCounts, trimmed);
            entry.presence.city += 1;
          }
        }
        if (meta.region !== undefined) {
          const trimmed = typeof meta.region === 'string' ? meta.region.trim() : '';
          if (trimmed) {
            addHierarchyValue(entry.regionCounts, trimmed);
            entry.presence.region += 1;
          }
        }
        if (meta.country !== undefined) {
          const trimmed = typeof meta.country === 'string' ? meta.country.trim() : '';
          if (trimmed) {
            addHierarchyValue(entry.countryCounts, trimmed);
            entry.presence.country += 1;
          }
        }
      }
    };

    for (const gig of gigs) {
      const loc = gig?.location || {};
      const cityRaw = String(loc.city || '').trim();
      const regionRaw = String(loc.region || '').trim();
      const countryRaw = String(loc.country || '').trim();
      const nameRaw = String(loc.name || '').trim();

      let cityName = cityRaw;
      let regionName = regionRaw;
      let countryName = countryRaw;

      if ((!cityName || !regionName || !countryName) && nameRaw) {
        const parsedFromName = parseLocation(nameRaw);
        if (!cityName && parsedFromName.city) cityName = parsedFromName.city;
        if (!regionName && parsedFromName.region) regionName = parsedFromName.region;
        if (!countryName && parsedFromName.country) countryName = parsedFromName.country;
      }

      if (!cityName && loc.displayName) {
        const parsedDisplay = parseLocation(String(loc.displayName || '').trim());
        if (!cityName && parsedDisplay.city) cityName = parsedDisplay.city;
        if (!regionName && parsedDisplay.region) regionName = parsedDisplay.region;
        if (!countryName && parsedDisplay.country) countryName = parsedDisplay.country;
      }

      const countryCodeRaw = normalizeIsoCode(countryRaw);
      const countryCode = countryCodeRaw || normalizeIsoCode(countryName);

      const normalizedCountry = expandRegionName(countryName);
      if (normalizedCountry) countryName = normalizedCountry;

      const normalizedRegion = expandRegionName(regionName);
      if (normalizedRegion) regionName = normalizedRegion;

      cityName = String(cityName || '').trim();
      regionName = String(regionName || '').trim();
      countryName = String(countryName || '').trim();

      const parts = [];
      if (cityName) parts.push(cityName);
      if (regionName && !parts.some(part => part.toLowerCase() === regionName.toLowerCase())) parts.push(regionName);
      if (countryName && !parts.some(part => part.toLowerCase() === countryName.toLowerCase())) parts.push(countryName);
      if (!parts.length && nameRaw) parts.push(nameRaw);

      const label = parts.join(', ');
      if (!label) continue;

      const candidateStrings = new Set([
        label,
        cityRaw,
        regionRaw,
        countryRaw,
        countryCode,
        countryName,
        regionName,
        cityName,
        nameRaw
      ].map(val => String(val || '').trim()).filter(Boolean));

      if (rx) {
        const matches = Array.from(candidateStrings).some((candidate) => rx.test(candidate));
        if (!matches) continue;
      }

      upsertEntry(label, {
        code: countryCode,
        candidates: Array.from(candidateStrings),
        city: cityName,
        region: regionName,
        country: countryName
      });
    }

    const pickMostLikely = (collection) => {
      if (!collection || !collection.size) return '';
      const sorted = Array.from(collection.values())
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
      return sorted[0].value;
    };

    const sorted = Array.from(entries.values())
      .map(entry => {
        const hierarchyCity = entry.cityCounts.size ? pickMostLikely(entry.cityCounts) : '';
        const hierarchyRegion = entry.regionCounts.size ? pickMostLikely(entry.regionCounts) : '';
        const hierarchyCountry = entry.countryCounts.size ? pickMostLikely(entry.countryCounts) : '';
        const hasCity = entry.presence.city > 0;
        const hasRegion = entry.presence.region > 0;
        const hasCountry = entry.presence.country > 0;
        const granularity = hasCity ? 'city' : (hasRegion ? 'region' : (hasCountry ? 'country' : 'unknown'));

        const result = {
          label: entry.label,
          count: entry.count,
          codes: Array.from(entry.codes).filter(Boolean),
          candidates: Array.from(entry.candidates),
          hierarchy: {
            city: hierarchyCity || '',
            region: hierarchyRegion || '',
            country: hierarchyCountry || ''
          },
          granularity
        };
        return result;
      })
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, numericLimit);

    res.json({ locationStats: sorted });
  } catch (err) {
    console.error('Error fetching location suggestions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/gigs/:id
// @desc    Get gig by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id)
      .populate('user', ['_id', 'name', 'avatar', 'locationData'])
      .populate('applicants.user', ['_id', 'name', 'avatar']);

    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }

    // Add applicant count to the gig
    const gigObj = gig.toObject();
    gigObj.applicantCount = gig.applicants ? gig.applicants.length : 0;


    // Securely provide applicants only to the gig owner
    const token = req.header('x-auth-token');
    let isOwner = false;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const ownerId = (gig.user && typeof gig.user === 'object' && gig.user._id)
          ? gig.user._id.toString()
          : (gig.user && typeof gig.user.toString === 'function')
            ? gig.user.toString()
            : '';
        if (ownerId && ownerId === decoded.user.id) {
          isOwner = true;
        }
      } catch (err) {
        // Invalid token or comparison failure; treat as non-owner
      }
    }

    // For non-owners, include only the current user's application status (if any)
    if (!isOwner && token) {
      try {
        const jwt = require('jsonwebtoken');
        const decodedForStatus = jwt.verify(token, process.env.JWT_SECRET);
        const myId = decodedForStatus.user.id;
        const myApp = Array.isArray(gig.applicants)
          ? gig.applicants.find(a => {
              const userId = a.user && a.user._id ? a.user._id.toString() : (a.user && a.user.toString ? a.user.toString() : a.user);
              return userId === myId;
            })
          : null;
        if (myApp) {
          gigObj.yourApplicationStatus = myApp.status || 'pending';
          // Check if someone else was accepted (for 'fixed' status display)
          gigObj.acceptedByOther = gig.applicants.some(
            app => app.status === 'accepted' && (
              app.user && app.user._id ? app.user._id.toString() : 
              (app.user && app.user.toString ? app.user.toString() : app.user)
            ) !== myId
          );
        }
      } catch (err) {
        console.error('DEBUG: Error in status check:', err);
      }
    }

    if (!isOwner) {
      delete gigObj.applicants; // Hide applicants from non-owners
    }

    res.json(gigObj);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/gigs/:id
// @desc    Update a gig
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    let gig = await Gig.findById(req.params.id);
    
    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    
    // Check if user owns this gig
    if (gig.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Update gig
    const update = { ...req.body };

    if (update.location) {
      update.location = normalizeLocationInput(update.location);
    }

    gig = await Gig.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).populate('user', ['name', 'avatar']);
    
    res.json(gig);
  } catch (err) {
    console.error('Error updating gig:', err);
    console.error('Request Body:', req.body);
    res.status(500).json({ msg: 'Server Error', error: err.message, details: err });
  }
});

// @route   DELETE api/gigs/:id
// @desc    Delete a gig
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    
    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    
    // Check if user owns this gig
    if (gig.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    await Gig.findByIdAndRemove(req.params.id);
    
    res.json({ msg: 'Gig removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/gigs/:id/apply
// @desc    Apply to a gig
// @access  Private
router.post('/:id/apply', auth, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    
    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    
    // Check if already applied
    if (gig.applicants.some(applicant => applicant.user.toString() === req.user.id)) {
      return res.status(400).json({ msg: 'Already applied to this gig' });
    }
    
    gig.applicants.unshift({
      user: req.user.id,
      message: req.body.message,
      status: 'pending'
    });
    
    await gig.save();

    // Create notification for gig owner
    const applicant = await User.findById(req.user.id).select('name');
    await createNotification(
      gig.user,
      req.user.id,
      'gig_application',
      `${applicant.name} applied for your gig: ${gig.title}`,
      gig._id,
      'Gig',
      req
    );

    // Also send a gig_application message to the gig owner so they can accept/undo from chat
    try {
      const io = req.app.get('io');
      const senderId = req.user.id; // applicant
      const recipientId = gig.user.toString(); // gig owner
      const conversationId = Message.generateConversationId(senderId, recipientId);
      
      const gigApplicationPayload = {
        gigId: gig._id,
        gigTitle: gig.title,
        gigVenue: gig.location.name || '',
        gigDate: gig.date || gig.eventDate || new Date(),
        gigPayment: gig.payment || gig.pay || 0,
        gigInstruments: Array.isArray(gig.instruments) ? gig.instruments : [],
        gigGenres: Array.isArray(gig.genres) ? gig.genres : []
      };
      
      const appMessage = new Message({
        sender: senderId,
        recipient: recipientId,
        content: req.body.message || 'Applied for your gig',
        conversationId,
        messageType: 'gig_application',
        gigApplication: gigApplicationPayload
      });
      await appMessage.save();
      await appMessage.populate('sender', 'name email');
      await appMessage.populate('recipient', 'name email');
      
      if (io) {
        io.to(conversationId).emit('new_message', appMessage);
        io.to(recipientId).emit('conversation_update', {
          conversationId,
          lastMessage: appMessage,
          unreadCount: 1
        });
      }
    } catch (emitErr) {
      console.error('Failed to emit gig_application message:', emitErr);
      // Non-blocking: proceed regardless
    }
    
    res.json(gig.applicants);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/gigs/:id/accept/:applicantId
// @desc    Accept an applicant and mark gig as fixed
// @access  Private
router.post('/:id/accept/:applicantId', auth, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    
    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    
    // Check if user owns this gig
    if (gig.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Find the applicant
    const applicant = gig.applicants.find(
      app => app.user.toString() === req.params.applicantId
    );
    
    if (!applicant) {
      return res.status(404).json({ msg: 'Applicant not found' });
    }
    
    // Update applicant status to accepted
    applicant.status = 'accepted';
    
    // Mark gig as fixed
    gig.isFilled = true;
    
    await gig.save();
    
    // Emit socket event to notify about application status change
    try {
      const io = req.app.get('io');
      if (io) {
        console.log(`Emitting application_status_update for accept: gigId=${gig._id}, applicantId=${req.params.applicantId}, status=accepted`);
        
        // Notify the accepted applicant
        io.to(req.params.applicantId).emit('application_status_update', {
          gigId: gig._id,
          applicantId: req.params.applicantId,
          status: 'accepted',
          gigTitle: gig.title
        });
        
        // Notify the gig owner
        io.to(req.user.id).emit('application_status_update', {
          gigId: gig._id,
          applicantId: req.params.applicantId,
          status: 'accepted',
          gigTitle: gig.title
        });
        
        console.log(`Socket events emitted to applicant ${req.params.applicantId} and owner ${req.user.id}`);
      } else {
        console.log('Socket.io instance not found');
      }
    } catch (emitErr) {
      console.error('Failed to emit application status update:', emitErr);
    }
    
    res.json({ msg: 'Applicant accepted and gig marked as fixed', gig });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/gigs/:id/undo/:applicantId
// @desc    Undo acceptance of an applicant
// @access  Private
router.post('/:id/undo/:applicantId', auth, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    
    if (!gig) {
      return res.status(404).json({ msg: 'Gig not found' });
    }
    
    // Check if user owns this gig
    if (gig.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Find the applicant
    const applicant = gig.applicants.find(
      app => app.user.toString() === req.params.applicantId
    );
    
    if (!applicant) {
      return res.status(404).json({ msg: 'Applicant not found' });
    }
    
    // Update applicant status back to pending
    applicant.status = 'pending';
    
    // Check if there are any other accepted applicants
    const hasOtherAcceptedApplicants = gig.applicants.some(
      app => app.status === 'accepted' && app.user.toString() !== req.params.applicantId
    );
    
    // Only mark gig as not fixed if no other applicants are accepted
    if (!hasOtherAcceptedApplicants) {
      gig.isFilled = false;
    }
    
    await gig.save();
    
    // Emit socket event to notify about application status change
    try {
      const io = req.app.get('io');
      if (io) {
        console.log(`Emitting application_status_update for undo: gigId=${gig._id}, applicantId=${req.params.applicantId}, status=pending`);
        
        // Notify the applicant whose acceptance was undone
        io.to(req.params.applicantId).emit('application_status_update', {
          gigId: gig._id,
          applicantId: req.params.applicantId,
          status: 'pending',
          gigTitle: gig.title
        });
        
        // Notify the gig owner
        io.to(req.user.id).emit('application_status_update', {
          gigId: gig._id,
          applicantId: req.params.applicantId,
          status: 'pending',
          gigTitle: gig.title
        });
        
        console.log(`Socket events emitted to applicant ${req.params.applicantId} and owner ${req.user.id}`);
      } else {
        console.log('Socket.io instance not found');
      }
    } catch (emitErr) {
      console.error('Failed to emit application status update:', emitErr);
    }
    
    res.json({ msg: 'Applicant acceptance undone', gig });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/gigs/user/applications
// @desc    Get current user's gig applications
// @access  Private
router.get('/user/applications', auth, async (req, res) => {
  try {
    const gigs = await Gig.find({
      'applicants.user': req.user.id
    })
    .populate('user', ['name', 'avatar'])
    .populate('applicants.user', ['name', 'avatar'])
    .sort({ 'applicants.date': -1 });

    // Map to include only the current user's application status and gig details
    const userApplications = gigs.map(gig => {
      const userApplication = gig.applicants.find(
        app => app.user._id.toString() === req.user.id
      );
      
      return {
        _id: gig._id,
        title: gig.title,
        location: gig.location,
        date: gig.date,
        time: gig.time,
        payment: gig.payment,
        instruments: gig.instruments,
        genres: gig.genres,
        description: gig.description,
        isFilled: gig.isFilled,
        poster: gig.user,
        applicationStatus: userApplication.status,
        applicationDate: userApplication.date,
        applicationMessage: userApplication.message,
        // Check if someone else was accepted
        acceptedByOther: gig.applicants.some(
          app => app.status === 'accepted' && app.user._id.toString() !== req.user.id
        )
      };
    });

    res.json(userApplications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
