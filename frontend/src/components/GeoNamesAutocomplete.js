import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { TextField, Paper, List, ListItem, ListItemText, CircularProgress, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const GeoNamesAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "Enter location", 
  style = {},
  disabled = false 
}) => {
  const [inputValue, setInputValue] = useState(() => {
    const cleanValue = value && value.trim() && value !== 'Location not specified' ? value : '';
    return cleanValue;
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const timeoutRef = useRef(null);
  const containerRef = useRef(null);
  const listRef = useRef(null);



  // GeoNames API configuration
  // NOTE: Using 'demo' username for testing. For production:
  // 1. Register for a free GeoNames account at https://www.geonames.org/login
  // 2. Enable web services in your account settings
  // 3. Replace 'demo' with your actual GeoNames username
  const GEONAMES_USERNAME = process.env.REACT_APP_GEONAMES_USERNAME || 'oscarho'; // Using demo for testing - replace with your username for production
  const GEONAMES_API_URL = 'https://secure.geonames.org/searchJSON'; // Using HTTPS to avoid CORS issues

  useEffect(() => {
    const cleanValue = value && value.trim() && value !== 'Location not specified' ? value : '';
    setInputValue(cleanValue);
    if (cleanValue) {
      fetchSuggestions(cleanValue);
    }
  }, [value, fetchSuggestions]);

  const scrollToSelectedItem = useCallback((index) => {
    if (listRef.current && index >= 0 && index < suggestions.length) {
      const listElement = listRef.current;
      const selectedElement = listElement.children[index];
      if (selectedElement) {
        try {
          // Use scrollIntoView for the most reliable cross-browser scrolling
          selectedElement.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth'
          });
        } catch (e) {
          // Fallback for browsers that don't support scrollIntoView options
          const itemTop = selectedElement.offsetTop;
          const itemHeight = selectedElement.offsetHeight;
          const listHeight = listElement.clientHeight;
          const scrollTop = listElement.scrollTop;
          
          // If item is below visible area, scroll down
          if (itemTop + itemHeight > scrollTop + listHeight) {
            listElement.scrollTop = itemTop + itemHeight - listHeight;
          }
          // If item is above visible area, scroll up
          else if (itemTop < scrollTop) {
            listElement.scrollTop = itemTop;
          }
        }
      }
    }
  }, [suggestions.length]);

  // Scroll to selected item when selection changes
  useEffect(() => {
    if (showSuggestions && selectedIndex >= 0 && suggestions.length > 0) {
      requestAnimationFrame(() => scrollToSelectedItem(selectedIndex));
    }
  }, [selectedIndex, showSuggestions, suggestions.length, scrollToSelectedItem]);

  const fetchSuggestions = useCallback(async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(0); // Preselect first option when resetting
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        name_startsWith: query,
        featureClass: 'P', // Populated places (cities, towns, villages)
        maxRows: 10,
        username: GEONAMES_USERNAME,
        style: 'MEDIUM', // include adminName / country
        orderby: 'population'
      });

      const response = await fetch(`${GEONAMES_API_URL}?${params}`);
      const data = await response.json();

      if (data.status) {
        // Handle GeoNames API errors
        console.error('GeoNames API Error:', data.status.message);
        if (data.status.value === 18) {
          console.warn('Demo account daily limit exceeded. Using UK fallback cities.');
        }
        

      }

      if (data.geonames) {
        const formattedSuggestions = data.geonames.map(item => {
          const city = item.name || '';
          const region = item.adminName1 || '';
          const country = item.countryName || '';
          const displayName = [city, region, country].filter(Boolean).join(', ');
          return {
            id: item.geonameId,
            name: city,
            adminName1: region,
            countryName: country,
            displayName
          };
        });
        
        // Remove duplicates based on displayName
        let uniqueSuggestions = formattedSuggestions.filter((item, index, self) => 
          index === self.findIndex(t => t.displayName === item.displayName)
        );

        // Bring entries containing "United States" to the top in the order they appeared
        const priorityMatches = uniqueSuggestions.filter(item => item.displayName.toLowerCase().includes('united states'));
        if (priorityMatches.length > 0) {
          const remaining = uniqueSuggestions.filter(item => !priorityMatches.includes(item));
          uniqueSuggestions = [...priorityMatches, ...remaining];
        }

        setSuggestions(uniqueSuggestions);
        setShowSuggestions(true);
        setSelectedIndex(0); // Preselect the first option
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(0); // Keep first option selected even when no suggestions
      }
    } catch (error) {
      console.error('Error fetching GeoNames data:', error);

    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback((event) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    setSelectedIndex(0); // Preselect first option when typing

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce API calls
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  }, [fetchSuggestions]);

  const handleKeyDown = (event) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        break;
      case 'Home':
        event.preventDefault();
        if (showSuggestions && suggestions.length > 0) {
          setSelectedIndex(0);
        }
        break;
      case 'End':
        event.preventDefault();
        if (showSuggestions && suggestions.length > 0) {
          setSelectedIndex(suggestions.length - 1);
        }
        break;
      case 'PageDown':
        event.preventDefault();
        setSelectedIndex(prev => {
          const increment = Math.min(5, suggestions.length - 1);
          return Math.min(prev + increment, suggestions.length - 1);
        });
        break;
      case 'PageUp':
        event.preventDefault();
        setSelectedIndex(prev => {
          const decrement = Math.min(5, prev);
          return Math.max(prev - decrement, 0);
        });
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(0); // Reset to first option instead of -1
        break;
      default:
        break;
    }
  };

 const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion.displayName || suggestion.name);
    setShowSuggestions(false);
    setSelectedIndex(0); // Reset to first option
    if (onChange) {
      onChange(suggestion);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for click events
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(0); // Reset to first option
    }, 150);
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
        onKeyDown={handleKeyDown}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-haspopup="listbox"
        aria-activedescendant={showSuggestions && selectedIndex >= 0 && suggestions.length > 0 ? `suggestion-${selectedIndex}` : undefined}
        InputProps={{
          endAdornment: (
            <>
              {loading && <CircularProgress size={20} />}
              {inputValue && (
                <IconButton
                  aria-label="clear location"
                  size="small"
                  onClick={() => {
                    setInputValue('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                    if (onChange) onChange(null);
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </>
          )
        }}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <Paper
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300, // Higher z-index to ensure it appears above other elements
            maxHeight: '300px', // Increased height for better visibility
            overflow: 'hidden', // Hide overflow on the Paper to let List handle scrolling
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)' // Better shadow
          }}
          elevation={8}
        >
          <List 
            dense 
            ref={listRef}
            role="listbox"
            style={{
              maxHeight: '300px',
              overflow: 'auto',
              scrollBehavior: 'smooth' // Enable smooth scrolling
            }}
          >
            {suggestions.map((suggestion, index) => (
              <ListItem
                key={suggestion.id}
                id={`suggestion-${index}`}
                button
                onClick={() => handleSuggestionClick(suggestion)}
                selected={selectedIndex === index}
                role="option"
                aria-selected={selectedIndex === index}
                sx={{
                  cursor: 'pointer',
                  backgroundColor: selectedIndex === index ? '#f5f5f5' : 'transparent', // Light grey for selected
                  '&:hover': {
                    backgroundColor: selectedIndex === index ? '#f5f5f5' : 'action.hover'
                  },
                  '&.Mui-selected': {
                    backgroundColor: '#f5f5f5', // Light grey for selected
                    '&:hover': {
                      backgroundColor: '#f5f5f5'
                    }
                  },
                  transition: 'background-color 0.15s ease'
                }}
              >
                <ListItemText
                  primary={suggestion.name}
                  secondary={[suggestion.adminName1, suggestion.countryName].filter(Boolean).join(', ')}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                  secondaryTypographyProps={{ fontSize: 12, color: 'text.secondary' }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </div>
  );
};

export default memo(GeoNamesAutocomplete);
