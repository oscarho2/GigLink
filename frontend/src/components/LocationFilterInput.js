import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TextField, Paper, List, ListItem, ListItemText } from '@mui/material';

// Minimal, custom-built suggestion input for location filtering
// - No loading indicator
// - Dropdown appears only after debounce + response
// - First result pre-selected; Enter confirms
// - Up/Down to navigate; Esc closes
export default function LocationFilterInput({
  value = '',
  onChange,
  placeholder = 'Search locations',
  label = 'Location',
  disabled = false,
  debounceMs = 350,
  limit = 12,
  endpoint = '/api/gigs/locations',
  mapOption = (s) => {
    const label = String(s.label || '').trim();
    const parts = label.split(',').map(p => p.trim()).filter(Boolean);
    return { id: label, value: label, primary: parts[0] || label, secondary: parts.slice(1).join(', '), raw: s };
  },
  returnRaw = false,
}) {
  const [inputValue, setInputValue] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const listRef = useRef(null);
  const lastQueryRef = useRef('');

  // Keep inputValue in sync with value prop changes
  useEffect(() => { setInputValue(value || ''); }, [value]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  // Scroll to the selected item when selection changes
  useEffect(() => {
    if (!open || !items.length || index < 0 || !listRef.current) return;
    const node = listRef.current.children[index];
    if (node) node.scrollIntoView({ block: 'nearest' });
  }, [open, items.length, index]);

  const fetchSuggestions = useCallback(async (q) => {
    const query = (q || '').trim();
    lastQueryRef.current = query;
    if (!query || query.length < 2) {
      setItems([]);
      setOpen(false);
      setIndex(0);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const params = new URLSearchParams({ q: query, limit: String(limit) });
      const url = `${endpoint}?${params.toString()}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error('Bad response');
      const data = await res.json();
      const stats = Array.isArray(data?.locationStats) ? data.locationStats : [];
      if (lastQueryRef.current !== query) return; // stale response

      const mapped = stats.map(mapOption);
      setItems(mapped);
      setOpen(mapped.length > 0);
      setIndex(mapped.length ? 0 : -1);
    } catch (e) {
      if (e.name !== 'AbortError') {
        setItems([]);
        setOpen(false);
        setIndex(0);
      }
    } finally {
      abortRef.current = null;
    }
  }, [limit]);

  // Debounce typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setOpen(false);
    setItems([]);
    setIndex(0);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(inputValue);
      debounceRef.current = null;
    }, debounceMs);
    return () => { if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; } };
  }, [inputValue, debounceMs, fetchSuggestions]);

  const commit = useCallback((opt) => {
    if (!opt) return;
    setInputValue(opt.value);
    setOpen(false);
    setIndex(0);
    onChange && onChange(returnRaw ? opt.raw : opt.value);
  }, [onChange, returnRaw]);

  const onKeyDown = (e) => {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); commit(items[index] || items[0]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div style={{ position: 'relative' }}>
      <TextField
        fullWidth
        value={inputValue}
        label={label}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => { if (items.length) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        autoComplete="off"
      />
      {open && items.length > 0 && (
        <Paper
          elevation={8}
          style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1300, maxHeight: 280, overflow: 'hidden' }}
        >
          <List dense ref={listRef} style={{ maxHeight: 280, overflowY: 'auto' }}>
            {items.map((opt, i) => (
              <ListItem
                key={opt.id}
                button
                selected={i === index}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => commit(opt)}
                sx={{
                  cursor: 'pointer',
                  backgroundColor: i === index ? '#f5f5f5' : 'transparent',
                  '&:hover': { backgroundColor: i === index ? '#f5f5f5' : 'action.hover' },
                }}
              >
                <ListItemText primary={opt.primary} secondary={opt.secondary} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </div>
  );
}
