import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Grid, Avatar, Chip, Button } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Profile = () => {
  const { user, token } = useAuth();
  const { id } = useParams(); // Get user ID from URL params
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let profileData;
        
        if (id) {
          // Fetch specific user's profile by ID (public route)
          const profileRes = await axios.get(`/api/profiles/user/${id}`);
          profileData = profileRes.data;
          // Consider both _id and id in user object
          setIsOwnProfile(!!user && (user._id === id || user.id === id));
        } else {
          // Fetch current user's profile (private route)
          if (!user || !(user._id || user.id)) {
            setLoading(false);
            return;
          }
          
          const profileRes = await axios.get('/api/profiles/me', {
            headers: { 'x-auth-token': token }
          });
          profileData = profileRes.data;
          setIsOwnProfile(true);
        }
        
        // Transform backend data to match UI expectations
        const transformedProfile = {
          name: profileData.user?.name || user?.name || 'User',
          avatar: profileData.user?.avatar || user?.avatar || '',
          bio: profileData.bio || 'Professional musician and event organizer with years of experience in the music industry.',
          location: profileData.user?.location || 'Location not specified',
          instruments: profileData.user?.instruments || profileData.skills?.filter(skill => ['Piano', 'Guitar', 'Vocals', 'Drums', 'Bass', 'Violin', 'Saxophone'].includes(skill)) || ['Piano', 'Guitar'],
          genres: profileData.user?.genres || ['Rock', 'Jazz', 'Blues'],
          experience: profileData.experience || 'Senior',
          videos: profileData.videos || [
            { title: 'Live at Jazz Club', url: 'https://youtube.com/watch?v=123' },
            { title: 'Studio Session', url: 'https://youtube.com/watch?v=456' }
          ]
        };
        
        setProfile(transformedProfile);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, token, id]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography>Profile not found</Typography>
      </Container>
    );
  }

  return (
    <Container 
      maxWidth="md" 
      sx={{ 
        py: { xs: 2, sm: 4 },
        px: { xs: 1, sm: 3 }
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          mb: { xs: 3, sm: 4 }, 
          maxHeight: { xs: 'none', md: '600px' }, 
          overflow: { xs: 'visible', md: 'auto' }
        }}
      >
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid 
            item 
            xs={12} 
            md={4} 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              mb: { xs: 2, md: 0 }
            }}
          >
            <Avatar
              src={profile.avatar}
              alt={profile.name}
              sx={{ 
                width: { xs: 120, sm: 150 }, 
                height: { xs: 120, sm: 150 }, 
                mb: { xs: 1.5, sm: 2 },
                fontSize: { xs: '2.5rem', sm: '3rem' }
              }}
            >
              {profile.name.charAt(0)}
            </Avatar>
            <Typography 
              variant="h5" 
              gutterBottom
              sx={{
                fontSize: { xs: '1.5rem', sm: '2.125rem' },
                textAlign: 'center'
              }}
            >
              {profile.name}
            </Typography>
            <Typography 
              variant="body2" 
              color="textSecondary" 
              sx={{ 
                mb: { xs: 1.5, sm: 2 },
                fontSize: { xs: '0.875rem', sm: '0.875rem' },
                textAlign: 'center'
              }}
            >
              {profile.location}
            </Typography>
            {isOwnProfile && (
              <Button
                component={RouterLink}
                to="/edit-profile"
                variant="contained"
                startIcon={<EditIcon />}
                size="small"
                sx={{
                  minHeight: { xs: 40, sm: 32 },
                  fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                  px: { xs: 2, sm: 1.5 }
                }}
              >
                Edit Profile
              </Button>
            )}
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                fontSize: { xs: '1.125rem', sm: '1.25rem' },
                fontWeight: 600
              }}
            >
              Bio
            </Typography>
            <Typography 
              paragraph 
              sx={{ 
                whiteSpace: 'pre-wrap',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                lineHeight: { xs: 1.5, sm: 1.6 },
                mb: { xs: 2, sm: 2 }
              }}
            >
              {profile.bio}
            </Typography>
            
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                fontSize: { xs: '1.125rem', sm: '1.25rem' },
                fontWeight: 600
              }}
            >
              Instruments
            </Typography>
            <Box sx={{ mb: { xs: 2, sm: 2 } }}>
              {profile.instruments.map((instrument, index) => (
                <Chip 
                  key={index} 
                  label={instrument} 
                  sx={{ 
                    mr: { xs: 0.75, sm: 1 }, 
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                    height: { xs: 28, sm: 32 }
                  }} 
                />
              ))}
            </Box>
            
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                fontSize: { xs: '1.125rem', sm: '1.25rem' },
                fontWeight: 600
              }}
            >
              Genres
            </Typography>
            <Box sx={{ mb: { xs: 2, sm: 2 } }}>
              {profile.genres.map((genre, index) => (
                <Chip 
                  key={index} 
                  label={genre} 
                  sx={{ 
                    mr: { xs: 0.75, sm: 1 }, 
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                    height: { xs: 28, sm: 32 }
                  }} 
                />
              ))}
            </Box>
            
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                fontSize: { xs: '1.125rem', sm: '1.25rem' },
                fontWeight: 600
              }}
            >
              Experience
            </Typography>
            <Typography 
              paragraph
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                lineHeight: { xs: 1.5, sm: 1.6 }
              }}
            >
              {profile.experience}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      <Typography 
        variant="h5" 
        gutterBottom
        sx={{
          fontSize: { xs: '1.5rem', sm: '2.125rem' },
          fontWeight: 600,
          mb: { xs: 2, sm: 3 }
        }}
      >
        Videos
      </Typography>
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {profile.videos.map((video, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: { xs: 1.5, sm: 2 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Typography 
                variant="h6"
                sx={{
                  fontSize: { xs: '1.125rem', sm: '1.25rem' },
                  fontWeight: 500,
                  mb: { xs: 1.5, sm: 2 }
                }}
              >
                {video.title}
              </Typography>
              <Box 
                sx={{ 
                  mt: { xs: 1, sm: 2 }, 
                  mb: { xs: 1.5, sm: 2 }, 
                  height: { xs: '150px', sm: '200px' }, 
                  bgcolor: 'grey.300', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderRadius: 1,
                  flex: 1
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    color: 'text.secondary'
                  }}
                >
                  Video Preview
                </Typography>
              </Box>
              <Button 
                variant="outlined" 
                fullWidth 
                href={video.url} 
                target="_blank"
                sx={{
                  minHeight: { xs: 40, sm: 36 },
                  fontSize: { xs: '0.875rem', sm: '0.875rem' },
                  mt: 'auto'
                }}
              >
                Watch Video
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Profile;