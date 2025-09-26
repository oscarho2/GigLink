import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, TextField, Box, IconButton } from '@mui/material';
import { formatLocationString } from '../utils/text';
import CloseIcon from '@mui/icons-material/Close';

export default function VenueAutocomplete({ value, onChange, near, onLocationChange, global = true, label = 'Venue', placeholder = 'Search venues' }) {
  const [input, setInput] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const sessionRef = useRef('');
  const [open, setOpen] = useState(false);
  const [ll, setLl] = useState('');
  const focusedRef = useRef(false);
  const suppressNextOpenRef = useRef(false);

  // Intentionally no geolocation/near bias: global autocomplete

  const ensureSession = () => {
    if (sessionRef.current && sessionRef.current.length === 32) return sessionRef.current;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = '';
    for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
    sessionRef.current = s;
    return s;
  };

  // Parse patterns like:
  // - "Venue, City"
  // - "Venue in City"
  // - "Venue - City"
  // - "Venue (City)"
  const parseInput = (raw) => {
    const s = (raw || '').trim();
    if (!s) return { cleanQuery: '', derivedNear: '' };
    const commaIdx = s.lastIndexOf(',');
    if (commaIdx > -1 && commaIdx < s.length - 1) {
      const left = s.slice(0, commaIdx).trim();
      const right = s.slice(commaIdx + 1).trim();
      if (left && right) return { cleanQuery: left, derivedNear: right };
    }
    const inIdx = s.toLowerCase().lastIndexOf(' in ');
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
  };

  const deriveLocationFromAddress = (addr) => {
    // Preserve the full address (including street if present) but fix capitalization
    return formatLocationString(addr || '');
  };

  const hasStreetInAddress = (addr) => {
    const a = String(addr || '');
    if (!a) return false;
    if (/\d{1,5}/.test(a)) return true;
    if (/\b(st|street|rd|road|ave|avenue|blvd|drive|dr|ln|lane|way|place|pl|ct|court)\b/i.test(a)) return true;
    return false;
  };

  useEffect(() => { setInput(value || ''); }, [value]);

  // Try to bias by user's current location (like Google Maps) when no near is provided
  useEffect(() => {
    if (!navigator.geolocation) return;
    const opts = { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        if (typeof lat === 'number' && typeof lng === 'number') {
          setLl(`${lat},${lng}`);
        }
      },
      () => {},
      opts
    );
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const { cleanQuery, derivedNear } = parseInput(input);
    const endedWithSpace = /\s$/.test(input || '');
    const q = (cleanQuery || '').trim();
    if (suppressNextOpenRef.current) {
      suppressNextOpenRef.current = false;
      return () => { active = false; controller.abort(); };
    }
    if (!focusedRef.current) { setOptions([]); setOpen(false); return () => { active = false; controller.abort(); }; }
    // Compute location-aware fallback query: if user hasn't typed a venue but provided a location,
    // query generic venues for that area.
    const effectiveNear = derivedNear || (near && near.trim() ? near.trim() : '');
    const effectiveQuery = q.length >= 1 ? q : (effectiveNear ? 'venue' : '');
    if (!effectiveQuery || effectiveQuery.trim().length < 2) { setOptions([]); setOpen(false); return () => { active = false; controller.abort(); }; }
    setOpen(true);
    const t = setTimeout(async () => {
      let abortTimer;
      try {
        setLoading(true);
        // Autocomplete request with optional near derived from user input or parent
        const params = new URLSearchParams({ q: effectiveQuery, limit: '100', types: 'place', session_token: ensureSession() });
        // If the user ended the token with a space, switch to broad search mode to return more matches
        if (endedWithSpace && q.length >= 1) {
          params.set('broad', '1');
        }
        if (!effectiveNear && global) {
          params.set('global', '1');
        }
        if (effectiveNear) {
          params.set('near', effectiveNear);
          // Expand the considered area to ~50km
          params.set('radius', '50000');
        } else if (!endedWithSpace && ll) {
          // Use precise coordinate bias if available and no near provided
          params.set('ll', ll);
        }
        abortTimer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`/api/venues/suggest?${params.toString()}`, { signal: controller.signal });
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          const opts = Array.isArray(data?.results) ? data.results : [];
          setOptions(opts);
          setOpen(opts.length > 0);
        } else {
          setOptions([]);
          setOpen(false);
        }
      } catch (e) {
        if (e.name !== 'AbortError') setOptions([]);
        setOpen(false);
      } finally {
        if (abortTimer) clearTimeout(abortTimer);
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(t); controller.abort(); };
  }, [input]);

  // current selected value object for Autocomplete
  const selected = useMemo(() => {
    if (!value) return null;
    const existing = options.find(o => o.name === value);
    return existing || { id: value, name: value, address: '' };
  }, [value, options]);

  return (
    <Autocomplete
      freeSolo
      autoHighlight
      selectOnFocus
      clearOnBlur
      handleHomeEndKeys
      disableClearable
      ListboxProps={{ style: { maxHeight: 560, overflow: 'auto' } }}
      open={open}
      onOpen={() => {
        if (suppressNextOpenRef.current) { suppressNextOpenRef.current = false; setOpen(false); return; }
        if (((input || '').trim().length >= 1) || options.length > 0) setOpen(true);
      }}
      onClose={() => setOpen(false)}
      noOptionsText={input && input.trim().length >= 1 ? 'No venues found' : 'Type to search venues'}
      // Filter by what the user typed first; prioritize name startsWith/word-start
      filterOptions={(options, state) => {
        const getLabel = (opt) => (typeof opt === 'string' ? opt : (opt?.name || ''));
        const getAddress = (opt) => (typeof opt === 'string' ? '' : (opt?.address || ''));
        const norm = (s) => (s || '')
          .normalize('NFD')
          .replace(/\p{Diacritic}+/gu, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();
        const qRaw = (state?.inputValue || '').trim();
        const { cleanQuery: cq } = parseInput(qRaw);
        const q = norm(cq);
        if (!q) return options;

        const qTokens = q.split(/\s+/).filter(Boolean);
        const filtered = options.filter((opt) => {
          const nameN = norm(getLabel(opt));
          const addrN = norm(getAddress(opt));
          // All tokens must appear somewhere in name or address
          return qTokens.every(tok => nameN.includes(tok) || addrN.includes(tok));
        });

        const score = (nameN, addrN) => {
          if (nameN.startsWith(q)) return 0;
          const words = nameN.split(/\s+/).filter(Boolean);
          if (words.some(w => w.startsWith(q))) return 1;
          if (nameN.includes(q)) return 2;
          if (addrN.includes(q)) return 3;
          return 4;
        };

        return filtered.slice().sort((a, b) => {
          const an = norm(getLabel(a));
          const bn = norm(getLabel(b));
          const aa = norm(getAddress(a));
          const bb = norm(getAddress(b));
          const sa = score(an, aa);
          const sb = score(bn, bb);
          if (sa !== sb) return sa - sb;
          const ia = an.indexOf(q);
          const ib = bn.indexOf(q);
          if (ia !== ib) return ia - ib;
          return getLabel(a).length - getLabel(b).length;
        });
      }}
      options={options}
      // Do not show loading spinner in the field or dropdown
      getOptionLabel={(opt) => (typeof opt === 'string' ? opt : (opt?.name || ''))}
      isOptionEqualToValue={(opt, val) => (opt?.name || '') === (val?.name || '')}
      value={selected}
      onChange={(_e, v) => {
        if (typeof v === 'string') {
          const raw = v.trim();
          const { derivedNear } = parseInput(raw);
          if (derivedNear && onLocationChange) onLocationChange(deriveLocationFromAddress(derivedNear));
          onChange && onChange(raw);
          setOpen(false);
          setOptions([]);
          suppressNextOpenRef.current = true;
          try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch {}
        } else if (v && v.name) {
          const addr = v.address || '';
          const isCity = !hasStreetInAddress(addr);
          if (isCity) {
            const loc = deriveLocationFromAddress([v.name, addr].filter(Boolean).join(', '));
            onChange && onChange('');
            if (onLocationChange && loc) onLocationChange(loc);
            setInput('');
          } else {
            onChange && onChange(v.name);
            const loc = deriveLocationFromAddress(addr) || addr;
            if (onLocationChange && loc) onLocationChange(loc);
          }
          setOpen(false);
          setOptions([]);
          suppressNextOpenRef.current = true;
          try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch {}
        } else {
          onChange && onChange('');
          setOpen(false);
          setOptions([]);
          suppressNextOpenRef.current = true;
        }
      }}
      inputValue={input}
      onInputChange={(_e, v, reason) => {
        setInput(v || '');
        if ((v || '').trim().length >= 1) setOpen(true); else setOpen(false);
      }}
      renderOption={(props, option) => (
        <li {...props} key={option.id || option.name}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ fontSize: 14, fontWeight: 500 }}>{option.name}</Box>
            {option.address ? (
              <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{option.address}</Box>
            ) : null}
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => {
            focusedRef.current = false;
            const raw = (input || '').trim();
            if (!raw) { setOpen(false); setOptions([]); return; }
            setOpen(false);
            setOptions([]);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Select the top suggestion like map apps
              const top = options && options[0];
              e.preventDefault();
              e.stopPropagation();
              if (top && top.name) {
                const addr = top.address || '';
                const isCity = !hasStreetInAddress(addr);
                if (isCity) {
                  const loc = deriveLocationFromAddress([top.name, addr].filter(Boolean).join(', '));
                  if (onChange) onChange('');
                  if (onLocationChange && loc) onLocationChange(loc);
                  setInput('');
                } else {
                  if (onChange) onChange(top.name);
                  const loc = deriveLocationFromAddress(addr) || addr;
                  if (onLocationChange && loc) onLocationChange(loc);
                }
                setOpen(false);
                setOptions([]);
                // Hide keyboard focus dropdown
                try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch {}
              } else {
                // Accept typed value
                const raw = (input || '').trim();
                if (raw) {
                  const { derivedNear } = parseInput(raw);
                  if (derivedNear && onLocationChange) onLocationChange(deriveLocationFromAddress(derivedNear));
                  if (derivedNear && derivedNear.length === raw.length) {
                    if (onChange) onChange('');
                    setInput('');
                  } else {
                    if (onChange) onChange(raw);
                  }
                }
                setOpen(false);
                setOptions([]);
                try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch {}
              }
            }
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {((input && input.trim()) || (near && near.trim())) ? (
                  <IconButton
                    aria-label="clear venue and location"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onChange) onChange('');
                      if (onLocationChange) onLocationChange('');
                      setInput('');
                      setOptions([]);
                      setOpen(false);
                      suppressNextOpenRef.current = true;
                    }}
                    sx={{ mr: 0.5 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                ) : null}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
    />
  );
}
