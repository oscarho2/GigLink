const express = require('express');
const router = express.Router();
const Gig = require('../models/Gig');

// Ensure fetch is available (Node < 18 fallback)
if (typeof fetch !== 'function') {
  global.fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

// GET /api/venues/suggest?q=...&near=...&limit=10
router.get('/suggest', async (req, res) => {
  try {
    const { q = '', near = '', limit = 10, types = '', session_token = '', ll = '', radius = '' } = req.query;
    const globalFlagRaw = String(req.query.global || '').trim().toLowerCase();
    const globalFlag = globalFlagRaw === '1' || globalFlagRaw === 'true';
    const debugMode = String(req.query.debug || '').trim() === '1';
    const broadFlagRaw = String(req.query.broad || '').trim().toLowerCase();
    const broad = broadFlagRaw === '1' || broadFlagRaw === 'true';
    const googleKey = (process.env.GOOGLE_PLACES_API_KEY || '').trim();

    let query = String(q || '').trim();
    // Apply explicit near first (no provider default)
    let nearStr = globalFlag ? '' : String(near || '').trim();
    // If no near provided, attempt to extract from the query itself (e.g., "Venue, City" or "Venue in City")
    if (!nearStr && query) {
      const parsed = extractNearFromQuery(query);
      if (parsed.derivedNear) {
        query = parsed.cleanQuery;
        nearStr = parsed.derivedNear;
      }
    }
    const typesStr = String(types || '').trim();
    // Sanitize types to logical set for Google
    const allowed = new Set(['place','address']);
    const typesFinal = typesStr
      ? typesStr.split(',').map(s => s.trim().toLowerCase()).filter(t => allowed.has(t))
      : ['place'];
    const sessionToken = String(session_token || '').trim();
    let llStr = String(ll || '').trim();
    const lim = Math.min(parseInt(limit) || 50, 100);
    if (query.length < 2) return res.json({ results: [] });

    const debugLog = [];

    // If we have a textual near but no coordinates, resolve near -> ll for better relevance (Google)
    if (nearStr && !llStr && googleKey) {
      try {
        const resolvedG = await resolveNearToLLGoogle(nearStr, googleKey, 2500, debugLog);
        if (resolvedG) llStr = resolvedG;
      } catch (e) {
        debugLog.push({ step: 'resolveNearToLLGoogle', error: e.message });
      }
    }

    // Use Google Places if configured
    if (googleKey) {
      const g = await fetchGooglePlaces({ apiKey: googleKey, query, nearStr, lim, types: typesFinal.join(','), sessionToken, ll: llStr, radius, broad, debugLog });
      if (g.length) return res.json(debugMode ? { results: g, debug: debugLog } : { results: g });
    }

    // Fallback to known venues from existing gigs
    const results = await fallbackFromGigs(query, nearStr, lim);
    return res.json(debugMode ? { results, debug: debugLog } : { results });
  } catch (err) {
    console.error('venues/suggest failed:', err);
    // Last resort fallback
    try {
      const results = await fallbackFromGigs(String(req.query.q || ''), String(req.query.near || ''), req.query.limit || 10);
      return res.json({ results });
    } catch (_) {}
    return res.json({ results: [] });
  }
});

function extractNearFromQuery(raw) {
  const s = String(raw || '').trim();
  if (!s) return { cleanQuery: '', derivedNear: '' };
  const commaIdx = s.lastIndexOf(',');
  if (commaIdx > -1 && commaIdx < s.length - 1) {
    const left = s.slice(0, commaIdx).trim();
    const right = s.slice(commaIdx + 1).trim();
    if (left && right) return { cleanQuery: left, derivedNear: right };
  }
  const lower = s.toLowerCase();
  const inIdx = lower.lastIndexOf(' in ');
  if (inIdx > -1) {
    const left = s.slice(0, inIdx).trim();
    const right = s.slice(inIdx + 4).trim();
    if (left && right) return { cleanQuery: left, derivedNear: right };
  }
  const dashIdx = s.lastIndexOf(' - ');
  if (dashIdx > -1) {
    const left = s.slice(0, dashIdx).trim();
    const right = s.slice(dashIdx + 3).trim();
    if (left && right) return { cleanQuery: left, derivedNear: right };
  }
  const pOpen = s.lastIndexOf('(');
  const pClose = s.lastIndexOf(')');
  if (pOpen > -1 && pClose > pOpen) {
    const left = s.slice(0, pOpen).trim();
    const right = s.slice(pOpen + 1, pClose).trim();
    if (left && right) return { cleanQuery: left, derivedNear: right };
  }
  return { cleanQuery: s, derivedNear: '' };
}

async function fallbackFromGigs(q, near, limit) {
  const rxQ = q && String(q).trim() ? new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
  const rxNear = near && String(near).trim() ? new RegExp(String(near).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
  const match = {};
  if (rxQ) match.venue = { $regex: rxQ };
  if (rxNear) match.location = { $regex: rxNear };
  const pipeline = [
    { $match: match },
    { $group: { _id: { $toLower: '$venue' }, name: { $first: '$venue' }, count: { $sum: 1 } } },
    { $sort: { count: -1, name: 1 } },
    { $limit: Math.min(parseInt(limit) || 10, 20) },
  ];
  const agg = await Gig.aggregate(pipeline);
  return agg
    .map(row => ({ id: row._id, name: row.name, address: '' }))
    .filter(v => v.name && typeof v.name === 'string');
}

function fetchWithTimeout(url, options, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const opts = { ...options, signal: controller.signal };
  return fetch(url, opts)
    .finally(() => clearTimeout(timer));
}

// Resolve near -> ll using Google Geocoding
async function resolveNearToLLGoogle(nearStr, apiKey, timeoutMs = 2500, debugLog = []) {
  try {
    const p = new URLSearchParams();
    p.set('address', nearStr);
    p.set('key', apiKey);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${p.toString()}`;
    const r = await fetchWithTimeout(url, {}, timeoutMs);
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      debugLog.push({ step: 'geocode', status: r.status, body: (txt || '').slice(0, 160) });
      return '';
    }
    const d = await r.json();
    const first = Array.isArray(d?.results) ? d.results[0] : null;
    const loc = first?.geometry?.location;
    if (loc && isFinite(loc.lat) && isFinite(loc.lng)) return `${loc.lat},${loc.lng}`;
  } catch (e) {
    debugLog.push({ step: 'geocode', error: e.message });
  }
  return '';
}

// Google Places provider: combines Text Search and Autocomplete
async function fetchGooglePlaces({ apiKey, query, nearStr, lim, types = '', sessionToken = '', ll = '', radius = '', broad = false, debugLog = [] }) {
  const results = new Map();
  const cap = Math.min(Math.max(parseInt(lim) || 10, 1), 50);
  const add = (id, name, address) => {
    const key = id || `${name}|${address || ''}`;
    if (!name) return;
    if (!results.has(key)) results.set(key, { id: key, name, address: address || '' });
  };

  const normTypes = (types || '').split(',').map(s => s.trim().toLowerCase());
  const googleType = normTypes.includes('place') ? 'establishment' : (normTypes.includes('address') ? 'geocode' : '');

  // Helper: Google Text Search
  const textSearch = async (q, llParam = '', rad = '') => {
    try {
      const p = new URLSearchParams();
      p.set('query', q);
      p.set('key', apiKey);
      if (googleType) p.set('type', googleType);
      if (llParam) p.set('location', llParam);
      if (llParam && rad) p.set('radius', String(rad));
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${p.toString()}`;
      const r = await fetchWithTimeout(url, {}, 3500);
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        debugLog.push({ url, status: r.status, body: (txt || '').slice(0, 200) });
        return;
      }
      const d = await r.json();
      const arr = Array.isArray(d?.results) ? d.results : [];
      for (const it of arr) {
        add(it.place_id || it.id, it.name || '', it.formatted_address || '');
        if (results.size >= cap) break;
      }
    } catch (e) {
      debugLog.push({ step: 'textsearch', error: e.message });
    }
  };

  // Helper: Google Autocomplete
  const autoComplete = async (q, llParam = '', rad = '') => {
    try {
      const p = new URLSearchParams();
      p.set('input', q);
      p.set('key', apiKey);
      if (googleType) p.set('types', googleType);
      if (sessionToken) p.set('sessiontoken', sessionToken);
      if (llParam) p.set('location', llParam);
      if (llParam && rad) p.set('radius', String(rad));
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${p.toString()}`;
      const r = await fetchWithTimeout(url, {}, 3000);
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        debugLog.push({ url, status: r.status, body: (txt || '').slice(0, 200) });
        return;
      }
      const d = await r.json();
      const arr = Array.isArray(d?.predictions) ? d.predictions : [];
      for (const it of arr) {
        const name = it.structured_formatting?.main_text || it.terms?.[0]?.value || '';
        const address = it.structured_formatting?.secondary_text || it.description || '';
        add(it.place_id, name, address);
        if (results.size >= cap) break;
      }
    } catch (e) {
      debugLog.push({ step: 'autocomplete', error: e.message });
    }
  };

  const rVal = (typeof radius === 'string' || typeof radius === 'number') ? String(radius).trim() : '';
  const rad = rVal || (ll ? '20000' : '');

  // Strategy: if broad, prefer Text Search first; otherwise Autocomplete first
  const combinedQuery = nearStr && !ll ? `${query} ${nearStr}` : query;
  if (broad) {
    if (ll) await textSearch(query, ll, rad);
    if (results.size < cap) await textSearch(combinedQuery, '', '');
    if (results.size < cap) await autoComplete(query, ll, rad);
  } else {
    await autoComplete(query, ll, rad);
    if (results.size < cap) {
      if (ll) await textSearch(query, ll, rad);
      if (results.size < cap) await textSearch(combinedQuery, '', '');
    }
  }

  return Array.from(results.values()).slice(0, cap);
}

module.exports = router;

