import React, { useState, useRef, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import axios from 'axios';
import { loadGoogleMapsScript } from '../utils/googleMaps';
import { buildLocationFromDescription } from '../utils/locationParsing';

const GOOGLE_PLACES_API_KEY = process.env.REACT_APP_GOOGLE_PLACES_API_KEY;

const LocationAutocomplete = ({ value, onChange, placeholder = "Enter location", style = {}, disabled = false }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [resolvingPlace, setResolvingPlace] = useState(false);
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
      const autoComplete = new window.google.maps.places.AutocompleteService();
      autoComplete.getPlacePredictions(
        {
          input: query,
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
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

  const resolvePlaceId = async (placeId, fallbackDescription) => {
    if (!placeId) {
      return buildLocationFromDescription(fallbackDescription);
    }

    try {
      setResolvingPlace(true);
      const response = await axios.post('/api/locations/resolve', { place_id: placeId });
      const location = response.data?.location;
      if (location && typeof location === 'object') {
        if (!location.placeId) location.placeId = placeId;
        return location;
      }
    } catch (error) {
      console.error('Failed to resolve place_id on server:', error);
    } finally {
      setResolvingPlace(false);
    }

    const fallbackLocation = buildLocationFromDescription(fallbackDescription);
    if (fallbackLocation && typeof fallbackLocation === 'object') {
      fallbackLocation.placeId = placeId || fallbackLocation.placeId || '';
    }
    return fallbackLocation;
  };

  const handleSuggestionClick = async (suggestion) => {
    const fallbackDescription = suggestion.description || inputValue;
    setInputValue(fallbackDescription);
    setShowSuggestions(false);

    const location = await resolvePlaceId(suggestion.place_id, fallbackDescription);
    onChange && onChange(location);
    setInputValue(location.name || fallbackDescription);
  };

  // Keep inputValue in sync with value prop
  useEffect(() => {
    if (value && typeof value === 'object') {
      const display = value.name || [value.city, value.region, value.country].filter(Boolean).join(', ');
      setInputValue(display);
    } else {
      setInputValue(value || '');
    }
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
        onKeyDown={(e) => {
          // Handle backspace key specifically to ensure it works when editing existing values
          if (e.key === 'Backspace') {
            // Allow default behavior to continue
            return;
          }
        }}
      />
      {(loading || resolvingPlace) && <CircularProgress size={20} style={{ position: 'absolute', right: 10, top: 10 }} />}
      {showSuggestions && suggestions.length > 0 && (
        <List style={{ position: 'absolute', zIndex: 10, background: '#fff', width: '100%', maxHeight: 200, overflowY: 'auto', border: '1px solid #ccc' }}>
          {suggestions.map((suggestion, idx) => (
            <ListItem button key={idx} onClick={() => handleSuggestionClick(suggestion)}>
              <ListItemText primary={suggestion.description} />
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
};

export default LocationAutocomplete;
