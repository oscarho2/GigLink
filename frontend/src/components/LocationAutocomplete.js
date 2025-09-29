import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, TextField, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Dynamically load Google Maps JS API if not already loaded
function loadGoogleMapsScript(apiKey) {
  if (typeof window.google === 'object' && window.google.maps && window.google.maps.places) {
    return Promise.resolve();
  }
  if (document.getElementById('google-maps-script')) {
    return new Promise((resolve) => {
      document.getElementById('google-maps-script').addEventListener('load', resolve);
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function LocationAutocomplete({ value, onChange, label = 'Location', placeholder = 'Enter your city', disabled = false }) {
  const [input, setInput] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const focusedRef = useRef(false);
  const suppressNextOpenRef = useRef(false);

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
        // Load Google Maps script with API key from environment variable
        await loadGoogleMapsScript(process.env.REACT_APP_GOOGLE_PLACES_API_KEY);
        if (!window.google || !window.google.maps || !window.google.maps.places) {
          setOptions([]);
          setOpen(false);
          setLoading(false);
          return;
        }
        const service = new window.google.maps.places.AutocompleteService();
        service.getPlacePredictions({ 
          input: q, 
          types: ['(cities)'],
          fields: ['formatted_address', 'name', 'place_id']
        }, (predictions, status) => {
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
    if (!input) return null;
    // First check if the current input matches any option exactly
    const existing = options.find(o => o.name === input);
    if (existing) return existing;
    
    // If not, check if it matches the value prop
    if (value) {
      const valueMatch = options.find(o => o.name === value);
      if (valueMatch) return valueMatch;
    }
    
    // If no matches, create a custom option based on input
    return { id: input, name: input };
  }, [value, input, options]);

  const handleSelectOption = (option) => {
    if (!option || !option.name) return;
    
    if (onChange) onChange(option.name);
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
    }
    setOpen(false);
    setOptions([]);
    try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch {}
  };

  return (
    <Autocomplete
      freeSolo
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
