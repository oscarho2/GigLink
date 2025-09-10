import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Box,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Paper,
  Divider,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';

import StarIcon from '@mui/icons-material/Star';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';

// Memoized MusicianCard component for better performance
const MusicianCard = memo(({ musician, user }) => {
  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        }
      }}
    >
      <CardContent sx={{ 
        flexGrow: 1,
        filter: !user ? 'blur(3px)' : 'none',
        transition: 'filter 0.3s ease'
      }}>
        {/* Profile Header */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar
            src={musician.user.avatar}
            alt={musician.user.name}
            sx={{ 
              width: 80, 
              height: 80, 
              mb: 2,
              bgcolor: 'primary.main',
              fontSize: '2rem'
            }}
          >
            {musician.user.name.charAt(0)}
          </Avatar>
          <Typography variant="h6" component="h2" align="center" gutterBottom>
            {musician.user.name}
          </Typography>
          {musician.user.location && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocationOnIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />
              <Typography variant="body2" color="text.secondary">
                {musician.user.location}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Bio */}
        {musician.bio && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            paragraph 
            sx={{ 
              textAlign: 'center', 
              mb: 2, 
              whiteSpace: 'pre-wrap',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: '4.5em',
              lineHeight: '1.5em'
            }}
          >
            {musician.bio}
          </Typography>
        )}

        {/* Skills - Two Column Layout */}
        {((musician.user?.instruments && musician.user.instruments.length > 0) || 
          (musician.user?.genres && musician.user.genres.length > 0)) && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* Left Half - Instruments */}
            <Grid item xs={12} sm={6}>
              {musician.user?.instruments && musician.user.instruments.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <MusicNoteIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                    Instruments
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {musician.user.instruments.slice(0, 3).map((instrument, index) => (
                      <Chip
                        key={`instrument-${index}`}
                        label={instrument}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: '#1a365d',
                          color: '#1a365d'
                        }}
                      />
                    ))}
                    {musician.user.instruments.length > 3 && (
                      <Chip
                        label={`+${musician.user.instruments.length - 3} more`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </>
              )}
            </Grid>

            {/* Right Half - Genres */}
            <Grid item xs={12} sm={6}>
              {musician.user?.genres && musician.user.genres.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <MusicNoteIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                    Genres
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {musician.user.genres.slice(0, 3).map((genre, index) => (
                      <Chip
                        key={`genre-${index}`}
                        label={genre}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: '#1a365d',
                          color: '#1a365d'
                        }}
                      />
                    ))}
                    {musician.user.genres.length > 3 && (
                      <Chip
                        label={`+${musician.user.genres.length - 3} more`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </>
              )}
            </Grid>
          </Grid>
        )}



      </CardContent>
      
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          component={Link}
          to={user ? `/profile/${musician.user._id}` : `/login?redirect=/profile/${musician.user._id}`}
          variant="contained"
          fullWidth
          sx={{
            bgcolor: '#1a365d',
            '&:hover': {
              bgcolor: '#2c5282'
            }
          }}
        >
          View Full Profile
        </Button>
      </CardActions>
    </Card>
  );
});

// Skeleton loading component
const MusicianCardSkeleton = () => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <CardContent sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        <Skeleton variant="circular" width={80} height={80} sx={{ mb: 2 }} />
        <Skeleton variant="text" width={120} height={32} />
        <Skeleton variant="text" width={100} height={20} />
      </Box>
      <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Skeleton variant="rounded" width={60} height={24} />
        <Skeleton variant="rounded" width={60} height={24} />
        <Skeleton variant="rounded" width={60} height={24} />
      </Box>
    </CardContent>
    <CardActions sx={{ p: 2, pt: 0 }}>
      <Skeleton variant="rounded" width="100%" height={36} />
    </CardActions>
  </Card>
);

