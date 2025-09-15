import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, TextField, Button, Grid, Alert, Autocomplete, InputAdornment, Box, FormControl, Select, MenuItem, InputLabel, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GeoNamesAutocomplete from '../components/GeoNamesAutocomplete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';


const CreateGig = () => {
  // Predefined options for instruments and genres
  const instrumentOptions = ["Guitar", "Piano", "Drums", "Violin", "Saxophone", "Bass", "Vocals", "Trumpet", "Flute", "Cello", "Clarinet", "Trombone", "Harp", "Banjo", "Mandolin", "Accordion", "Harmonica", "Ukulele", "DJ Equipment", "Synthesizer"];
  const genreOptions = ["Rock", "Jazz", "Classical", "Pop", "Electronic", "Hip Hop", "R&B", "Folk", "Country", "Blues", "Reggae", "Punk", "Metal", "Alternative", "Indie", "Funk", "Soul", "Gospel", "Latin", "World Music"];

  const currencySymbols = { GBP: '£', USD: '$', EUR: '€', JPY: '¥', AUD: 'A$', CAD: 'C$' };
  const currencyOptions = [
    { code: 'GBP', label: 'GBP (£)' },
    { code: 'USD', label: 'USD ($)' },
    { code: 'EUR', label: 'EUR (€)' },
    { code: 'JPY', label: 'JPY (¥)' },
    { code: 'AUD', label: 'AUD (A$)' },
    { code: 'CAD', label: 'CAD (C$)' }
  ];

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
  const [currency, setCurrency] = useState('GBP');
  const [schedules, setSchedules] = useState([{ date: '', startTime: '', endTime: '' }]);
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

  const handleScheduleChange = (index, field, value) => {
    setSchedules(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addScheduleRow = () => {
    setSchedules(prev => [...prev, { date: '', startTime: '', endTime: '' }]);
  };

  const removeScheduleRow = (index) => {
    setSchedules(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!user || !token) {
      setError('You must be logged in to post a gig.');
      return;
    }

    try {
      const primaryDate = schedules[0]?.date || formData.date;
      const primaryTime = schedules[0]?.startTime || formData.time;

      const response = await fetch('http://localhost:5001/api/gigs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({
          ...formData,
          date: primaryDate,
          time: primaryTime,
          currency,
          schedules,
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
              <GeoNamesAutocomplete
                value={formData.location}
                onChange={(location) => {
                  setFormData({ ...formData, location });
                }}
                placeholder="Enter gig location"
                style={{ width: '100%' }}
              />
            </Grid>

            {/* Schedules Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Dates and Times</Typography>
            </Grid>
            {schedules.map((schedule, index) => (
              <React.Fragment key={index}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={schedule.date}
                    onChange={(e) => handleScheduleChange(index, 'date', e.target.value)}
                    variant="outlined"
                    required={index === 0}
                    sx={{
                      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.600' },
                      '& .MuiInputLabel-root.Mui-focused': { color: 'grey.700' },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Start Time"
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    value={schedule.startTime}
                    onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                    variant="outlined"
                    required={index === 0}
                    sx={{
                      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.600' },
                      '& .MuiInputLabel-root.Mui-focused': { color: 'grey.700' },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      label="End Time (Optional)"
                      type="time"
                      InputLabelProps={{ shrink: true }}
                      value={schedule.endTime}
                      onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.600' },
                        '& .MuiInputLabel-root.Mui-focused': { color: 'grey.700' },
                      }}
                    />
                    {index > 0 && (
                      <IconButton aria-label="remove date/time" color="error" onClick={() => removeScheduleRow(index)}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    )}
                  </Box>
                </Grid>
              </React.Fragment>
            ))}
            <Grid item xs={12}>
              <Button variant="text" startIcon={<AddCircleOutlineIcon />} onClick={addScheduleRow}>
                Add another date/time
              </Button>
            </Grid>

            {/* Currency and Payment */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel id="currency-label">Currency</InputLabel>
                <Select
                  labelId="currency-label"
                  value={currency}
                  label="Currency"
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {currencyOptions.map((opt) => (
                    <MenuItem key={opt.code} value={opt.code}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={8}>
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
                  startAdornment: <InputAdornment position="start">{currencySymbols[currency] || ''}</InputAdornment>,
                }}
                inputProps={{
                  min: 0,
                  step: "0.01",
                  onWheel: (e) => e.target.blur()
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

            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={instrumentOptions}
                value={formData.instruments}
                onChange={handleInstrumentsChange}
                renderInput={(params) => <TextField {...params} label="Instruments" variant="outlined" />}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={genreOptions}
                value={formData.genres}
                onChange={handleGenresChange}
                renderInput={(params) => <TextField {...params} label="Genres" variant="outlined" />}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={4} label="Description" name="description" value={formData.description} onChange={handleChange} variant="outlined" required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Requirements (Optional)" name="requirements" multiline rows={3} value={formData.requirements} onChange={handleChange} variant="outlined" placeholder="Any specific requirements or qualifications needed..." />
            </Grid>
            
            {error && (
              <Grid item xs={12}>
                <Alert severity="error">{error}</Alert>
              </Grid>
            )}
            {submissionMessage && (
              <Grid item xs={12}>
                <Alert severity={error ? "error" : "success"}>{submissionMessage}</Alert>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button variant="outlined" onClick={() => navigate('/dashboard')}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" color="primary">
                  Post Gig
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default CreateGig;