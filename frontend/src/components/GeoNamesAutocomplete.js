import React, { useState, useEffect, useRef } from 'react';
import { TextField, Paper, List, ListItem, ListItemText, CircularProgress } from '@mui/material';

const GeoNamesAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "Enter location", 
  style = {},
  disabled = false 
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef(null);
  const containerRef = useRef(null);

  // GeoNames API configuration
  // NOTE: Register for a free GeoNames account at https://www.geonames.org/login
  // After registration, enable web services in your account settings
  // Replace 'demo' with your actual GeoNames username
  const GEONAMES_USERNAME = 'demo'; // TODO: Replace with your GeoNames username
  const GEONAMES_API_URL = 'http://api.geonames.org/searchJSON';

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const fetchSuggestions = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        name_startsWith: query,
        country: 'GB', // UK only
        featureClass: 'P', // Populated places (cities, towns, villages)
        maxRows: 10,
        username: GEONAMES_USERNAME,
        style: 'SHORT'
      });

      const response = await fetch(`${GEONAMES_API_URL}?${params}`);
      const data = await response.json();

      if (data.geonames) {
        const formattedSuggestions = data.geonames.map(item => ({
          id: item.geonameId,
          name: item.name,
          adminName1: item.adminName1, // County/Region
          countryName: item.countryName,
          displayName: `${item.name}${item.adminName1 ? `, ${item.adminName1}` : ''}, ${item.countryName}`
        }));
        setSuggestions(formattedSuggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching GeoNames data:', error);
      setSuggestions([]);
      setShowSuggestions(false);
      
      // Show user-friendly error message for common issues
      if (error.message.includes('Failed to fetch')) {
        console.warn('GeoNames API request failed. This may be due to CORS issues or network problems.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const newValue = event.target.value;
    setInputValue(newValue);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce API calls
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion.name);
    setShowSuggestions(false);
    setSuggestions([]);
    if (onChange) {
      onChange(suggestion.name);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      <TextField
        fullWidth
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        disabled={disabled}
        InputProps={{
          endAdornment: loading && <CircularProgress size={20} />
        }}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <Paper
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: '200px',
            overflow: 'auto'
          }}
          elevation={3}
        >
          <List dense>
            {suggestions.map((suggestion) => (
              <ListItem
                key={suggestion.id}
                button
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: '#f5f5f5'
                  }
                }}
              >
                <ListItemText
                  primary={suggestion.displayName}
                  style={{ fontSize: '14px' }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </div>
  );
};

export default GeoNamesAutocomplete;