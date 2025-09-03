import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, TextField, Button, Grid, Alert, Autocomplete, Chip, InputAdornment } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const CreateGig = () => {
  // Predefined options for instruments and genres
  const instrumentOptions = ["Guitar", "Piano", "Drums", "Violin", "Saxophone", "Bass", "Vocals", "Trumpet", "Flute", "Cello", "Clarinet", "Trombone", "Harp", "Banjo", "Mandolin", "Accordion", "Harmonica", "Ukulele", "DJ Equipment", "Synthesizer"];
  const genreOptions = ["Rock", "Jazz", "Classical", "Pop", "Electronic", "Hip Hop", "R&B", "Folk", "Country", "Blues", "Reggae", "Punk", "Metal", "Alternative", "Indie", "Funk", "Soul", "Gospel", "Latin", "World Music"];

  const [formData, setFormData] = useState({
    title: '',
    venue: '',
    location: '',
    date: '',
    time: '',
    payment: '',
    instruments: [],
    genres: [],
    description: '',
    requirements: '',

  });
  const [error, setError] = useState('');
  const [submissionMessage, setSubmissionMessage] = useState('');
  const { user, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Any initial setup or data fetching can go here
  }, []);





  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

    if (!user || !token) {
      setError('You must be logged in to post a gig.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/api/gigs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({
          ...formData,
          instruments: formData.instruments,
          genres: formData.genres,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to post gig');
      }

      setSubmissionMessage('Gig posted successfully!');
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000); // Navigate after 2 seconds
    } catch (err) {

      setError(err.message || 'An unexpected error occurred.');
      setSubmissionMessage(`Error: ${err.message || 'An unexpected error occurred.'}`);
    }
  };


  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Post a Gig</Typography>
      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Title" name="title" value={formData.title} onChange={handleChange} variant="outlined" required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Venue" name="venue" value={formData.venue} onChange={handleChange} variant="outlined" required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Location" name="location" value={formData.location} onChange={handleChange} variant="outlined" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Date" name="date" type="date" InputLabelProps={{ shrink: true }} value={formData.date} onChange={handleChange} variant="outlined" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Time" name="time" type="time" InputLabelProps={{ shrink: true }} value={formData.time} onChange={handleChange} variant="outlined" required />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                label="Payment" 
                name="payment" 
                type="number"
                value={formData.payment} 
                onChange={handleChange} 
                variant="outlined" 
                required 
                InputProps={{
                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                }}
                inputProps={{
                  min: 0,
                  step: "0.01"
                }}
                sx={{
                  '& input[type=number]': {
                    '-moz-appearance': 'textfield'
                  },
                  '& input[type=number]::-webkit-outer-spin-button': {
                    '-webkit-appearance': 'none',
                    margin: 0
                  },
                  '& input[type=number]::-webkit-inner-spin-button': {
                    '-webkit-appearance': 'none',
                    margin: 0
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={instrumentOptions}
                value={formData.instruments}
                onChange={handleInstrumentsChange}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                  ))
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
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                  ))
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
              <TextField fullWidth multiline rows={4} label="Description" name="description" value={formData.description} onChange={handleChange} variant="outlined" required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="Requirements" name="requirements" value={formData.requirements} onChange={handleChange} variant="outlined" />
            </Grid>

            <Grid item xs={12}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {submissionMessage && <Alert severity={error ? "error" : "success"} sx={{ mb: 2 }}>{submissionMessage}</Alert>}
              <Button type="submit" fullWidth variant="contained" color="primary" sx={{ mt: 2 }}>
                Post Gig
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default CreateGig;