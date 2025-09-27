import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Container, 
  Grid,
  Typography, 
  Paper, 
  Box, 
  Button, 
  Card, 
  CardContent,
  FormControlLabel,
  Switch, 
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Slider,
  CardActions,
  Avatar,
  IconButton,
  InputAdornment
} from '@mui/material';
import { CircularProgress } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { keyframes } from '@mui/system';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { formatPayment, getPaymentValue } from '../utils/currency';
import AddIcon from '@mui/icons-material/Add';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { formatLocationString } from '../utils/text';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/material_blue.css';
import '../styles/flatpickr-compact.css';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonIcon from '@mui/icons-material/Person';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { instrumentOptions, genreOptions } from '../constants/musicOptions';
import UserAvatar from '../components/UserAvatar';

// Define pulse animation
const pulse = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
`;

const Gigs = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [gigs, setGigs] = useState([]);
  // Infinite scroll state
  const [loadedCount, setLoadedCount] = useState(20);
  const loadStep = 20;
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);
  const gigsRef = useRef([]);
  const scrollDebounceRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('dateAsc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    minFee: 0,
    maxFee: Infinity,
    date: '',
    dateTo: '',
    instrument: '',
    genre: ''
  });
  const [showPastGigs, setShowPastGigs] = useState(false);
  
  // Dynamic filter options from backend
  const [locationOptions, setLocationOptions] = useState([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [loadingLocations, setLoadingLocations] = useState(false);


  // Helpers
  const getApplicantCount = (gig) => (gig?.applicantCount ?? (Array.isArray(gig?.applicants) ? gig.applicants.length : 0));
  const isGigOwner = (gig) => {
    const currentUserId = (user?.id || user?._id)?.toString();
    const gigUserId = (typeof gig?.user === 'object' && gig?.user !== null)
      ? ((gig.user._id || gig.user.id || gig.user)?.toString())
      : gig?.user?.toString();
    return !!(currentUserId && gigUserId && currentUserId === gigUserId);
  };



  // Fetch gigs (server-side filtering) with debounce
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const token = localStorage.getItem('token');

    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const params = {};
        if (searchTerm.trim()) params.q = searchTerm.trim();
        if (filters.instrument) params.instruments = filters.instrument;
        if (filters.genre) params.genres = filters.genre;
        if (filters.location) params.location = filters.location;
        const today = new Date().toISOString().slice(0, 10);
        if (filters.date) {
          params.dateFrom = filters.date; // YYYY-MM-DD
        } else if (!showPastGigs) {
          params.dateFrom = today;
        }
        if (filters.dateTo) params.dateTo = filters.dateTo;

        const response = await axios.get('/api/gigs', {
          params,
          signal: controller.signal,
          headers: token ? { 'x-auth-token': token } : undefined
        });
        if (active) setGigs(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (active && err.name !== 'CanceledError') {
          console.error('Error fetching gigs:', err);
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(t);
      controller.abort();
    };
  }, [searchTerm, filters, showPastGigs]);

  // Predictive backend-driven location suggestions (no GeoNames)
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoadingLocations(true);
        const res = await axios.get('/api/gigs/locations', {
          params: { q: locationQuery || '', limit: 12 },
          signal: controller.signal
        });
        if (!active) return;
        const stats = Array.isArray(res.data?.locationStats) ? res.data.locationStats : [];
        const locs = stats.map((s) => {
          const parts = String(s.label || '').split(',');
          const primary = (parts[0] || '').trim();
          const secondary = parts.slice(1).join(',').trim();
          return {
            value: s.label,
            primary,
            secondary,
            count: s.count || 0
          };
        });
        setLocationOptions(locs);
      } catch (e) {
        if (e.name !== 'CanceledError') {
          // ignore
        }
      } finally {
        if (active) setLoadingLocations(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(t); controller.abort(); };
  }, [locationQuery]);

  // Search handler
  const handleSearch = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  // Use useMemo to memoize the filtered gigs
  const filteredGigs = useMemo(() => {
    // Skip filtering if gigs array is empty
    if (gigs.length === 0) return [];

    let result = [...gigs];
    // Filter by fee range (client-side; payment stored as string)
    result = result.filter(gig => {
      const gigFee = getPaymentValue(gig.payment);
      return gigFee >= filters.minFee && (filters.maxFee === Infinity || gigFee <= filters.maxFee);
    });

    // Apply sorting
    if (sort === 'dateAsc') {
      result.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sort === 'dateDesc') {
      result.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sort === 'feeAsc') {
      result.sort((a, b) => getPaymentValue(a.payment) - getPaymentValue(b.payment));
    } else if (sort === 'feeDesc') {
      result.sort((a, b) => getPaymentValue(b.payment) - getPaymentValue(a.payment));
    } else if (sort === 'postDateDesc') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'postDateAsc') {
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    return result;
  }, [filters, gigs, sort, searchTerm]);

  // Reset loaded count when filtered set changes
  useEffect(() => {
    gigsRef.current = filteredGigs;
    setLoadedCount(Math.min(filteredGigs.length, loadStep));
  }, [filteredGigs]);

  // IntersectionObserver to reveal more
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry || !entry.isIntersecting) return;
      const total = gigsRef.current.length;
      if (loadingMore) return;
      setLoadingMore(true);
      if (loadedCount < total) {
        setTimeout(() => {
          setLoadedCount((prev) => Math.min(total, prev + loadStep));
          setLoadingMore(false);
        }, 120);
      } else {
        setLoadingMore(false);
      }
    }, { root: null, rootMargin: '600px', threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadedCount, loadingMore]);

  // Window scroll fallback
  useEffect(() => {
    const onScroll = () => {
      if (scrollDebounceRef.current) return;
      scrollDebounceRef.current = setTimeout(() => {
        scrollDebounceRef.current = null;
        const scrollY = window.scrollY || window.pageYOffset;
        const viewport = window.innerHeight || document.documentElement.clientHeight;
        const full = document.documentElement.scrollHeight || document.body.scrollHeight;
        if (full - (scrollY + viewport) < 800) {
          if (!loadingMore) {
            const total = gigsRef.current.length;
            if (loadedCount < total) {
              setLoadingMore(true);
              setTimeout(() => {
                setLoadedCount((prev) => Math.min(total, prev + loadStep));
                setLoadingMore(false);
              }, 100);
            }
          }
        }
      }, 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
        scrollDebounceRef.current = null;
      }
    };
  }, [loadedCount, loadingMore]);
  
  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
      location: '',
      minFee: 0,
      maxFee: Infinity,
      date: '',
dateTo: '',
      instrument: '',
      genre: ''
    });
    setLocationQuery('');
  };

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        py: { xs: 2, sm: 4 },
        px: { xs: 1, sm: 3 }
      }}
    >
      <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 2, sm: 3, md: 4 }, 
            mb: { xs: 2, sm: 3, md: 4 }, 
            borderRadius: { xs: 2, sm: 3 },
            background: 'linear-gradient(to right, #2c5282, #1a365d)',
            color: 'white'
          }}
        >
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: { xs: 2, md: 0 }
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h4" 
              component="h1" 
              fontWeight="bold"
              sx={{
                fontSize: { xs: '1.75rem', sm: '2.125rem', md: '2.5rem' },
                lineHeight: { xs: 1.2, sm: 1.3 }
              }}
            >
              Gig Opportunities
            </Typography>
          </Box>
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'row', sm: 'row' },
              gap: { xs: 1.5, sm: 2 },
              width: { xs: '100%', md: 'auto' },
              justifyContent: { xs: 'stretch', md: 'flex-end' }
            }}
          >
            <Button 
              variant="contained" 
              onClick={() => setShowFilters(!showFilters)}
              startIcon={<FilterListIcon />} 
              sx={{ 
                py: { xs: 1, sm: 1.2 },
                px: { xs: 2, sm: 3 },
                borderRadius: 2,
                fontWeight: 'bold',
                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                minHeight: { xs: 40, sm: 44 },
                flex: { xs: 1, md: 'none' },
                bgcolor: '#1a365d',
                '&:hover': {
                  bgcolor: '#2c5282'
                }
              }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button 
              variant="contained" 
              component={Link} 
              to={isAuthenticated ? "/create-gig" : "/login?redirect=/create-gig"}
              startIcon={<AddIcon />}
              sx={{ 
                py: { xs: 1, sm: 1.2 },
                px: { xs: 2, sm: 3 },
                borderRadius: 2,
                fontWeight: 'bold',
                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                minHeight: { xs: 40, sm: 44 },
                flex: { xs: 1, md: 'none' },
                bgcolor: '#1a365d',
                '&:hover': {
                  bgcolor: '#2c5282'
                }
              }}
            >
              Post a Gig
            </Button>
          </Box>
        </Box>
      </Paper>
      
      {/* Search Bar */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search gigs by title, description, location, instruments, or genres..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#1a365d' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1a365d',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1a365d',
              },
            },
          }}
        />
      </Box>
      
      {/* Filter Section */}
      {showFilters && (
        <Paper 
          sx={{ 
            p: { xs: 2, sm: 3 }, 
            mb: { xs: 2, sm: 3, md: 4 }, 
            borderRadius: 2 
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', sm: 'center' }, 
              mb: { xs: 2, sm: 2 },
              gap: { xs: 1.5, sm: 0 }
            }}
          >
            <Typography 
              variant="h6" 
              fontWeight="bold"
              sx={{
                fontSize: { xs: '1.125rem', sm: '1.25rem' }
              }}
            >
              Filter Gigs
            </Typography>
            <Button 
              variant="outlined" 
              onClick={resetFilters}
              sx={{ 
                color: '#1a365d', 
                borderColor: '#1a365d',
                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                minHeight: { xs: 36, sm: 40 },
                px: { xs: 2, sm: 3 },
                alignSelf: { xs: 'stretch', sm: 'auto' }
              }}
            >
              Reset Filters
            </Button>
          </Box>
          
          <Grid container spacing={{ xs: 2, sm: 3 }}>
              {/* Location Filter */}
              <Grid item xs={12} sm={6} md={4}>
                <Autocomplete
                  options={locationOptions}
                  autoHighlight
                  loading={loadingLocations}
                  filterOptions={(x) => x} // use backend suggestions as-is
                  getOptionLabel={(opt) => (opt?.value || '')}
                  isOptionEqualToValue={(opt, val) => (opt?.value || '') === (val?.value || '')}
                  value={filters.location ? {
                    value: filters.location,
                    primary: (filters.location.split(',')[0] || '').trim(),
                    secondary: filters.location.split(',').slice(1).join(',').trim(),
                    count: 0
                  } : null}
                  onChange={(_e, v) => {
                    if (v && v.value) {
                      handleFilterChange('location', v.value);
                      setLocationQuery(v.value);
                    } else {
                      handleFilterChange('location', '');
                      setLocationQuery('');
                    }
                  }}
                  inputValue={locationQuery}
                  onInputChange={(_e, v) => setLocationQuery(v || '')}
                  renderOption={(props, option) => (
                    <li {...props} key={option.value}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ fontSize: 14, fontWeight: 500 }}>
                          {option.primary}{option.count ? ` (${option.count})` : ''}
                        </Box>
                        {option.secondary && (
                          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
                            {option.secondary}
                          </Box>
                        )}
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Location"
                      placeholder="Search locations"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingLocations ? (
                              <CircularProgress color="inherit" size={16} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                />
              </Grid>
            
            {/* Date Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <Flatpickr
                options={{
                  dateFormat: 'd/m/Y',
                  disableMobile: true,
                  allowInput: true,
                  clickOpens: false,
                  onOpen: (_d, _s, instance) => { if (instance?.calendarContainer) instance.calendarContainer.classList.add('fp-compact'); },
                  onChange: (_dates, _str, instance) => instance.close()
                }}
                onChange={([d]) => handleFilterChange('date', d ? d.toISOString().slice(0,10) : '')}
                render={(props, ref) => (
                  <TextField
                    inputRef={ref}
                    inputProps={{
                      ...props,
                      id: 'filter-date-from',
                      inputMode: 'numeric',
                      maxLength: 10,
                      placeholder: 'DD/MM/YYYY',
                      pattern: '\\d{2}/\\d{2}/\\d{4}',
                      onInput: (e) => {
                        let v = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                        if (v.length >= 5) v = `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
                        else if (v.length >= 3) v = `${v.slice(0,2)}/${v.slice(2)}`;
                        e.target.value = v;
                      }
                    }}
                    fullWidth
                    size="small"
                    label="Date From"
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {filters.date && (
                            <IconButton
                              size="small"
                              onClick={() => {
                                handleFilterChange('date', '');
                                const el = document.getElementById('filter-date-from');
                                if (el) {
                                  el.value = '';
                                  if (el._flatpickr) el._flatpickr.clear();
                                }
                              }}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => {
                              const el = document.getElementById('filter-date-from');
                              if (el && el._flatpickr) el._flatpickr.open();
                              else if (el) el.focus();
                            }}
                          >
                            <CalendarTodayIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    onBlur={(e) => {
                      const val = (e.target.value || '').trim();
                      if (!val) { handleFilterChange('date', ''); return; }
                      const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                      if (m) {
                        const d = m[1].padStart(2,'0');
                        const mo = m[2].padStart(2,'0');
                        const y = m[3];
                        const dt = new Date(`${y}-${mo}-${d}T00:00:00Z`);
                        if (!isNaN(dt.getTime())) {
                          handleFilterChange('date', `${y}-${mo}-${d}`);
                        }
                      }
                    }}
                  />
                )}
              />
            </Grid>
            
            {/* Date To Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <Flatpickr
                options={{
                  dateFormat: 'd/m/Y',
                  disableMobile: true,
                  allowInput: true,
                  clickOpens: false,
                  onOpen: (_d, _s, instance) => { if (instance?.calendarContainer) instance.calendarContainer.classList.add('fp-compact'); },
                  onChange: (_dates, _str, instance) => instance.close()
                }}
                onChange={([d]) => handleFilterChange('dateTo', d ? d.toISOString().slice(0,10) : '')}
                render={(props, ref) => (
                  <TextField
                    inputRef={ref}
                    inputProps={{
                      ...props,
                      id: 'filter-date-to',
                      inputMode: 'numeric',
                      maxLength: 10,
                      placeholder: 'DD/MM/YYYY',
                      pattern: '\\d{2}/\\d{2}/\\d{4}',
                      onInput: (e) => {
                        let v = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                        if (v.length >= 5) v = `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
                        else if (v.length >= 3) v = `${v.slice(0,2)}/${v.slice(2)}`;
                        e.target.value = v;
                      }
                    }}
                    fullWidth
                    size="small"
                    label="Date To"
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {filters.dateTo && (
                            <IconButton
                              size="small"
                              onClick={() => {
                                handleFilterChange('dateTo', '');
                                const el = document.getElementById('filter-date-to');
                                if (el) {
                                  el.value = '';
                                  if (el._flatpickr) el._flatpickr.clear();
                                }
                              }}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => {
                              const el = document.getElementById('filter-date-to');
                              if (el && el._flatpickr) el._flatpickr.open();
                              else if (el) el.focus();
                            }}
                          >
                            <CalendarTodayIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    onBlur={(e) => {
                      const val = (e.target.value || '').trim();
                      if (!val) { handleFilterChange('dateTo', ''); return; }
                      const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                      if (m) {
                        const d = m[1].padStart(2,'0');
                        const mo = m[2].padStart(2,'0');
                        const y = m[3];
                        const dt = new Date(`${y}-${mo}-${d}T00:00:00Z`);
                        if (!isNaN(dt.getTime())) {
                          handleFilterChange('dateTo', `${y}-${mo}-${d}`);
                        }
                      }
                    }}
                  />
                )}
              />
            </Grid>
            
            {/* Fee Range Filter */}
            <Grid item xs={12} sm={6} md={6}>
              <Typography id="fee-range-slider" gutterBottom>
                Fee Range: {filters.minFee} - {filters.maxFee === Infinity ? '2000+' : `${filters.maxFee}`}
              </Typography>
              <Slider
                value={[filters.minFee, filters.maxFee === Infinity ? 2000 : filters.maxFee]}
                onChange={(e, newValue) => {
                  handleFilterChange('minFee', newValue[0]);
                  handleFilterChange('maxFee', newValue[1] === 2000 ? Infinity : newValue[1]);
                }}
                valueLabelDisplay="auto"
                valueLabelFormat={(value, index) => {
                  if (index === 1 && filters.maxFee === Infinity) return '2000+';
                  return `${value}`;
                }}
                min={0}
                max={2000}
                step={50}
                sx={{ color: '#1a365d' }}
                disableSwap
              />
            </Grid>
            
            {/* Instrument Filter */}
            <Grid item xs={12} sm={6} md={6}>
                <Autocomplete
                  options={instrumentOptions}
                  value={filters.instrument || ''}
                  onChange={(_e, v) => handleFilterChange('instrument', v || '')}
                  freeSolo
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Instrument"
                      placeholder="Any Instrument"
                      onChange={(e) => handleFilterChange('instrument', e.target.value)}
                    />
                  )}
                />
            </Grid>
            
            {/* Genre Filter */}
            <Grid item xs={12} sm={6} md={6}>
                <Autocomplete
                  options={genreOptions}
                  value={filters.genre || ''}
                  onChange={(_e, v) => handleFilterChange('genre', v || '')}
                  freeSolo
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Genre"
                      placeholder="Any Genre"
                      onChange={(e) => handleFilterChange('genre', e.target.value)}
                    />
                  )}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={6} container justifyContent="flex-end" alignItems="flex-end">
              <FormControl fullWidth variant="outlined">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="">Default</MenuItem>
                  <MenuItem value="dateAsc">Gig Date (Earliest)</MenuItem>
