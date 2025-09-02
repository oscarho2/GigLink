import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, TextField, Button, Grid, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const CreateGig = () => {
  const [formData, setFormData] = useState({
    title: '',
    venue: '',
    location: '',
    date: '',
    time: '',
    payment: '',
    instruments: '',
    genres: '',
    description: '',
    requirements: '',

  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submissionMessage, setSubmissionMessage] = useState('');
  const { user, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Any initial setup or data fetching can go here
  }, []);





  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user || !token) {
      setError('You must be logged in to post a gig.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/api/gigs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          instruments: formData.instruments.split(',').map(item => item.trim()),
          genres: formData.genres.split(',').map(item => item.trim()),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to post gig');
      }

      setSuccess('Gig posted successfully!');
    setSubmissionMessage('Gig posted successfully!');
    setTimeout(() => {
      navigate('/gigs');
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
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <form onSubmit={handleSubmit}>
            {submissionMessage && <Alert severity={error ? "error" : "success"} sx={{ mb: 2 }}>{submissionMessage}</Alert>}
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
              <TextField fullWidth label="Payment" name="payment" value={formData.payment} onChange={handleChange} variant="outlined" required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Instruments Needed (comma separated)" name="instruments" value={formData.instruments} onChange={handleChange} variant="outlined" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Genres (comma separated)" name="genres" value={formData.genres} onChange={handleChange} variant="outlined" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={4} label="Description" name="description" value={formData.description} onChange={handleChange} variant="outlined" required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="Requirements" name="requirements" value={formData.requirements} onChange={handleChange} variant="outlined" />
            </Grid>

            <Grid item xs={12}>
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