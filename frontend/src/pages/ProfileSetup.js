import React, { useState } from 'react';
import { Container, Typography, Box, Paper, TextField, Button, Grid, Autocomplete, Alert, Stepper, Step, StepLabel } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ProfileSetup = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  
  // Predefined options for instruments and genres
  const instrumentOptions = ["Guitar", "Piano", "Drums", "Violin", "Saxophone", "Bass", "Vocals", "Trumpet", "Flute", "Cello", "Clarinet", "Trombone", "Harp", "Banjo", "Mandolin", "Accordion", "Harmonica", "Ukulele", "DJ Equipment", "Synthesizer"];
  const genreOptions = ["Rock", "Jazz", "Classical", "Pop", "Electronic", "Hip Hop", "R&B", "Folk", "Country", "Blues", "Reggae", "Punk", "Metal", "Alternative", "Indie", "Funk", "Soul", "Gospel", "Latin", "World Music"];
  const experienceOptions = ["Beginner", "Intermediate", "Advanced", "Professional"];
  
  const [formData, setFormData] = useState({
    location: '',
    bio: '',
    instruments: [],
    genres: [],
    experience: 'Beginner',
    hourlyRate: 50,
    availability: 'Available'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const steps = ['Basic Info', 'Skills & Experience', 'Complete Setup'];

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

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate basic info
      if (!formData.location.trim() || !formData.bio.trim()) {
        setError('Please fill in all required fields');
        return;
      }
    } else if (activeStep === 1) {
      // Validate skills
      if (formData.instruments.length === 0 || formData.genres.length === 0) {
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

    try {
      // Update the user's profile
      await axios.put('http://localhost:5001/api/profiles/me', {
        bio: formData.bio,
        skills: formData.instruments,
        experience: formData.experience,
        hourlyRate: parseInt(formData.hourlyRate),
        availability: formData.availability,
        location: formData.location,
        instruments: formData.instruments,
        genres: formData.genres
      }, {
        headers: { 'x-auth-token': token }
      });

      // Redirect to profile page
      navigate('/profile');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Allow user to skip profile setup and go to dashboard
    navigate('/dashboard');
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
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., New York, NY"
                required
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
                placeholder="Tell other musicians about yourself, your experience, and what you're looking for..."
                required
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Your musical skills
              </Typography>
            </Grid>
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
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={experienceOptions}
                value={formData.experience}
                onChange={(event, newValue) => {
                  setFormData({ ...formData, experience: newValue || 'Beginner' });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Experience Level"
                    required
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Hourly Rate (£)"
                name="hourlyRate"
                type="number"
                value={formData.hourlyRate}
                onChange={handleChange}
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Review your profile
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 2, backgroundColor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>Location:</Typography>
                <Typography variant="body2" gutterBottom>{formData.location}</Typography>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Bio:</Typography>
                <Typography variant="body2" gutterBottom>{formData.bio}</Typography>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Instruments:</Typography>
                <Typography variant="body2" gutterBottom>{formData.instruments.join(', ')}</Typography>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Genres:</Typography>
                <Typography variant="body2" gutterBottom>{formData.genres.join(', ')}</Typography>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Experience:</Typography>
                <Typography variant="body2" gutterBottom>{formData.experience}</Typography>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Hourly Rate:</Typography>
                <Typography variant="body2">£{formData.hourlyRate}</Typography>
              </Paper>
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
              <Button onClick={handleSkip} color="secondary">
                Skip for now
              </Button>
            </Box>
            
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? 'Creating Profile...' : 'Complete Setup'}
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