<MenuItem value="dateDesc">Gig Date (Latest)</MenuItem>
                  <MenuItem value="feeAsc">Fee (Low-High)</MenuItem>
                  <MenuItem value="feeDesc">Fee (High-Low)</MenuItem>
                  <MenuItem value="postDateDesc">Post Date (Latest)</MenuItem>
                  <MenuItem value="postDateAsc">Post Date (Oldest)</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={<Switch checked={showPastGigs} onChange={(e) => setShowPastGigs(e.target.checked)} name="showPastGigs" />}
                label="Show Past Gigs"
              />
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {loading ? (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: { xs: 1.5, sm: 2 },
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                <Box sx={{ 
                  bgcolor: '#f5f5f5', 
                  p: { xs: 1.5, sm: 2 }, 
                  borderTopLeftRadius: { xs: 6, sm: 8 }, 
                  borderTopRightRadius: { xs: 6, sm: 8 },
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}>
                  <Box 
                    sx={{
                      height: { xs: 20, sm: 24 },
                      bgcolor: '#e0e0e0',
                      borderRadius: 1,
                      animation: `${pulse} 1.5s ease-in-out infinite`
                    }}
                  />
                </Box>
                <CardContent sx={{ 
                  flexGrow: 1, 
                  p: { xs: 2, sm: 3 }
                }}>
                  <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 1.5, sm: 2 } }}>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                        <Box 
                          sx={{
                            width: { xs: 24, sm: 28 }, 
                            height: { xs: 24, sm: 28 },
                            bgcolor: '#e0e0e0',
                            borderRadius: '50%',
                            animation: `${pulse} 1.5s ease-in-out infinite`
                          }}
                        />
                        <Box 
                          sx={{
                            ml: 1,
                            width: 80,
                            height: { xs: 16, sm: 18 },
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            animation: `${pulse} 1.5s ease-in-out infinite`
                          }}
                        />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                        <Box 
                          sx={{
                            width: { xs: 20, sm: 24 },
                            height: { xs: 20, sm: 24 },
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            mr: 1,
                            animation: `${pulse} 1.5s ease-in-out infinite`
                          }}
                        />
                        <Box 
                          sx={{
                            width: 60,
                            height: { xs: 16, sm: 18 },
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            animation: `${pulse} 1.5s ease-in-out infinite`
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                        <Box 
                          sx={{
                            width: { xs: 20, sm: 24 },
                            height: { xs: 20, sm: 24 },
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            mr: 1,
                            animation: `${pulse} 1.5s ease-in-out infinite`
                          }}
                        />
                        <Box 
                          sx={{
                            width: 80,
                            height: { xs: 16, sm: 18 },
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            animation: `${pulse} 1.5s ease-in-out infinite`
                          }}
                        />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                        <Box 
                          sx={{
                            width: { xs: 20, sm: 24 },
                            height: { xs: 20, sm: 24 },
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            mr: 1,
                            animation: `${pulse} 1.5s ease-in-out infinite`
                          }}
                        />
                        <Box 
                          sx={{
                            width: 100,
                            height: { xs: 16, sm: 18 },
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            animation: `${pulse} 1.5s ease-in-out infinite`
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box 
                          sx={{
                            width: { xs: 20, sm: 24 },
                            height: { xs: 20, sm: 24 },
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            mr: 1,
                            animation: `${pulse} 1.5s ease-in-out infinite`
                          }}
                        />
                        <Box 
                          sx={{
                            width: 70,
                            height: { xs: 16, sm: 18 },
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            animation: `${pulse} 1.5s ease-in-out infinite`
                          }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                  
                  <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 1.5, sm: 2 } }}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 0.75, sm: 1 } }}>
                        <Box 
                          sx={{
                            width: { xs: 18, sm: 20 },
                            height: { xs: 18, sm: 20 },
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            mr: 1,
                            animation: `${pulse} 1.5s ease-in-out infinite`
                          }}
                        />
                        <Box 
                          sx={{
                            width: 80,
                            height: { xs: 14, sm: 16 },
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            animation: `${pulse} 1.5s ease-in-out infinite`
                          }}
                        />
                      </Box>
                      <Box sx={{ ml: { xs: 3, sm: 4 }, display: 'flex', gap: 0.5 }}>
                        {[...Array(2)].map((_, i) => (
                          <Box 
                            key={i}
                            sx={{
                              width: 50,
                              height: { xs: 24, sm: 28 },
                              bgcolor: '#e0e0e0',
                              borderRadius: 3,
                              animation: `${pulse} 1.5s ease-in-out infinite`
                            }}
                          />
                        ))}
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 0.75, sm: 1 } }}>
                        <Box 
                          sx={{
                            width: { xs: 18, sm: 20 },
                            height: { xs: 18, sm: 20 },
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            mr: 1,
                            animation: `${pulse} 1.5s ease-in-out infinite`
                          }}
                        />
                        <Box 
                          sx={{
                            width: 60,
                            height: { xs: 14, sm: 16 },
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            animation: `${pulse} 1.5s ease-in-out infinite`
                          }}
                        />
                      </Box>
                      <Box sx={{ ml: { xs: 3, sm: 4 }, display: 'flex', gap: 0.5 }}>
                        {[...Array(2)].map((_, i) => (
                          <Box 
                            key={i}
                            sx={{
                              width: 40,
                              height: { xs: 24, sm: 28 },
                              bgcolor: '#e0e0e0',
                              borderRadius: 3,
                              animation: `${pulse} 1.5s ease-in-out infinite`
                            }}
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
                
                <CardActions sx={{ 
                  p: { xs: 1.5, sm: 2 }, 
                  pt: 0
                }}>
                  <Box 
                    sx={{
                      width: '100%',
                      height: { xs: 40, sm: 44 },
                      bgcolor: '#e0e0e0',
                      borderRadius: 2,
                      animation: `${pulse} 1.5s ease-in-out infinite`
                    }}
                  />
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
        <Grid container spacing={{ xs: 2, sm: 3 }}>
        {filteredGigs.length > 0 ? (
          filteredGigs.slice(0, loadedCount).map((gig) => (
            <Grid item xs={12} sm={6} md={4} key={gig._id}>
              <Link 
                to={isAuthenticated ? `/gigs/${gig._id}` : `/login?redirect=/gigs/${gig._id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: { xs: 1.5, sm: 2 },
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  backgroundColor: gig.isFilled ? 'action.disabledBackground' : 'inherit',
                  opacity: gig.isFilled ? 0.7 : 1,
                  cursor: 'pointer',
                  '&:hover': {
                    transform: gig.isFilled ? 'none' : { xs: 'none', sm: 'translateY(-4px)' },
                    boxShadow: gig.isFilled ? '0 4px 12px rgba(0,0,0,0.1)' : { xs: '0 4px 12px rgba(0,0,0,0.1)', sm: '0 12px 20px rgba(0,0,0,0.15)' },
                  }
                }}
                >
              <Box sx={{ 
                bgcolor: '#1a365d', 
                color: 'white', 
                p: { xs: 1.5, sm: 2 }, 
                borderTopLeftRadius: { xs: 6, sm: 8 }, 
                borderTopRightRadius: { xs: 6, sm: 8 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1
              }}>
                <Typography 
                  variant="h5" 
                  component="h2" 
                  fontWeight="bold"
                  sx={{
                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                    lineHeight: { xs: 1.3, sm: 1.4 },
                    color: 'white',
                    flex: 1,
                    minWidth: 0,
                    wordBreak: 'break-word'
                  }}
                >
                  {gig.title}
                </Typography>
                {gig.isFilled && (
                  <Chip size="small" label="FIXED" color="default" sx={{ bgcolor: 'grey.200' }} />
                )}
              </Box>
              <CardContent sx={{ 
                flexGrow: 1, 
                p: { xs: 2, sm: 3 },
                filter: !isAuthenticated ? 'blur(3px)' : 'none',
                transition: 'filter 0.3s ease'
              }}>
                {/* Top: Fee left, Date right */}
                <Box sx={{
                  display: 'flex',
                  alignItems: (
                    () => {
                      const sch = gig.schedules;
                      // Center when multiple dates, or when a single date has a time, or fallback has time
                      if (Array.isArray(sch)) {
                        if (sch.length > 1) return 'center';
                        if (sch.length === 1 && (sch[0]?.startTime)) return 'center';
                      } else if (gig.time) {
                        return 'center';
                      }
                      return 'flex-start';
                    }
                  )(),
                  justifyContent: 'space-between',
                  mb: { xs: 1.5, sm: 2 },
                  pt: { xs: 0.75, sm: 1.25 }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.125rem' }, color: 'text.primary' }}>
                      {formatPayment(gig.payment, gig.currency || 'GBP')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarTodayIcon sx={{ mr: 1, color: '#1a365d', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                    <Box>
                      {Array.isArray(gig.schedules) && gig.schedules.length > 0 ? (
                        (() => {
                          const count = gig.schedules.length;
                          const first = gig.schedules[0];
                          const last = gig.schedules[count - 1];
                          const firstDateStr = first.date ? new Date(first.date).toLocaleDateString('en-GB') : 'Date TBD';
                          const lastDateStr = last.date ? new Date(last.date).toLocaleDateString('en-GB') : 'Date TBD';
                          if (count === 1) {
                            return (
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <Typography variant="body1" fontWeight="bold" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, lineHeight: 1.2 }}>
                                  {firstDateStr}
                                </Typography>
                                {first.startTime && (
                                  <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, opacity: 0.8, lineHeight: 1.2 }}>
                                    {first.startTime}{first.endTime ? ` - ${first.endTime}` : ''}
                                  </Typography>
                                )}
                              </Box>
                            );
                          } else {
                            return (
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <Typography variant="body1" fontWeight="bold" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, lineHeight: 1.05 }}>
                                  {firstDateStr}
                                </Typography>
                                <Typography variant="body1" fontWeight="bold" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, opacity: 0.7, lineHeight: 1.05, alignSelf: 'center' }}>
                                  —
                                </Typography>
                                <Typography variant="body1" fontWeight="bold" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, lineHeight: 1.05 }}>
                                  {lastDateStr}
                                </Typography>
                              </Box>
                            );
                          }
                        })()
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <Typography variant="body1" fontWeight="bold" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, lineHeight: 1.2 }}>
                            {new Date(gig.date).toLocaleDateString('en-GB')}
                          </Typography>
                          {gig.time && (
                            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, opacity: 0.8, lineHeight: 1.2 }}>
                              {gig.time}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Location full width */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: { xs: 1.5, sm: 2 } }}>
                  <LocationOnIcon sx={{ mr: 1, mt: 0.25, color: '#1a365d', fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                  <Typography variant="body1" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                    {gig.venue}, {formatLocationString(gig.location)}
                  </Typography>
                </Box>

                {/* Instruments (left) and Genres (right) */}
                <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 0.75, sm: 1 } }}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, columnGap: 1, rowGap: 0.5 }}>
                      <Typography variant="subtitle1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: 0, mr: 1 }}>
                        Instruments:
                      </Typography>
                      {gig.instruments.map((instrument, index) => (
                        <Chip key={index} label={instrument} size="small" variant="outlined" sx={{ borderColor: '#1a365d', color: '#1a365d', fontSize: { xs: '0.75rem', sm: '0.8125rem' }, height: { xs: 24, sm: 28 } }} />
                      ))}
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: { xs: 0.75, sm: 1 } }}>
                      Genres:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {gig.genres.map((genre, index) => (
                        <Chip key={index} label={genre} size="small" variant="outlined" sx={{ borderColor: '#1a365d', color: '#1a365d', fontSize: { xs: '0.75rem', sm: '0.8125rem' }, height: { xs: 24, sm: 28 } }} />
                      ))}
                    </Box>
                  </Grid>
                </Grid>
                
              </CardContent>
              
              <CardActions sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 1, sm: 1.25 }, pb: { xs: 2, sm: 3 } }}>
                <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Box 
                      sx={{ display: 'flex', alignItems: 'center', minWidth: 0, cursor: 'pointer' }}
                      onClick={(e) => {
                        // Prevent the parent Link (card) from navigating to the gig
                        if (e && typeof e.preventDefault === 'function') e.preventDefault();
                        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                        navigate(isAuthenticated ? `/profile/${gig.user?._id}` : `/login?redirect=/profile/${gig.user?._id}`);
                      }}
                    >
                      <UserAvatar user={gig.user} size={{ xs: 26, sm: 30 }} />
                      <Typography variant="subtitle2" fontWeight="medium" sx={{ ml: 1, fontSize: { xs: '0.8rem', sm: '0.9rem' }, color: gig.isFilled ? 'text.disabled' : 'primary.main', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: { xs: 180, sm: 240 } }} title={gig.user?.name}>
                        {gig.user?.name}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {(() => { const c = (gig.applicantCount ?? (Array.isArray(gig.applicants) ? gig.applicants.length : 0)); return `${c} applicant${c !== 1 ? 's' : ''}`; })()}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    size="medium"
                    variant="contained"
                    onClick={(e) => e.stopPropagation()}
                    disabled={gig.isFilled || gig.yourApplicationStatus}
                    sx={{
                      borderRadius: 2,
                      bgcolor: gig.isFilled ? '#cccccc' : gig.yourApplicationStatus ? '#cccccc' : '#1a365d',
                      fontSize: { xs: '0.875rem', sm: '0.875rem' },
                      minHeight: { xs: 40, sm: 44 },
                      fontWeight: 'bold',
                      '&:hover': { bgcolor: gig.isFilled ? '#cccccc' : gig.yourApplicationStatus ? '#cccccc' : '#2c5282' },
                      '&.Mui-disabled': { bgcolor: '#cccccc', color: '#666666' }
                    }}
                  >
                    {gig.isFilled ? 'Fixed' : gig.yourApplicationStatus === 'accepted' ? 'Accepted' : gig.yourApplicationStatus === 'rejected' ? 'Rejected' : gig.yourApplicationStatus ? 'Applied' : 'Apply'}
                  </Button>
                </Box>
              </CardActions>
                </Card>
              </Link>
          </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Paper 
              sx={{ 
                p: { xs: 3, sm: 4 }, 
                textAlign: 'center', 
                borderRadius: 2 
              }}
            >
              <Typography 
                variant="h6" 
                color="text.secondary"
                sx={{
                  fontSize: { xs: '1.125rem', sm: '1.25rem' },
                  mb: { xs: 2, sm: 3 }
                }}
              >
                No gigs found matching your filters
              </Typography>
              <Button 
                variant="outlined" 
                onClick={resetFilters}
                sx={{ mt: 2, color: '#1a365d', borderColor: '#1a365d' }}
              >
                Reset Filters
              </Button>
            </Paper>
          </Grid>
        )}
        </Grid>
        {/* Infinite scroll sentinel + spinner */}
        <Box ref={sentinelRef} sx={{ height: 1 }} />
        {loadingMore && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        </>
      )}
    </Container>
  );
};

export default Gigs;
