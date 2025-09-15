import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Container, 
  Grid,
  Typography, 
  Paper, 
  Box, 
  Button, 
  Card, 
  CardContent, 
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
import { keyframes } from '@mui/system';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { formatPayment, getPaymentValue } from '../utils/currency';
import AddIcon from '@mui/icons-material/Add';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PaymentIcon from '@mui/icons-material/Payment';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonIcon from '@mui/icons-material/Person';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import GeoNamesAutocomplete from '../components/GeoNamesAutocomplete';
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
  
  // Filter options
  const locations = ["London", "Manchester", "Birmingham", "Liverpool", "Edinburgh", "Glasgow"];
  const instruments = ["Guitar", "Piano", "Drums", "Violin", "Saxophone", "Bass", "Vocals"];
  const genres = ["Rock", "Jazz", "Classical", "Pop", "Electronic", "Hip Hop", "R&B", "Folk"];


  // Helpers
  const getApplicantCount = (gig) => (gig?.applicantCount ?? (Array.isArray(gig?.applicants) ? gig.applicants.length : 0));
  const isGigOwner = (gig) => {
    const currentUserId = (user?.id || user?._id)?.toString();
    const gigUserId = (typeof gig?.user === 'object' && gig?.user !== null)
      ? ((gig.user._id || gig.user.id || gig.user)?.toString())
      : gig?.user?.toString();
    return !!(currentUserId && gigUserId && currentUserId === gigUserId);
  };



  // Fetch gigs from backend
  useEffect(() => {
    const fetchGigs = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/gigs');
        setGigs(response.data);
      } catch (error) {
        console.error('Error fetching gigs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGigs();
  }, []);

  // Search handler
  const handleSearch = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  // Use useMemo to memoize the filtered gigs
  const filteredGigs = useMemo(() => {
    // Skip filtering if gigs array is empty
    if (gigs.length === 0) return [];

    let result = [...gigs];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);
      result = result.filter(gig => {
        const searchableText = [
          gig.title || '',
          gig.description || '',
          gig.location || '',
          gig.venue || '',
          gig.user?.name || '',
          ...(gig.instruments || []),
          ...(gig.genres || [])
        ].join(' ').toLowerCase();
        
        // Check if all search words are found in the searchable text
        return searchWords.every(word => searchableText.includes(word));
      });
    }

    // Filter by location
    if (filters.location) {
      result = result.filter(gig => gig.location === filters.location);
    }

    // Filter by date
    if (filters.date) {
      result = result.filter(gig => {
        const gigDate = new Date(gig.date);
        const filterDate = new Date(filters.date);
        return gigDate >= filterDate;
      });
    }

    // Filter by dateTo
    if (filters.dateTo) {
      result = result.filter(gig => {
        const gigDate = new Date(gig.date);
        const filterDateTo = new Date(filters.dateTo);
        return gigDate <= filterDateTo;
      });
    }

    // Filter by fee range
    result = result.filter(gig => {
      const gigFee = getPaymentValue(gig.payment);
      return gigFee >= filters.minFee && (filters.maxFee === Infinity || gigFee <= filters.maxFee);
    });

    // Filter by instrument
    if (filters.instrument) {
      result = result.filter(gig =>
        gig.instruments.some(inst => inst.toLowerCase() === filters.instrument.toLowerCase())
      );
    }

    // Filter by genre
    if (filters.genre) {
      result = result.filter(gig =>
        gig.genres.some(g => g.toLowerCase() === filters.genre.toLowerCase())
      );
    }

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
            <Typography 
              variant="subtitle1" 
              sx={{ 
                mt: 1, 
                opacity: 0.9,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                lineHeight: { xs: 1.4, sm: 1.5 }
              }}
            >
              Find exciting gig opportunities for musicians
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
                <Box sx={{ position: 'relative' }}>
                  <GeoNamesAutocomplete
                    value={filters.location}
                    onChange={(location) => handleFilterChange('location', location)}
                    placeholder="Any Location"
                    style={{ width: '100%' }}
                  />
                  {filters.location && (
                    <IconButton
                      size="small"
                      onClick={() => handleFilterChange('location', '')}
                      sx={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 1001
                      }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Grid>
            
            {/* Date Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Date From"
                type="date"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: filters.date && (
                    <IconButton onClick={() => handleFilterChange('date', '')}>
                      <ClearIcon />
                    </IconButton>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.600' },
                  '& .MuiInputLabel-root.Mui-focused': { color: 'grey.700' },
                }}
              />
            </Grid>
            
            {/* Date To Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Date To"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: filters.dateTo && (
                    <IconButton onClick={() => handleFilterChange('dateTo', '')}>
                      <ClearIcon />
                    </IconButton>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.600' },
                  '& .MuiInputLabel-root.Mui-focused': { color: 'grey.700' },
                }}
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
              <FormControl fullWidth>
                <InputLabel id="instrument-label">Instrument</InputLabel>
                <Select
                  labelId="instrument-label"
                  value={filters.instrument}
                  label="Instrument"
                  onChange={(e) => handleFilterChange('instrument', e.target.value)}
                >
                  <MenuItem value="">Any Instrument</MenuItem>
                  {instruments.map((inst) => (
                    <MenuItem key={inst} value={inst}>{inst}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Genre Filter */}
            <Grid item xs={12} sm={6} md={6}>
              <FormControl fullWidth>
                <InputLabel id="genre-label">Genre</InputLabel>
                <Select
                  labelId="genre-label"
                  value={filters.genre}
                  label="Genre"
                  onChange={(e) => handleFilterChange('genre', e.target.value)}
                >
                  <MenuItem value="">Any Genre</MenuItem>
                  {genres.map((genre) => (
                    <MenuItem key={genre} value={genre}>{genre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={6} container justifyContent="flex-end" alignItems="flex-end">
              <FormControl fullWidth variant="outlined">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="dateAsc">Date (Earliest)</MenuItem>
                  <MenuItem value="dateDesc">Date (Latest)</MenuItem>
                  <MenuItem value="feeAsc">Fee (Low-High)</MenuItem>
                  <MenuItem value="feeDesc">Fee (High-Low)</MenuItem>
                  <MenuItem value="postDateDesc">Post Date (Latest)</MenuItem>
                  <MenuItem value="postDateAsc">Post Date (Oldest)</MenuItem>
                </Select>
              </FormControl>
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
        <Grid container spacing={{ xs: 2, sm: 3 }}>
        {filteredGigs.length > 0 ? (
          filteredGigs.map((gig) => (
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
                borderTopRightRadius: { xs: 6, sm: 8 }
              }}>
                <Typography 
                  variant="h5" 
                  component="h2" 
                  fontWeight="bold"
                  sx={{
                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                    lineHeight: { xs: 1.3, sm: 1.4 },
                    color: gig.isFilled ? 'text.disabled' : 'inherit'
                  }}
                >
                  {gig.isFilled ? 'Fixed: ' : ''}{gig.title}
                </Typography>
              </Box>
              <CardContent sx={{ 
                flexGrow: 1, 
                p: { xs: 2, sm: 3 },
                filter: !isAuthenticated ? 'blur(3px)' : 'none',
                transition: 'filter 0.3s ease'
              }}>
                <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 1.5, sm: 2 } }}>
                  <Grid item xs={12}>
                    <Box 
                      sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 }, cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(isAuthenticated ? `/profile/${gig.user?._id}` : `/login?redirect=/profile/${gig.user?._id}`);
                      }}
                    >
                      <UserAvatar 
                        user={gig.user}
                        size={{ xs: 24, sm: 28 }}
                      />
                      <Typography 
                        variant="subtitle2" 
                        fontWeight="medium"
                        sx={{
                          ml: 1,
                          fontSize: { xs: '0.8rem', sm: '0.9rem' },
                          color: gig.isFilled ? 'text.disabled' : 'primary.main'
                        }}
                      >
                        {gig.user?.name}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                      <PaymentIcon sx={{ mr: 1, color: '#1a365d', fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                      <Typography 
                        variant="body1" 
                        fontWeight="bold"
                        sx={{
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        {formatPayment(gig.payment, gig.currency || 'GBP')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                      <CalendarTodayIcon sx={{ mr: 1, color: '#1a365d', fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                      <Box>
                        {Array.isArray(gig.schedules) && gig.schedules.length > 0 ? (
                          (() => {
                            const count = gig.schedules.length;
                            const first = gig.schedules[0];
                            const last = gig.schedules[count - 1];
                            const firstDateStr = first.date ? new Date(first.date).toLocaleDateString('en-GB') : 'Date TBD';
                            const lastDateStr = last.date ? new Date(last.date).toLocaleDateString('en-GB') : 'Date TBD';
                            
                            if (count === 1) {
                              // Single date: show date then time underneath
                              return (
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
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
                              // Multiple dates: three-line format - date, dash, date (no times)
                              return (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <Typography variant="body1" fontWeight="bold" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, lineHeight: 1.2 }}>
                                    {firstDateStr}
                                  </Typography>
                                  <Typography variant="body1" fontWeight="bold" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, opacity: 0.7, lineHeight: 1.2 }}>
                                    —
                                  </Typography>
                                  <Typography variant="body1" fontWeight="bold" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, lineHeight: 1.2 }}>
                                    {lastDateStr}
                                  </Typography>
                                </Box>
                              );
                            }
                          })()
                        ) : (
                          // Fallback to single date/time: show date then time underneath
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography 
                              variant="body1" 
                              fontWeight="bold"
                              sx={{
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                lineHeight: 1.2
                              }}
                            >
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
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                      <LocationOnIcon sx={{ mr: 1, color: '#1a365d', fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                      <Typography 
                        variant="body1" 
                        fontWeight="bold"
                        sx={{
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        {gig.venue}, {gig.location}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 1, color: '#1a365d', fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                      <Typography 
                        variant="body1" 
                        fontWeight="bold"
                        sx={{
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        { (() => { const count = (gig.applicantCount ?? (Array.isArray(gig.applicants) ? gig.applicants.length : 0)); return `${count} applicant${count !== 1 ? 's' : ''}`; })() }
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 1.5, sm: 2 } }}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 0.75, sm: 1 } }}>
                      <MusicNoteIcon sx={{ mr: 1, color: '#1a365d', fontSize: { xs: '1.125rem', sm: '1.25rem' } }} />
                      <Typography 
                        variant="subtitle1" 
                        fontWeight="medium"
                        sx={{
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        Instruments
                      </Typography>
                    </Box>
                    <Box sx={{ ml: { xs: 3, sm: 4 } }}>
                      {gig.instruments.map((instrument, index) => (
                        <Chip 
                          key={index} 
                          label={instrument} 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            mr: { xs: 0.5, sm: 0.5 }, 
                            mb: { xs: 0.5, sm: 0.5 }, 
                            borderColor: '#1a365d', 
                            color: '#1a365d',
                            fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                            height: { xs: 24, sm: 28 }
                          }} 
                        />
                      ))}
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 0.75, sm: 1 } }}>
                      <MusicNoteIcon sx={{ mr: 1, color: '#1a365d', fontSize: { xs: '1.125rem', sm: '1.25rem' } }} />
                      <Typography 
                        variant="subtitle1" 
                        fontWeight="medium"
                        sx={{
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        Genres
                      </Typography>
                    </Box>
                    <Box sx={{ ml: { xs: 3, sm: 4 } }}>
                      {gig.genres.map((genre, index) => (
                        <Chip 
                          key={index} 
                          label={genre} 
                          size="small"
                          variant="outlined"
                          sx={{ 
                            mr: { xs: 0.5, sm: 0.5 }, 
                            mb: { xs: 0.5, sm: 0.5 }, 
                            borderColor: '#1a365d', 
                            color: '#1a365d',
                            fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                            height: { xs: 24, sm: 28 }
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
                <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                  <Button
                    size="medium"
                    variant="contained"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      borderRadius: 2,
                      bgcolor: '#1a365d',
                      fontSize: { xs: '0.875rem', sm: '0.875rem' },
                      minHeight: { xs: 40, sm: 44 },
                      fontWeight: 'bold',
                      flex: 1,
                      '&:hover': { bgcolor: '#2c5282' }
                    }}
                  >
                    Apply
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
      )}
    </Container>
  );
};

export default Gigs;