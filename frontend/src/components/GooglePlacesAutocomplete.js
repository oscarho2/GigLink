import React, { useState, useRef, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';

const GOOGLE_PLACES_API_KEY = process.env.REACT_APP_GOOGLE_PLACES_API_KEY;

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

const GooglePlacesAutocomplete = ({ value, onChange, placeholder = "Enter location", style = {}, disabled = false }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef(null);

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoading(true);
    try {
      await loadGoogleMapsScript(GOOGLE_PLACES_API_KEY);
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        setSuggestions([]);
        setShowSuggestions(false);
        setLoading(false);
        return;
      }
      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: query,
          types: ['(cities)'],
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions.map(pred => pred.description));
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
          setLoading(false);
        }
      );
    } catch (err) {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    onChange && onChange(suggestion);
  };

  // Keep inputValue in sync with value prop
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  return (
    <div style={{ position: 'relative', ...style }}>
      <TextField
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        fullWidth
        disabled={disabled}
        autoComplete="off"
      />
      {loading && <CircularProgress size={20} style={{ position: 'absolute', right: 10, top: 10 }} />}
      {showSuggestions && suggestions.length > 0 && (
        <List style={{ position: 'absolute', zIndex: 10, background: '#fff', width: '100%', maxHeight: 200, overflowY: 'auto', border: '1px solid #ccc' }}>
          {suggestions.map((suggestion, idx) => (
            <ListItem button key={idx} onClick={() => handleSuggestionClick(suggestion)}>
              <ListItemText primary={suggestion} />
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
