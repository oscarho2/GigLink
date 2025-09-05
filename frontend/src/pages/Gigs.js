import React, { useState, useMemo, useEffect } from 'react';
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
  IconButton
} from '@mui/material';
import { Link } from 'react-router-dom';
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

const Gigs = () => {
  const { isAuthenticated } = useAuth();
  const [showFilters, setShowFilters] = useState(false);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: '',
    date: '',
    dateTo: '',
    minFee: 0,
    maxFee: Infinity,
    instrument: '',
    genre: ''
  });
  const [sort, setSort] = useState('dateAsc');
  
  // Filter options
  const locations = ["London", "Manchester", "Birmingham", "Liverpool", "Edinburgh", "Glasgow"];
  const instruments = ["Guitar", "Piano", "Drums", "Violin", "Saxophone", "Bass", "Vocals"];
  const genres = ["Rock", "Jazz", "Classical", "Pop", "Electronic", "Hip Hop", "R&B", "Folk"];
  
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

  // Use useMemo to memoize the filtered gigs
  const filteredGigs = useMemo(() => {
    // Skip filtering if gigs array is empty
    if (gigs.length === 0) return [];

    let result = [...gigs];

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
  }, [filters, gigs, sort]);
  
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
              UK Gig Opportunities
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
              Find the perfect musical gig across the United Kingdom
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
                bgcolor: '#64748b',
                '&:hover': {
                  bgcolor: '#475569'
                }
              }}
            >
              Post a Gig
            </Button>
          </Box>
        </Box>
      </Paper>
      
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
              <FormControl fullWidth>
                <InputLabel id="location-label">Location</InputLabel>
                <Select
                  labelId="location-label"
                  value={filters.location}
                  label="Location"
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                >
                  <MenuItem value="">Any Location</MenuItem>
                  {locations.map((loc) => (
                    <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Date Filter */}
            <Grid item xs={12} sm={6} md={4}>
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
              />
            </Grid>
            
            {/* Date To Filter */}
            <Grid item xs={12} sm={6} md={4}>
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
              />
            </Grid>
            
            {/* Fee Range Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <Typography id="fee-range-slider" gutterBottom>
                Fee Range: £{filters.minFee} - {filters.maxFee === Infinity ? '£2000+' : `£${filters.maxFee}`}
              </Typography>
              <Slider
                value={[filters.minFee, filters.maxFee === Infinity ? 2000 : filters.maxFee]}
                onChange={(e, newValue) => {
                  handleFilterChange('minFee', newValue[0]);
                  handleFilterChange('maxFee', newValue[1] === 2000 ? Infinity : newValue[1]);
                }}
                valueLabelDisplay="auto"
                valueLabelFormat={(value, index) => {
                  if (index === 1 && filters.maxFee === Infinity) return '£2000+';
                  return `£${value}`;
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
            <Grid item xs={12} sm={6} md={4} container justifyContent="flex-end" alignItems="flex-end">
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
                  fontSize: { xs: '1.125rem', sm: '1.25rem' }
                }}
              >
                Loading gigs...
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
        {filteredGigs.length > 0 ? (
          filteredGigs.map((gig) => (
            <Grid item xs={12} sm={6} md={4} key={gig._id}>
              <Card 
              sx={{ 
                height: '100%',
                maxHeight: { xs: 'none', sm: '500px' },
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: { xs: 1.5, sm: 2 },
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                position: 'relative',
                '&:hover': {
                  transform: { xs: 'none', sm: 'translateY(-4px)' },
                  boxShadow: { xs: '0 4px 12px rgba(0,0,0,0.1)', sm: '0 12px 20px rgba(0,0,0,0.15)' },
                }
              }}
            >
              <Box sx={{ 
                bgcolor: '#1a365d', 
                color: 'white', 
                p: { xs: 1.5, sm: 2 }, 
                borderTopLeftRadius: { xs: 6, sm: 8 }, 
                borderTopRightRadius: { xs: 6, sm: 8 },
                zIndex: 2,
                position: 'relative'
              }}>
                <Typography 
                  variant="h5" 
                  component="h2" 
                  fontWeight="bold"
                  sx={{
                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                    lineHeight: { xs: 1.3, sm: 1.4 }
                  }}
                >
                  {gig.title}
                </Typography>
              </Box>
              <CardContent sx={{ 
                flexGrow: 1, 
                p: { xs: 2, sm: 3 },
                filter: !isAuthenticated ? 'blur(3px)' : 'none',
                transition: 'filter 0.3s ease'
              }}>
                <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 1.5, sm: 2 } }}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                      <Avatar 
                        src={gig.user?.avatar} 
                        alt={gig.user?.name || 'User'}
                        sx={{ 
                          width: { xs: 24, sm: 28 }, 
                          height: { xs: 24, sm: 28 }, 
                          mr: 1,
                          bgcolor: '#1a365d',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}
                      >
                        {!gig.user?.avatar && (gig.user?.name?.charAt(0) || 'U')}
                      </Avatar>
                      <Typography 
                        variant="body1" 
                        fontWeight="bold"
                        sx={{
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        {gig.user?.name || 'Unknown'}
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
                        {formatPayment(gig.payment)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                      <CalendarTodayIcon sx={{ mr: 1, color: '#1a365d', fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                      <Typography 
                        variant="body1" 
                        fontWeight="bold"
                        sx={{
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        {new Date(gig.date).toLocaleDateString('en-GB')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                <Button
                  size="medium"
                  variant="contained"
                  fullWidth
                  component={Link}
                  to={isAuthenticated ? `/gigs/${gig._id}` : `/login?redirect=/gigs/${gig._id}`}
                  sx={{
                    borderRadius: 2,
                    bgcolor: '#1a365d',
                    fontSize: { xs: '0.875rem', sm: '0.875rem' },
                    minHeight: { xs: 40, sm: 44 },
                    fontWeight: 'bold',
                    '&:hover': {
                      bgcolor: '#2c5282'
                    }
                  }}
                >
                  View Details
                </Button>
              </CardActions>
            </Card>
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