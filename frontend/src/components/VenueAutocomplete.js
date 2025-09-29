import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, TextField, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function VenueAutocomplete({ value, onChange, near, onLocationChange, global = true, label = 'Venue', placeholder = 'Search venues' }) {
  const [input, setInput] = useState(value || '');
  const valueRef = useRef(value);
  
  // Update valueRef when value prop changes
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const sessionRef = useRef('');
  const [open, setOpen] = useState(false);
  const [ll, setLl] = useState('');
  const focusedRef = useRef(false);
  const suppressNextOpenRef = useRef(false);

  const ensureSession = () => {
    if (sessionRef.current && sessionRef.current.length === 32) return sessionRef.current;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = '';
    for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
    sessionRef.current = s;
    return s;
  };

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
    return addr || '';
  };

  const hasStreetInAddress = (addr) => {
    const a = String(addr || '');
    if (!a) return false;
    if (/\d{1,5}/.test(a)) return true;
    if (/\b(st|street|rd|road|ave|avenue|blvd|drive|dr|ln|lane|way|place|pl|ct|court)\b/i.test(a)) return true;
    return false;
  };

  useEffect(() => { setInput(value || ''); }, [value]);

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
    const effectiveNear = derivedNear || (near && near.trim() ? near.trim() : '');
    const effectiveQuery = q.length >= 1 ? q : (effectiveNear ? 'venue' : '');
    if (!effectiveQuery || effectiveQuery.trim().length < 2) { setOptions([]); setOpen(false); return () => { active = false; controller.abort(); }; }
    setOpen(true);
    const t = setTimeout(async () => {
      let abortTimer;
      try {
        setLoading(true);
        const params = new URLSearchParams({ q: effectiveQuery, limit: '100', types: 'place', session_token: ensureSession() });
        if (endedWithSpace && q.length >= 1) {
          params.set('broad', '1');
        }
        if (!effectiveNear && global) {
          params.set('global', '1');
        }
        if (effectiveNear) {
          params.set('near', effectiveNear);
          params.set('radius', '50000');
        } else if (!endedWithSpace && ll) {
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

  const selected = useMemo(() => {
    if (!input) return null;
    // First check if the current input matches any option exactly
    const existing = options.find(o => `${o.name}, ${o.address}` === input || o.name === input);
    if (existing) return existing;
    
    // If not, check if it matches the value prop
    if (value) {
      const valueMatch = options.find(o => `${o.name}, ${o.address}` === value || o.name === value);
      if (valueMatch) return valueMatch;
    }
    
    // If no matches, create a custom option based on input
    return { id: input, name: input, address: '' };
  }, [value, input, options]);

  const handleSelectOption = (option) => {
    if (!option) return;
    
    const addr = option.address || '';
    const isCity = !hasStreetInAddress(addr);
    
    // For all selections, show the full information in the input
    const fullDisplay = addr ? `${option.name}, ${addr}` : option.name;
    if (onChange) onChange(fullDisplay);
    
    // Handle location change for backend
    const loc = deriveLocationFromAddress(addr) || addr;
    if (onLocationChange && loc) onLocationChange(loc);
    
    // Update input to show full information
    setInput(fullDisplay);
    
    setOpen(false);
    setOptions([]);
    suppressNextOpenRef.current = true;
    try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch {}
  };

  const handleCustomInput = (inputValue) => {
    const raw = (inputValue || '').trim();
    if (raw) {
      const formatted = raw.split(', ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(', ');
      if (onChange) onChange(formatted);
      if (onLocationChange) onLocationChange(formatted);
    }
    setOpen(false);
    setOptions([]);
    try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch {}
  };

  return (
    <Autocomplete
      freeSolo
      disableClearable
      ListboxProps={{ style: { maxHeight: 560, overflow: 'auto' } }}
      open={open}
      onOpen={() => {
        if (suppressNextOpenRef.current) { suppressNextOpenRef.current = false; setOpen(false); return; }
        if (((input || '').trim().length >= 1) || options.length > 0) setOpen(true);
      }}
      onClose={() => setOpen(false)}
      noOptionsText={input && input.trim().length >= 1 ? 'No venues found' : 'Type to search venues'}
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
      getOptionLabel={(opt) => {
        if (typeof opt === 'string') return opt;
        if (opt?.name && opt?.address) {
          return `${opt.name}, ${opt.address}`;
        }
        return opt?.name || '';
      }}
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
          handleSelectOption(v);
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
        if (reason !== 'reset') {
          if ((v || '').trim().length >= 1) setOpen(true); else setOpen(false);
        }
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
            // Handle backspace key specifically to ensure it works when editing existing values
            if (e.key === 'Backspace') {
              // Allow default behavior to continue
              return;
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
