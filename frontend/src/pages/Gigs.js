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
  CardActions
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

const Gigs = () => {
  const { isAuthenticated } = useAuth();
  const [showFilters, setShowFilters] = useState(false);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: '',
    date: '',
    minFee: 0,
    maxFee: 2000,
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
        const response = await axios.get('/api/gigs');
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

    // Filter by fee range
    result = result.filter(gig => {
      const gigFee = getPaymentValue(gig.payment);
      return gigFee >= filters.minFee && gigFee <= filters.maxFee;
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
    }

    return result;
  }, [filters, gigs, sort]);
  
  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters({
      ...filters,
      [name]: value
    });
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
      location: '',
      minFee: 0,
      maxFee: 2000,
      date: '',
      instrument: '',
      genre: ''
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            mb: 4, 
            borderRadius: 3,
            background: 'linear-gradient(to right, #2c5282, #1a365d)',
            color: 'white'
          }}
        >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">UK Gig Opportunities</Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
              Find the perfect musical gig across the United Kingdom
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              onClick={() => setShowFilters(!showFilters)}
              startIcon={<FilterListIcon />} 
              sx={{ 
                py: 1.2,
                px: 3,
                borderRadius: 2,
                fontWeight: 'bold',
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
                py: 1.2,
                px: 3,
                borderRadius: 2,
                fontWeight: 'bold',
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
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">Filter Gigs</Typography>
            <Button 
              variant="outlined" 
              onClick={resetFilters}
              sx={{ color: '#1a365d', borderColor: '#1a365d' }}
            >
              Reset Filters
            </Button>
          </Box>
          
          <Grid container spacing={3}>
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
              />
            </Grid>
            
            {/* Fee Range Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <Typography id="fee-range-slider" gutterBottom>
                Fee Range: £{filters.minFee} - £{filters.maxFee}
              </Typography>
              <Slider
                value={[filters.minFee, filters.maxFee]}
                onChange={(e, newValue) => {
                  handleFilterChange('minFee', newValue[0]);
                  handleFilterChange('maxFee', newValue[1]);
                }}
                valueLabelDisplay="auto"
                min={0}
                max={2000}
                step={50}
                sx={{ color: '#1a365d' }}
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
                  <MenuItem value="dateAsc">Date (Soonest)</MenuItem>
                  <MenuItem value="dateDesc">Date (Latest)</MenuItem>
                  <MenuItem value="feeAsc">Fee (Low-High)</MenuItem>
                  <MenuItem value="feeDesc">Fee (High-Low)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {loading ? (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="h6" color="text.secondary">
                Loading gigs...
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={3}>
        {filteredGigs.length > 0 ? (
          filteredGigs.map((gig) => (
            <Grid item xs={12} md={6} lg={4} key={gig._id}>
              <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                position: 'relative',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 20px rgba(0,0,0,0.15)',
                }
              }}
            >
              <Box sx={{ 
                bgcolor: '#1a365d', 
                color: 'white', 
                p: 2, 
                borderTopLeftRadius: 8, 
                borderTopRightRadius: 8,
                zIndex: 2,
                position: 'relative'
              }}>
                <Typography variant="h5" component="h2" fontWeight="bold">
                  {gig.title}
                </Typography>
              </Box>
              <CardContent sx={{ 
                flexGrow: 1, 
                p: 3,
                filter: !isAuthenticated ? 'blur(3px)' : 'none',
                transition: 'filter 0.3s ease'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <PaymentIcon sx={{ mr: 1, color: '#1a365d' }} />
                  <Typography variant="body1" fontWeight="bold">
                    {formatPayment(gig.payment)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CalendarTodayIcon sx={{ mr: 1, color: '#1a365d' }} />
                  <Typography variant="body1">
                    {new Date(gig.date).toLocaleDateString('en-GB')}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocationOnIcon sx={{ mr: 1, color: '#1a365d' }} />
                  <Typography variant="body1">
                    {gig.venue}, {gig.location}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MusicNoteIcon sx={{ mr: 1, color: '#1a365d' }} />
                    <Typography variant="subtitle1" fontWeight="medium">Instruments</Typography>
                  </Box>
                  <Box sx={{ ml: 4 }}>
                    {gig.instruments.map((instrument, index) => (
                      <Chip 
                        key={index} 
                        label={instrument} 
                        size="small" 
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5, borderColor: '#1a365d', color: '#1a365d' }} 
                      />
                    ))}
                  </Box>
                </Box>
                
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MusicNoteIcon sx={{ mr: 1, color: '#1a365d' }} />
                    <Typography variant="subtitle1" fontWeight="medium">Genres</Typography>
                  </Box>
                  <Box sx={{ ml: 4 }}>
                    {gig.genres.map((genre, index) => (
                      <Chip 
                        key={index} 
                        label={genre} 
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5, borderColor: '#1a365d', color: '#1a365d' }} 
                      />
                    ))}
                  </Box>
                </Box>
              </CardContent>
              
              <CardActions sx={{ 
                p: 2, 
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
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="h6" color="text.secondary">
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