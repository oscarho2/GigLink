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
  Skeleton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WorkIcon from '@mui/icons-material/Work';
import StarIcon from '@mui/icons-material/Star';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

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
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <LocationOnIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />
            <Typography variant="body2" color="text.secondary">
              {musician.user.location || 'Location not specified'}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Bio */}
        <Typography variant="body2" color="text.secondary" paragraph sx={{ textAlign: 'center', mb: 2 }}>
          {musician.bio || 'Professional musician available for collaborations'}
        </Typography>

        {/* Experience & Availability */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WorkIcon sx={{ mr: 0.5, color: 'primary.main', fontSize: '1rem' }} />
            <Typography variant="caption" color="text.secondary">
              {musician.experience || 'Beginner'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <StarIcon sx={{ mr: 0.5, color: 'secondary.main', fontSize: '1rem' }} />
            <Typography variant="caption" color="text.secondary">
              {musician.availability || 'Available'}
            </Typography>
          </Box>
        </Box>

        {/* Skills */}
        {musician.skills && musician.skills.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <MusicNoteIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
              Skills
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {musician.skills.slice(0, 3).map((skill, index) => (
                <Chip
                  key={index}
                  label={skill}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
              {musician.skills.length > 3 && (
                <Chip
                  label={`+${musician.skills.length - 3} more`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}


      </CardContent>
      
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          component={Link}
          to={user ? `/profile/${musician.user._id}` : `/login?redirect=/profile/${musician.user._id}`}
          variant="contained"
          fullWidth
          sx={{
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark'
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
  const [musicians, setMusicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');



  // Memoized fetch function
  const fetchMusicians = useCallback(async () => {
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
      setMusicians(data);
    } catch (err) {
      console.error('Error fetching musicians:', err);
      setError('Failed to fetch musicians.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMusicians();
  }, [fetchMusicians]);

  // Memoized search handler
  const handleSearch = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  // Memoized filtered musicians (including current user)
  const filteredMusicians = useMemo(() => {
    // Include all musicians, including current user
    const allMusicians = musicians;
    
    if (!searchTerm.trim()) return allMusicians;
    
    const term = searchTerm.toLowerCase();
    return allMusicians.filter(musician =>
      musician.user.name.toLowerCase().includes(term) ||
      (musician.skills && musician.skills.some(skill => skill.toLowerCase().includes(term))) ||
      (musician.instruments && musician.instruments.some(instrument => instrument.toLowerCase().includes(term))) ||
      (musician.genres && musician.genres.some(genre => genre.toLowerCase().includes(term)))
    );
  }, [musicians, searchTerm]);

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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Discover Musicians
      </Typography>
      <Typography variant="h6" component="p" gutterBottom color="text.secondary" sx={{ mb: 4 }}>
        Connect with talented musicians for your next collaboration
      </Typography>

      {/* Search Bar */}
      <Paper elevation={1} sx={{ p: 2, mb: 4 }}>
        <TextField
          variant="outlined"
          placeholder="Search by name, instrument, genre, or skills..."
          value={searchTerm}
          onChange={handleSearch}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Musicians Grid */}
      <Grid container spacing={3}>
        {filteredMusicians.map((musician) => (
          <Grid item xs={12} sm={6} md={4} key={musician._id}>
            <MusicianCard musician={musician} user={user} />
          </Grid>
        ))}
      </Grid>

      {filteredMusicians.length === 0 && !loading && !error && (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center', mt: 4 }}>
          <MusicNoteIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No musicians found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search terms or browse all available musicians.
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default Discover;