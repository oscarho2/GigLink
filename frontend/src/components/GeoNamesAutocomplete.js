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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const timeoutRef = useRef(null);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  // Fallback cities for UK when GeoNames API fails
  const fallbackCities = [
    'London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Sheffield', 
    'Bristol', 'Glasgow', 'Edinburgh', 'Newcastle', 'Cardiff', 'Belfast',
    'Nottingham', 'Leicester', 'Coventry', 'Bradford', 'Stoke-on-Trent',
    'Wolverhampton', 'Plymouth', 'Southampton', 'Reading', 'Derby',
    'Dudley', 'Northampton', 'Portsmouth', 'Norwich', 'Luton', 'Solihull',
    'Islington', 'Aberdeen', 'Bournemouth', 'Swindon', 'Huddersfield',
    'Poole', 'Oxford', 'Middlesbrough', 'Blackpool', 'Bolton', 'Ipswich',
    'York', 'West Bromwich', 'Telford', 'Exeter', 'Chelmsford', 'Basildon',
    'Gloucester', 'Crawley', 'Worthing', 'Cambridge'
  ];

  // GeoNames API configuration
  // NOTE: Using 'demo' username for testing. For production:
  // 1. Register for a free GeoNames account at https://www.geonames.org/login
  // 2. Enable web services in your account settings
  // 3. Replace 'demo' with your actual GeoNames username
  const GEONAMES_USERNAME = 'oscarho'; // Using demo for testing - replace with your username for production
  const GEONAMES_API_URL = 'http://api.geonames.org/searchJSON'; // Note: HTTPS may have CORS issues in development

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const fetchSuggestions = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        name_startsWith: query,
        featureClass: 'P', // Populated places (cities, towns, villages)
        country: 'GB', // Restrict to UK
        maxRows: 10,
        username: GEONAMES_USERNAME,
        style: 'SHORT'
      });

      const response = await fetch(`${GEONAMES_API_URL}?${params}`);
      const data = await response.json();

      if (data.status) {
        // Handle GeoNames API errors
        console.error('GeoNames API Error:', data.status.message);
        if (data.status.value === 18) {
          console.warn('Demo account daily limit exceeded. Using UK fallback cities.');
        }
        
        // Use UK fallback cities when API fails
        const cityRegionMap = {
          'London': 'England',
          'Manchester': 'Greater Manchester',
          'Birmingham': 'West Midlands',
          'Liverpool': 'Merseyside',
          'Leeds': 'West Yorkshire',
          'Sheffield': 'South Yorkshire',
          'Bristol': 'England',
          'Glasgow': 'Scotland',
          'Edinburgh': 'Scotland',
          'Newcastle': 'Tyne and Wear',
          'Cardiff': 'Wales',
          'Belfast': 'Northern Ireland'
        };
        
        const filteredCities = fallbackCities
          .filter(city => city.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 10)
          .map((city, index) => {
            const region = cityRegionMap[city] || 'England';
            return {
              id: `fallback-${index}`,
              name: city,
              adminName1: region,
              countryName: 'United Kingdom',
              displayName: city
            };
          });
        
        // Remove duplicates based on displayName
        const uniqueFallbackCities = filteredCities.filter((item, index, self) => 
          index === self.findIndex(t => t.displayName === item.displayName)
        );
        
        setSuggestions(uniqueFallbackCities);
         setShowSuggestions(uniqueFallbackCities.length > 0);
         setSelectedIndex(-1);
        return;
      }

      if (data.geonames) {
        const formattedSuggestions = data.geonames.map(item => {
          return {
              id: item.geonameId,
              name: item.name,
              adminName1: item.adminName1 || '', // County/Region
              countryName: item.countryName,
              displayName: item.name
            };
        });
        
        // Remove duplicates based on displayName
        const uniqueSuggestions = formattedSuggestions.filter((item, index, self) => 
          index === self.findIndex(t => t.displayName === item.displayName)
        );
        
        setSuggestions(uniqueSuggestions);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Error fetching GeoNames data:', error);
      console.warn('GeoNames API request failed. Using UK fallback cities.');
      
      // Use UK fallback cities when network request fails
      const cityRegionMap = {
        'London': 'England',
        'Manchester': 'Greater Manchester',
        'Birmingham': 'West Midlands',
        'Liverpool': 'Merseyside',
        'Leeds': 'West Yorkshire',
        'Sheffield': 'South Yorkshire',
        'Bristol': 'England',
        'Glasgow': 'Scotland',
        'Edinburgh': 'Scotland',
        'Newcastle': 'Tyne and Wear',
        'Cardiff': 'Wales',
        'Belfast': 'Northern Ireland'
      };
      
      const filteredCities = fallbackCities
        .filter(city => city.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10)
        .map((city, index) => {
          const region = cityRegionMap[city] || 'England';
          return {
            id: `fallback-${index}`,
            name: city,
            adminName1: region,
            countryName: 'United Kingdom',
            displayName: city
          };
        });
      
      // Remove duplicates based on displayName
      const uniqueFallbackCities = filteredCities.filter((item, index, self) => 
        index === self.findIndex(t => t.displayName === item.displayName)
      );
      
      setSuggestions(uniqueFallbackCities);
      setShowSuggestions(uniqueFallbackCities.length > 0);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1); // Reset selection when typing

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce API calls
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const scrollToSelectedItem = (index) => {
    if (listRef.current && index >= 0) {
      const listElement = listRef.current;
      const selectedElement = listElement.children[index];
      if (selectedElement) {
        const listRect = listElement.getBoundingClientRect();
        const itemRect = selectedElement.getBoundingClientRect();
        
        if (itemRect.bottom > listRect.bottom) {
          // Scroll down if item is below visible area
          listElement.scrollTop += itemRect.bottom - listRect.bottom;
        } else if (itemRect.top < listRect.top) {
          // Scroll up if item is above visible area
          listElement.scrollTop -= listRect.top - itemRect.top;
        }
      }
    }
  };

  const handleKeyDown = (event) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = prev < suggestions.length - 1 ? prev + 1 : 0;
          setTimeout(() => scrollToSelectedItem(newIndex), 0);
          return newIndex;
        });
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : suggestions.length - 1;
          setTimeout(() => scrollToSelectedItem(newIndex), 0);
          return newIndex;
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
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

 const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion.name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (onChange) {
      onChange(suggestion.name);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for click events
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
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
          <List dense ref={listRef}>
            {suggestions.map((suggestion, index) => (
              <ListItem
                key={suggestion.id}
                button
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedIndex === index ? '#e3f2fd' : 'transparent',
                  '&:hover': {
                    backgroundColor: selectedIndex === index ? '#e3f2fd' : '#f5f5f5'
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