import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, TextField, Button, Grid, Alert, Autocomplete, InputAdornment, Box, FormControl, Select, MenuItem, InputLabel, IconButton } from '@mui/material';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/material_blue.css';
import '../styles/flatpickr-compact.css';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useNavigate } from 'react-router-dom';
import { instrumentOptions, genreOptions } from '../constants/musicOptions';
import { useAuth } from '../context/AuthContext';
import GeoNamesAutocomplete from '../components/GeoNamesAutocomplete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';


const CreateGig = () => {
  // Predefined options for instruments and genres come from centralized constants

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

      const response = await fetch('/api/gigs', {
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
                  <Flatpickr
                    options={{
                      dateFormat: 'd/m/Y',
                      disableMobile: true,
                      allowInput: true,
                      clickOpens: false,
                      onChange: (_dates, _str, instance) => instance.close()
                    }}
                    onChange={([d]) => handleScheduleChange(index, 'date', d ? d.toISOString().slice(0, 10) : '')}
                    render={(props, ref) => (
                      <TextField
                        inputRef={ref}
                        inputProps={{
                          ...props,
                          id: `date-input-${index}`,
                          inputMode: 'numeric',
                          maxLength: 10,
                          placeholder: 'DD/MM/YYYY',
                          pattern: '\\d{2}/\\d{2}/\\d{4}',
                          onInput: (e) => {
                            let v = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                            if (v.length >= 5) v = `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
                            else if (v.length >= 3) v = `${v.slice(0,2)}/${v.slice(2)}`;
                            e.target.value = v;
                          }
                        }}
                        fullWidth
                        size="small"
                        label="Date (DD/MM/YYYY)"
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        required={index === 0}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="open date picker"
                                onClick={() => {
                                  const el = document.getElementById(`date-input-${index}`);
                                  if (el && el._flatpickr) el._flatpickr.open();
                                  else if (el) el.focus();
                                }}
                                size="small"
                              >
                                <CalendarTodayIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                        onBlur={(e) => {
                          const val = (e.target.value || '').trim();
                          if (!val) { handleScheduleChange(index, 'date', ''); return; }
                          const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                          if (m) {
                            const d = m[1].padStart(2,'0');
                            const mo = m[2].padStart(2,'0');
                            const y = m[3];
                            // Basic validity check using Date
                            const dt = new Date(`${y}-${mo}-${d}T00:00:00Z`);
                            if (!isNaN(dt.getTime())) {
                              handleScheduleChange(index, 'date', `${y}-${mo}-${d}`);
                            }
                          }
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Flatpickr
                    options={{
                      enableTime: true,
                      noCalendar: true,
                      dateFormat: 'H:i',
                      time_24hr: true,
                      minuteIncrement: 5,
                      disableMobile: true,
                      allowInput: true,
                      clickOpens: false,
                      onOpen: (_d, _s, instance) => {
                        if (instance?.calendarContainer) instance.calendarContainer.classList.add('fp-compact');
                      }
                    }}
                    onChange={([d]) => handleScheduleChange(index, 'startTime', d ? d.toTimeString().slice(0, 5) : '')}
                    render={(props, ref) => (
                      <TextField
                        inputRef={ref}
                        inputProps={{
                          ...props,
                          id: `start-time-input-${index}`,
                          inputMode: 'numeric',
                          maxLength: 5,
                          placeholder: '--:--',
                          pattern: '(?:[01]\\d|2[0-3]):[0-5]\\d',
                          onInput: (e) => {
                            let v = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                            if (v.length >= 3) v = `${v.slice(0,2)}:${v.slice(2)}`;
                            e.target.value = v;
                          }
                        }}
                        fullWidth
                        size="small"
                        label="Start Time"
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        required={index === 0}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="open start time picker"
                                onClick={() => {
                                  const el = document.getElementById(`start-time-input-${index}`);
                                  if (el && el._flatpickr) el._flatpickr.open();
                                  else if (el) el.focus();
                                }}
                                size="small"
                              >
                                <AccessTimeIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                        onBlur={(e) => {
                          const val = (e.target.value || '').trim();
                          const isValid = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(val);
                          if (isValid || val === '') {
                            handleScheduleChange(index, 'startTime', val);
                          }
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Flatpickr
                      options={{
                        enableTime: true,
                        noCalendar: true,
                        dateFormat: 'H:i',
                        time_24hr: true,
                        minuteIncrement: 5,
                        disableMobile: true,
                        allowInput: true,
                        clickOpens: false,
                        onOpen: (_d, _s, instance) => {
                          if (instance?.calendarContainer) instance.calendarContainer.classList.add('fp-compact');
                        }
                      }}
                      onChange={([d]) => handleScheduleChange(index, 'endTime', d ? d.toTimeString().slice(0, 5) : '')}
                      render={(props, ref) => (
                        <TextField
                          inputRef={ref}
                          inputProps={{
                            ...props,
                            id: `end-time-input-${index}`,
                            inputMode: 'numeric',
                            maxLength: 5,
                            placeholder: '--:--',
                            pattern: '(?:[01]\\d|2[0-3]):[0-5]\\d',
                            onInput: (e) => {
                              let v = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                              if (v.length >= 3) v = `${v.slice(0,2)}:${v.slice(2)}`;
                              e.target.value = v;
                            }
                          }}
                          fullWidth
                          size="small"
                          label="End Time (Optional)"
                          InputLabelProps={{ shrink: true }}
                          variant="outlined"
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label="open end time picker"
                                  onClick={() => {
                                    const el = document.getElementById(`end-time-input-${index}`);
                                    if (el && el._flatpickr) el._flatpickr.open();
                                    else if (el) el.focus();
                                  }}
                                  size="small"
                                >
                                  <AccessTimeIcon fontSize="small" />
                                </IconButton>
                              </InputAdornment>
                            )
                          }}
                          onBlur={(e) => {
                            const val = (e.target.value || '').trim();
                            const isValid = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(val);
                            if (isValid || val === '') {
                              handleScheduleChange(index, 'endTime', val);
                            }
                          }}
                        />
                      )}
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
