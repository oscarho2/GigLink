import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, TextField, Button, Grid, Autocomplete, Alert, Stepper, Step, StepLabel, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import GeoNamesAutocomplete from '../components/GeoNamesAutocomplete';
import { formatLocationString } from '../utils/text';
import { instrumentOptions, genreOptions } from '../constants/musicOptions';



const ProfileSetup = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  
  // Predefined options for instruments and genres come from centralized constants
  
  const [formData, setFormData] = useState({
    location: '',
    bio: '',
    isMusician: '',
    instruments: [],
    genres: []
  });
  
  // Pre-fill form data with user information from registration
  useEffect(() => {
    if (user) {
      setFormData(prevData => ({
        ...prevData,
        location: user.location || '',
        bio: user.bio || `Hi, I'm ${user.name}! I'm excited to connect with fellow musicians and discover new opportunities in the music world.`,
        isMusician: user.isMusician || '',
        instruments: user.instruments || [],
        genres: user.genres || []
      }));
    }
  }, [user]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  const steps = ['Basic Info', 'Skills', 'Complete Setup'];

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

  const handleLocationChange = (suggestion) => {
    if (suggestion) {
      setFormData({
        ...formData,
        location: suggestion.displayName,
        city: suggestion.name,
        region: suggestion.adminName1,
        country: suggestion.countryName,
      });
    } else {
      setFormData({ ...formData, location: '', city: '', region: '', country: '' });
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate basic info
      if (!formData.location.trim() || !formData.bio.trim() || !formData.isMusician) {
        setError('Please fill in all required fields');
        return;
      }
    } else if (activeStep === 1) {
      // Validate skills only if user is a musician
      if (formData.isMusician === 'yes' && (formData.instruments.length === 0 || formData.genres.length === 0)) {
        setError('Please select at least one instrument and one genre');
        return;
      }
    }
    
    setError('');
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validation: If user is a musician, they must select at least one instrument and one genre
    if (formData.isMusician === 'yes') {
      if (!formData.instruments || formData.instruments.length === 0) {
        setError('Musicians must select at least one instrument.');
        setLoading(false);
        return;
      }
      if (!formData.genres || formData.genres.length === 0) {
        setError('Musicians must select at least one genre.');
        setLoading(false);
        return;
      }
    }

    try {
      // Transform form data to match backend expectations (same as EditProfile)
      const updateData = {
        bio: formData.bio,
        skills: Array.isArray(formData.instruments) ? formData.instruments : [],
        location: formData.location,
        city: formData.city,
        region: formData.region,
        country: formData.country,
        isMusician: formData.isMusician,
        instruments: Array.isArray(formData.instruments) ? formData.instruments : [],
        genres: Array.isArray(formData.genres) ? formData.genres : [],
        videos: []
      };

      // First try to create a new profile
      try {
        await axios.post('/api/profiles', updateData, {
          headers: { 'x-auth-token': token }
        });
      } catch (createError) {
        // If profile already exists, update it instead
        if (createError.response?.status === 400 || createError.response?.data?.message?.includes('already exists')) {
          await axios.put('/api/profiles/me', updateData, {
            headers: { 
              'x-auth-token': token,
              'Content-Type': 'application/json'
            }
          });
        } else {
          throw createError;
        }
      }

      // Show setup complete message
      setSetupComplete(true);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error creating/updating profile:', err);
      setError(err.response?.data?.message || 'Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Tell us about yourself
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <GeoNamesAutocomplete
                value={formData.location}
                onChange={handleLocationChange}
                placeholder="Enter your city"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                multiline
                rows={4}
                placeholder="Tell other musicians about yourself and what you're looking for..."
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Are you a musician?</FormLabel>
                <RadioGroup
                  row
                  name="isMusician"
                  value={formData.isMusician}
                  onChange={handleChange}
                >
                  <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                  <FormControlLabel value="no" control={<Radio />} label="No" />
                </RadioGroup>
              </FormControl>
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {formData.isMusician === 'yes' ? 'Your musical skills' : 'Your skills'}
              </Typography>
            </Grid>
            {formData.isMusician === 'yes' && (
              <>
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    options={instrumentOptions}
                    value={formData.instruments}
                    onChange={handleInstrumentsChange}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Instruments"
                        placeholder="Select your instruments"
                        required
                      />
                    )}
                  />
                </Grid>
                 <Grid item xs={12}>
                   <Autocomplete
                     multiple
                     options={genreOptions}
                     value={formData.genres}
                     onChange={handleGenresChange}
                     renderInput={(params) => (
                       <TextField
                         {...params}
                         label="Genres"
                         placeholder="Select your preferred genres"
                         required
                       />
                     )}
                   />
                 </Grid>
              </>
            )}
            {formData.isMusician === 'no' && (
              <Grid item xs={12}>
                <Typography variant="body1" color="textSecondary">
                  Great! You can still connect with musicians and discover opportunities on GigLink.
                </Typography>
              </Grid>
            )}
          </Grid>
        );
      case 2:
        if (setupComplete) {
          return (
            <Grid container spacing={3}>
              <Grid item xs={12} sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h4" gutterBottom color="primary">
                  🎉 Setup Complete!
                </Typography>
                <Typography variant="h6" gutterBottom>
                  Welcome to GigLink, {user?.name}!
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Your profile has been created successfully. Redirecting you to your dashboard...
                </Typography>
              </Grid>
            </Grid>
          );
        }
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom>
                Creating your profile...
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Please wait while we set up your profile.
              </Typography>
            </Grid>
          </Grid>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom align="center">
            Welcome to GigLink, {user?.name}!
          </Typography>
          <Typography variant="body1" align="center" color="textSecondary" sx={{ mb: 3 }}>
            Let's set up your profile so other musicians can find and connect with you.
          </Typography>
          
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {renderStepContent(activeStep)}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Box>
              {activeStep !== 0 && (
                <Button onClick={handleBack} sx={{ mr: 1 }}>
                  Back
                </Button>
              )}

            </Box>
            
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || setupComplete}
                >
                  {setupComplete ? 'Redirecting...' : loading ? 'Creating Profile...' : 'Complete Setup'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default ProfileSetup;
