import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, TextField, Button, Grid, Chip, Autocomplete, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const EditProfile = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  
  // Predefined options for instruments and genres
  const instrumentOptions = ["Guitar", "Piano", "Drums", "Violin", "Saxophone", "Bass", "Vocals", "Trumpet", "Flute", "Cello", "Clarinet", "Trombone", "Harp", "Banjo", "Mandolin", "Accordion", "Harmonica", "Ukulele", "DJ Equipment", "Synthesizer"];
  const genreOptions = ["Rock", "Jazz", "Classical", "Pop", "Electronic", "Hip Hop", "R&B", "Folk", "Country", "Blues", "Reggae", "Punk", "Metal", "Alternative", "Indie", "Funk", "Soul", "Gospel", "Latin", "World Music"];
  
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    bio: '',
    instruments: [],
    genres: [],
    experience: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !user.id) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch profile data from backend
        const profileRes = await axios.get('http://localhost:5001/api/profiles/me', {
          headers: { 'x-auth-token': token }
        });
        const profileData = profileRes.data;
        setProfile(profileData);
        
        // Set form data with fetched profile data
        setFormData({
          name: profileData.user?.name || user?.name || '',
          location: profileData.user?.location || 'New York, NY', // Default location since not in backend data
          bio: profileData.bio || '',
          instruments: profileData.user?.instruments || profileData.skills?.filter(skill => instrumentOptions.includes(skill)) || [],
          genres: profileData.user?.genres || ['Rock', 'Jazz', 'Blues'], // Default genres
          experience: profileData.experience || ''
        });
      } catch (err) {
        console.error('Error fetching profile:', err);
        // Fallback to user data if profile fetch fails
        setFormData({
          name: user?.name || '',
          location: 'New York, NY',
          bio: '',
          instruments: '',
          genres: '',
          experience: ''
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleInstrumentsChange = (event, newValue) => {
    setFormData({ ...formData, instruments: newValue });
  };

  const handleGenresChange = (event, newValue) => {
    setFormData({ ...formData, genres: newValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    console.log('handleSubmit called');
    console.log('Form data before transformation:', formData);
    try {
      // Transform form data to match backend expectations
      const updateData = {
        bio: formData.bio,
        skills: Array.isArray(formData.instruments) ? formData.instruments : [],
        experience: formData.experience,
        location: formData.location,
        instruments: Array.isArray(formData.instruments) ? formData.instruments : [],
        genres: Array.isArray(formData.genres) ? formData.genres : []
      };
      
      console.log('Sending update data:', updateData);
      
      const response = await axios.put(
        'http://localhost:5001/api/profiles/me',
        updateData,
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data) {
        setSuccess('Profile updated successfully!');
        console.log('Profile updated:', response.data);
        // Redirect to user's specific profile page after 2 seconds
        setTimeout(() => {
          navigate(`/profile/${user._id || user.id}`);
        }, 2000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Error config:', error.config);
      setError(`Failed to update profile: Status ${error.response?.status || 'Unknown'} - ${error.response?.data?.message || error.message}`);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Edit Profile</Typography>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bio"
                name="bio"
                multiline
                rows={4}
                value={formData.bio}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={instrumentOptions}
                value={formData.instruments}
                onChange={handleInstrumentsChange}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                      <Chip key={key} variant="outlined" label={option} {...tagProps} />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Instruments"
                    placeholder="Select instruments"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={genreOptions}
                value={formData.genres}
                onChange={handleGenresChange}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                      <Chip key={key} variant="outlined" label={option} {...tagProps} />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Genres"
                    placeholder="Select genres"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Experience"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                sx={{ mt: 3, mb: 2 }}
              >
                Save Changes
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default EditProfile;