const Discover = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    instrument: '',
    genre: '',
    userType: ''
  });
  
  // Filter options
  const locations = ["London", "Manchester", "Birmingham", "Liverpool", "Edinburgh", "Glasgow"];
  const instruments = ["Guitar", "Piano", "Drums", "Violin", "Saxophone", "Bass", "Vocals"];
  const genres = ["Rock", "Jazz", "Classical", "Pop", "Electronic", "Hip Hop", "R&B", "Folk"];




  // Memoized fetch function
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching musicians from API...');
      const response = await fetch('http://localhost:5001/api/profiles');
      console.log('Fetch response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('API response:', data);
      setUsers(data);
    } catch (err) {
      console.error('Error fetching musicians:', err);
      setError('Failed to fetch musicians.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Memoized search handler
  const handleSearch = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);
  
  // Filter handlers
  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);
  
  const resetFilters = useCallback(() => {
    setFilters({
      location: '',
      instrument: '',
      genre: '',

    });
  }, []);

  // Memoized filtered musicians (including current user)
  const filteredUsers = useMemo(() => {
    let result = [...users];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(musician =>
        musician.user.name.toLowerCase().includes(term) ||
        (musician.skills && musician.skills.some(skill => skill.toLowerCase().includes(term))) ||
        (musician.user.instruments && musician.user.instruments.some(instrument => instrument.toLowerCase().includes(term))) ||
        (musician.user.genres && musician.user.genres.some(genre => genre.toLowerCase().includes(term)))
      );
    }
    
    // Apply location filter
    if (filters.location) {
      result = result.filter(musician => musician.user.location === filters.location);
    }
    
    // Apply instrument filter
    if (filters.instrument) {
      result = result.filter(musician => 
        musician.user.instruments && musician.user.instruments.includes(filters.instrument)
      );
    }
    
    // Apply genre filter
    if (filters.genre) {
      result = result.filter(musician => 
        musician.user.genres && musician.user.genres.includes(filters.genre)
      );
    }
    
    // Apply user type filter
    if (filters.userType) {
      result = result.filter(musician => musician.userType === filters.userType);
    }
    
    return result;
  }, [users, searchTerm, filters]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
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
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Discover Musicians
          </Typography>
          <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
            Connect with talented musicians in your area
          </Typography>
        </Paper>

        {/* Search Bar Skeleton */}
        <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Skeleton variant="rounded" height={56} />
        </Paper>

        {/* Skeleton Cards */}
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <MusicianCardSkeleton />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" align="center" color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
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
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Discover Links
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Connect with talented musicians for your next collaboration
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
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
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
            {(filters.location || filters.instrument || filters.genre) && (
              <Button
                variant="contained"
                startIcon={<ClearIcon />}
                onClick={resetFilters}
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
                Clear Filters
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Search Bar */}
      <TextField
        fullWidth
        placeholder="Search users by name, instruments, or genres..."
        value={searchTerm}
        onChange={handleSearch}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 4,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
          },
        }}
      />

      {/* Filter Section */}
       {showFilters && (
         <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3, md: 4 }, borderRadius: 2 }}>
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
               Filter Links
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
            <Grid item xs={12} sm={6} md={3}>
               <FormControl fullWidth>
                 <InputLabel>Location</InputLabel>
                 <Select
                   value={filters.location}
                   label="Location"
                   onChange={(e) => handleFilterChange('location', e.target.value)}
                 >
                  <MenuItem value="">All Locations</MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location} value={location}>
                      {location}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
               <FormControl fullWidth>
                 <InputLabel>Instrument</InputLabel>
                 <Select
                   value={filters.instrument}
                   label="Instrument"
                   onChange={(e) => handleFilterChange('instrument', e.target.value)}
                 >
                  <MenuItem value="">All Instruments</MenuItem>
                  {instruments.map((instrument) => (
                    <MenuItem key={instrument} value={instrument}>
                      {instrument}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
               <FormControl fullWidth>
                 <InputLabel>Genre</InputLabel>
                 <Select
                   value={filters.genre}
                   label="Genre"
                   onChange={(e) => handleFilterChange('genre', e.target.value)}
                 >
                  <MenuItem value="">All Genres</MenuItem>
                  {genres.map((genre) => (
                    <MenuItem key={genre} value={genre}>
                      {genre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
               <FormControl fullWidth>
                 <InputLabel>User Type</InputLabel>
                 <Select
                   value={filters.userType}
                   label="User Type"
                   onChange={(e) => handleFilterChange('userType', e.target.value)}
                 >
                  <MenuItem value="">All Users</MenuItem>
                  <MenuItem value="Musician">Musicians</MenuItem>
                  <MenuItem value="Booker">Bookers</MenuItem>
                </Select>
              </FormControl>
            </Grid>

          </Grid>
        </Paper>
      )}

      {/* Users Grid */}
      <Grid container spacing={3}>
        {filteredUsers.map((musician) => (
          <Grid item xs={12} sm={6} md={4} key={musician._id}>
            <MusicianCard musician={musician} user={user} />
          </Grid>
        ))}
      </Grid>

      {filteredUsers.length === 0 && !loading && !error && (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center', mt: 4 }}>
          <MusicNoteIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No users found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search terms or browse all available users.
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default Discover;