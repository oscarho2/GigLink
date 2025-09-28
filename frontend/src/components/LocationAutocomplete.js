import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, TextField, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function LocationAutocomplete({ value, onChange, label = 'Location', placeholder = 'Enter your city', disabled = false }) {
  const [input, setInput] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const sessionRef = useRef('');
  const [open, setOpen] = useState(false);
  const focusedRef = useRef(false);
  const suppressNextOpenRef = useRef(false);

  // Google Places Autocomplete API (browser-side)
  const ensureSession = () => {
    if (sessionRef.current && sessionRef.current.length === 32) return sessionRef.current;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = '';
    for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
    sessionRef.current = s;
    return s;
  };

  useEffect(() => { setInput(value || ''); }, [value]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const q = (input || '').trim();
    if (suppressNextOpenRef.current) {
      suppressNextOpenRef.current = false;
      return () => { active = false; controller.abort(); };
    }
    if (!focusedRef.current) { setOptions([]); setOpen(false); return () => { active = false; controller.abort(); } }
    if (!q || q.length < 2) { setOptions([]); setOpen(false); return () => { active = false; controller.abort(); } }
    setOpen(true);
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        // Use Google Maps JS API for autocomplete
        if (!window.google || !window.google.maps || !window.google.maps.places) {
          setOptions([]);
          setOpen(false);
          setLoading(false);
          return;
        }
        const service = new window.google.maps.places.AutocompleteService();
        service.getPlacePredictions({ input: q, types: ['(cities)'] }, (predictions, status) => {
          if (!active) return;
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setOptions(predictions.map(pred => ({ id: pred.place_id, name: pred.description })));
            setOpen(true);
          } else {
            setOptions([]);
            setOpen(false);
          }
          setLoading(false);
        });
      } catch (e) {
        setOptions([]);
        setOpen(false);
        setLoading(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(t); controller.abort(); };
  }, [input]);

  const selected = useMemo(() => {
    if (!value) return null;
    const existing = options.find(o => o.name === value);
    return existing || { id: value, name: value };
  }, [value, options]);

  return (
    <Autocomplete
      freeSolo
      autoHighlight
      selectOnFocus
      clearOnBlur
      handleHomeEndKeys
      disableClearable
      ListboxProps={{ style: { maxHeight: 360, overflow: 'auto' } }}
      open={open}
      onOpen={() => {
        if (suppressNextOpenRef.current) { suppressNextOpenRef.current = false; setOpen(false); return; }
        if (((input || '').trim().length >= 1) || options.length > 0) setOpen(true);
      }}
      onClose={() => setOpen(false)}
      noOptionsText={input && input.trim().length >= 1 ? 'No locations found' : 'Type to search cities'}
      filterOptions={(options, state) => options}
      options={options}
      getOptionLabel={(opt) => (typeof opt === 'string' ? opt : (opt?.name || ''))}
      isOptionEqualToValue={(opt, val) => (opt?.name || '') === (val?.name || '')}
      value={selected}
      onChange={(_e, v) => {
        if (typeof v === 'string') {
          onChange && onChange(v.trim());
          setOpen(false);
          setOptions([]);
          suppressNextOpenRef.current = true;
          try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch {}
        } else if (v && v.name) {
          onChange && onChange(v.name);
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
          <Box sx={{ fontSize: 14, fontWeight: 500 }}>{option.name}</Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => {
            focusedRef.current = false;
            const raw = (input || '').trim();
            if (!raw) { setOpen(false); setOptions([]); return; }
            setOpen(false);
            setOptions([]);
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {(input && input.trim()) ? (
                  <IconButton
                    aria-label="clear location"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onChange) onChange('');
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
