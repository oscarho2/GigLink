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
          const profileRes = await axios.get(`http://localhost:5001/api/profiles/user/${id}`);
          profileData = profileRes.data;
          // Consider both _id and id in user object
          setIsOwnProfile(!!user && (user._id === id || user.id === id));
        } else {
          // Fetch current user's profile (private route)
          if (!user || !(user._id || user.id)) {
            setLoading(false);
            return;
          }
          
          const profileRes = await axios.get('http://localhost:5001/api/profiles/me', {
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
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 4, maxHeight: '600px', overflow: 'auto' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Avatar
              src={profile.avatar}
              alt={profile.name}
              sx={{ width: 150, height: 150, mb: 2 }}
            >
              {profile.name.charAt(0)}
            </Avatar>
            <Typography variant="h5" gutterBottom>{profile.name}</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{profile.location}</Typography>
            {isOwnProfile && (
              <Button
                component={RouterLink}
                to="/edit-profile"
                variant="contained"
                startIcon={<EditIcon />}
                size="small"
              >
                Edit Profile
              </Button>
            )}
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>Bio</Typography>
            <Typography paragraph sx={{ whiteSpace: 'pre-wrap' }}>{profile.bio}</Typography>
            
            <Typography variant="h6" gutterBottom>Instruments</Typography>
            <Box sx={{ mb: 2 }}>
              {profile.instruments.map((instrument, index) => (
                <Chip key={index} label={instrument} sx={{ mr: 1, mb: 1 }} />
              ))}
            </Box>
            
            <Typography variant="h6" gutterBottom>Genres</Typography>
            <Box sx={{ mb: 2 }}>
              {profile.genres.map((genre, index) => (
                <Chip key={index} label={genre} sx={{ mr: 1, mb: 1 }} />
              ))}
            </Box>
            
            <Typography variant="h6" gutterBottom>Experience</Typography>
            <Typography paragraph>{profile.experience}</Typography>
          </Grid>
        </Grid>
      </Paper>
      
      <Typography variant="h5" gutterBottom>Videos</Typography>
      <Grid container spacing={3}>
        {profile.videos.map((video, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6">{video.title}</Typography>
              <Box sx={{ mt: 2, mb: 2, height: '200px', bgcolor: 'grey.300', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography>Video Preview</Typography>
              </Box>
              <Button variant="outlined" fullWidth href={video.url} target="_blank">
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