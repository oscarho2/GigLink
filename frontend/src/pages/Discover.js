import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  keyframes,
  CircularProgress
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { formatLocationString } from '../utils/text';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckIcon from '@mui/icons-material/Check';
import StarIcon from '@mui/icons-material/Star';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import GeoNamesAutocomplete from '../components/GeoNamesAutocomplete';
import UserAvatar from '../components/UserAvatar';
import { instrumentOptions, genreOptions } from '../constants/musicOptions';

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

// Memoized MusicianCard component for better performance
const MusicianCard = memo(({ musician, user, linkStatus, onLinkAction }) => {
  const handleCardClick = () => {
    if (user) {
      window.location.href = `/profile/${musician.user._id}`;
    } else {
      window.location.href = `/login?redirect=/profile/${musician.user._id}`;
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: { xs: 1.5, sm: 2 },
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        cursor: 'pointer',
        '&:hover': {
          transform: { xs: 'none', sm: 'translateY(-4px)' },
          boxShadow: { xs: '0 4px 12px rgba(0,0,0,0.1)', sm: '0 12px 20px rgba(0,0,0,0.15)' }
        }
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ 
        flexGrow: 1,
        p: { xs: 2, sm: 3 }
      }}>
        {/* Profile Header */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <UserAvatar
            user={musician.user}
            size={80}
            sx={{ 
              mb: 2
            }}
          />
          <Typography 
            variant="h6" 
            component="h2" 
            fontWeight="bold"
            sx={{
              fontSize: { xs: '1.125rem', sm: '1.25rem' },
              lineHeight: { xs: 1.3, sm: 1.4 },
              textAlign: 'center',
              mb: 1
            }}
          >
            {musician.user.name}
          </Typography>
          {musician.user.location && (
            musician.user.locationData && musician.user.locationData.city ? (
              <Box sx={{ textAlign: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  {musician.user.locationData.city}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                  {[musician.user.locationData.region, musician.user.locationData.country].filter(Boolean).join(', ')}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                <LocationOnIcon sx={{ mr: 0.5, mt: 0.25, color: 'text.secondary', fontSize: '1rem' }} />
                <Typography variant="body2" color="text.secondary">
                  {formatLocationString(musician.user.location)}
                </Typography>
              </Box>
            )
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

        {/* Skills - Two Column Layout (Only show if user is a musician) */}
        {musician.user?.isMusician === 'yes' && 
         ((musician.user?.instruments && musician.user.instruments.length > 0) || 
          (musician.user?.genres && musician.user.genres.length > 0)) && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* Left Half - Instruments */}
            <Grid item xs={12} sm={6}>
              {musician.user?.instruments && musician.user.instruments.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Instruments:
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
                          color: '#1a365d',
                          fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                          height: { xs: 24, sm: 28 }
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
                  <Typography variant="subtitle2" gutterBottom>
                    Genres:
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
                          color: '#1a365d',
                          fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                          height: { xs: 24, sm: 28 }
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
        {user && user.id !== musician.user._id && (
          <Button
            variant={linkStatus === 'linked' ? 'outlined' : 'contained'}
            fullWidth
            startIcon={
              linkStatus === 'pending' ? <HourglassEmptyIcon /> :
              linkStatus === 'linked' ? <PersonRemoveIcon /> :
              linkStatus === 'received' ? <PersonAddIcon /> :
              <PersonAddIcon />
            }
            sx={{
              bgcolor: linkStatus === 'linked' ? 'transparent' : '#1a365d',
              borderColor: '#1a365d',
              color: linkStatus === 'linked' ? '#1a365d' : 'white',
              '&:hover': {
                bgcolor: linkStatus === 'linked' ? 'rgba(26, 54, 93, 0.04)' : '#2c5282',
                borderColor: '#1a365d'
              }
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (linkStatus === 'pending') {
                onLinkAction('cancel', musician.user._id, musician.user.name);
              } else if (linkStatus === 'linked') {
                onLinkAction('remove', musician.user._id, musician.user.name);
              } else {
                onLinkAction('request', musician.user._id, musician.user.name);
              }
            }}
          >
            {linkStatus === 'pending' ? 'Cancel Request' :
             linkStatus === 'linked' ? 'Linked' :
             linkStatus === 'received' ? 'Accept Request' :
             'Add Link'}
          </Button>
        )}
        {(!user || user.id === musician.user._id) && (
          <Button
            variant="contained"
            fullWidth
            startIcon={<PersonAddIcon />}
            disabled={!user}
            sx={{
              bgcolor: '#1a365d',
              '&:hover': {
                bgcolor: '#2c5282'
              }
            }}
          >
            {!user ? 'Login to Connect' : 'Your Profile'}
          </Button>
        )}
      </CardActions>
    </Card>
  );
});

// Skeleton loading component
const MusicianCardSkeleton = () => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: { xs: 1.5, sm: 2 }, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
    <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        <Skeleton variant="circular" width={80} height={80} sx={{ mb: 2, animation: `${pulse} 1.5s ease-in-out infinite` }} />
        <Skeleton variant="text" width="80%" height={32} sx={{ animation: `${pulse} 1.5s ease-in-out infinite` }} />
        <Skeleton variant="text" width="60%" height={20} sx={{ animation: `${pulse} 1.5s ease-in-out infinite` }} />
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={60} sx={{ mb: 2, animation: `${pulse} 1.5s ease-in-out infinite` }} />
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Skeleton variant="text" width="90%" sx={{ animation: `${pulse} 1.5s ease-in-out infinite` }} />
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
            <Skeleton variant="rounded" width={50} height={24} sx={{ animation: `${pulse} 1.5s ease-in-out infinite` }} />
            <Skeleton variant="rounded" width={50} height={24} sx={{ animation: `${pulse} 1.5s ease-in-out infinite` }} />
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Skeleton variant="text" width="90%" sx={{ animation: `${pulse} 1.5s ease-in-out infinite` }} />
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
            <Skeleton variant="rounded" width={50} height={24} sx={{ animation: `${pulse} 1.5s ease-in-out infinite` }} />
            <Skeleton variant="rounded" width={50} height={24} sx={{ animation: `${pulse} 1.5s ease-in-out infinite` }} />
          </Box>
        </Grid>
      </Grid>
    </CardContent>
    <CardActions sx={{ p: 2, pt: 0 }}>
      <Skeleton variant="rounded" width="100%" height={40} sx={{ animation: `${pulse} 1.5s ease-in-out infinite` }} />
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
  
  // Link-related state
  const [linkStatuses, setLinkStatuses] = useState({});
  const [linkIds, setLinkIds] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: '', userId: '', linkId: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const token = localStorage.getItem('token');
  // Infinite scroll state
  const [loadedCount, setLoadedCount] = useState(20);
  const loadStep = 20;
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);
  const usersRef = useRef([]);
  const scrollDebounceRef = useRef(null);
  

  // Fetch users (server-side filtering) with debounce
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
        if (filters.userType) params.userType = filters.userType;

        const response = await axios.get('/api/profiles', {
          params,
          signal: controller.signal,
          headers: token ? { 'x-auth-token': token } : undefined
        });
        if (active) {
          setUsers(Array.isArray(response.data) ? response.data : []);
          usersRef.current = Array.isArray(response.data) ? response.data : [];
          setLoadedCount(Math.min(usersRef.current.length, loadStep));
        }
      } catch (err) {
        if (active && err.name !== 'CanceledError') {
          console.error('Error fetching users:', err);
          setError('Failed to fetch users.');
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
  }, [searchTerm, filters]);

  // Predictive backend-driven location suggestions (like Gigs page)
  const [locationOptions, setLocationOptions] = useState([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoadingLocations(true);
        const res = await axios.get('/api/profiles/locations', {
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

  // Check link status for a specific user
  const checkLinkStatus = useCallback(async (userId) => {
    if (!user || !token || !userId || userId === user.id) return;
    
    try {
      const response = await axios.get(`/api/links/status/${userId}`, {
        headers: { 'x-auth-token': token }
      });
      const { status, linkId: responseLink, role } = response.data;
      
      let finalStatus = status;
      if (status === 'pending') {
        finalStatus = role === 'requester' ? 'pending' : 'received';
      } else if (status === 'accepted') {
        finalStatus = 'linked';
      } else {
        finalStatus = 'none';
      }
      
      setLinkStatuses(prev => ({ ...prev, [userId]: finalStatus }));
      if (responseLink) {
        setLinkIds(prev => ({ ...prev, [userId]: responseLink }));
      }
    } catch (err) {
      console.error('Error checking link status:', err);
      setLinkStatuses(prev => ({ ...prev, [userId]: 'none' }));
    }
  }, [user, token]);

  // Check link statuses for all users
  const checkAllLinkStatuses = useCallback(async () => {
    if (!user || !token || users.length === 0) return;
    
    for (const musician of users) {
      if (musician.user._id !== user.id) {
        await checkLinkStatus(musician.user._id);
      }
    }
  }, [user, token, users, checkLinkStatus]);

  useEffect(() => {
    if (users.length > 0) {
      checkAllLinkStatuses();
    }
  }, [users, checkAllLinkStatuses]);

  // IntersectionObserver to load more
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry || !entry.isIntersecting) return;
      const total = usersRef.current.length;
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
            const total = usersRef.current.length;
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

  // Link request functions
  const sendLinkRequest = useCallback(async (userId) => {
    if (!user || !token) return;
    
    try {
      const response = await axios.post('/api/links/request', 
        { recipientId: userId },
        { headers: { 'x-auth-token': token } }
      );
      
      setLinkStatuses(prev => ({ ...prev, [userId]: 'pending' }));
      setLinkIds(prev => ({ ...prev, [userId]: response.data.linkId }));
      setSnackbar({ open: true, message: 'Link request sent!', severity: 'success' });
    } catch (err) {
      console.error('Error sending link request:', err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || 'Failed to send link request', 
        severity: 'error' 
      });
    }
  }, [user, token]);

  const cancelLinkRequest = useCallback(async (userId) => {
    const linkId = linkIds[userId];
    if (!linkId || !token) return;
    
    try {
      await axios.delete(`/api/links/${linkId}`, {
        headers: { 'x-auth-token': token }
      });
      
      setLinkStatuses(prev => ({ ...prev, [userId]: 'none' }));
      setLinkIds(prev => ({ ...prev, [userId]: null }));
      setSnackbar({ open: true, message: 'Link request cancelled', severity: 'info' });
    } catch (err) {
      console.error('Error cancelling link request:', err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || 'Failed to cancel link request', 
        severity: 'error' 
      });
    }
  }, [linkIds, token]);

  const removeLink = useCallback(async (userId) => {
    const linkId = linkIds[userId];
    if (!linkId || !token) return;
    
    try {
      await axios.delete(`/api/links/${linkId}`, {
        headers: { 'x-auth-token': token }
      });
      
      setLinkStatuses(prev => ({ ...prev, [userId]: 'none' }));
      setLinkIds(prev => ({ ...prev, [userId]: null }));
      setSnackbar({ open: true, message: 'Link removed', severity: 'info' });
    } catch (err) {
      console.error('Error removing link:', err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || 'Failed to remove link', 
        severity: 'error' 
      });
    }
  }, [linkIds, token]);

  // Confirmation dialog handlers
  const handleLinkAction = useCallback((action, userId, userName) => {
    if (action === 'request') {
      sendLinkRequest(userId);
    } else if (action === 'cancel' || action === 'remove') {
      setConfirmDialog({
        open: true,
        action,
        userId,
        userName,
        message: action === 'cancel' 
          ? `Are you sure you want to cancel your link request to ${userName}?`
          : `Are you sure you want to remove your link with ${userName}?`
      });
    }
  }, [sendLinkRequest]);

  const handleConfirmAction = useCallback(() => {
    const { action, userId } = confirmDialog;
    if (action === 'cancel') {
      cancelLinkRequest(userId);
    } else if (action === 'remove') {
      removeLink(userId);
    }
    setConfirmDialog({ open: false, action: '', userId: '', userName: '', message: '' });
  }, [confirmDialog, cancelLinkRequest, removeLink]);

  const handleCloseConfirm = useCallback(() => {
    setConfirmDialog({ open: false, action: '', userId: '', userName: '', message: '' });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar({ open: false, message: '', severity: 'info' });
  }, []);

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
      userType: ''
    });
    setLocationQuery('');
  }, []);

  // Memoized filtered musicians (including current user)
  const filteredUsers = useMemo(() => {
    let result = [...users];
    
    // This is now handled by the backend, but we keep it for immediate client-side feedback while backend is fetching
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(musician =>
        musician.user.name.toLowerCase().includes(term) ||
        (musician.skills && musician.skills.some(skill => skill.toLowerCase().includes(term))) ||
        (musician.user.instruments && musician.user.instruments.some(instrument => instrument.toLowerCase().includes(term))) ||
        (musician.user.genres && musician.user.genres.some(genre => genre.toLowerCase().includes(term)))
      );
    }

    if (filters.instrument) {
      result = result.filter(musician => musician.user.instruments && musician.user.instruments.includes(filters.instrument));
    }

    if (filters.genre) {
      result = result.filter(musician => musician.user.genres && musician.user.genres.includes(filters.genre));
    }

    if (filters.location) {
      const location = filters.location.toLowerCase();
      result = result.filter(musician => musician.user.location && formatLocationString(musician.user.location).toLowerCase().includes(location));
    }

    if (filters.userType) {
      result = result.filter(musician => musician.user.userType === filters.userType);
    }
    
    return result;
  }, [users, searchTerm, filters]);

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          <Typography variant="h6">Error</Typography>
          <Typography>{error}</Typography>
          <Button onClick={() => window.location.reload()} sx={{ mt: 2 }} variant="outlined" color="error">
            Refresh Page
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
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
              gutterBottom
            >
              Discover Musicians
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
                  bgcolor: '#6b7280',
                  '&:hover': {
                    bgcolor: '#4b5563'
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
        placeholder="Search musicians by name, instruments, genres, or location..."
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
            mb: 4,
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
            
            <Grid item xs={12} sm={6} md={3}>
               <Autocomplete
                  options={instrumentOptions}
                  value={filters.instrument || ''}
                  onChange={(_e, v) => handleFilterChange('instrument', v || '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Instrument"
                      placeholder="Any Instrument"
                    />
                  )}
                />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
               <Autocomplete
                  options={genreOptions}
                  value={filters.genre || ''}
                  onChange={(_e, v) => handleFilterChange('genre', v || '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Genre"
                      placeholder="Any Genre"
                    />
                  )}
                />
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
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

          </Grid>
        </Paper>
      )}

      {loading ? (
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <MusicianCardSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          <Grid container spacing={3}>
            {filteredUsers.slice(0, loadedCount).map((musician) => (
              <Grid item xs={12} sm={6} md={4} key={musician._id}>
                <MusicianCard 
                  musician={musician} 
                  user={user} 
                  linkStatus={linkStatuses[musician.user._id] || 'none'}
                  onLinkAction={handleLinkAction}
                />
              </Grid>
            ))}
          </Grid>
          {/* Infinite scroll sentinel + spinner */}
          <Box ref={sentinelRef} sx={{ height: 1 }} />
          {loadingMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Skeleton variant="circular" width={24} height={24} />
            </Box>
          )}

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
        </>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseConfirm}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">
          Confirm Action
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirm} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmAction} color="primary" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Discover;