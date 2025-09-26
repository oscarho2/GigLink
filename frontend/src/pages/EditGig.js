import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Autocomplete,
  InputAdornment,
  CircularProgress,
  Box,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  IconButton
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import VenueAutocomplete from '../components/VenueAutocomplete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/material_blue.css';
import '../styles/flatpickr-compact.css';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import { instrumentOptions, genreOptions } from '../constants/musicOptions';

const currencySymbols = { GBP: '£', USD: '$', EUR: '€', JPY: '¥', AUD: 'A$', CAD: 'C$' };
const currencyOptions = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'JPY', label: 'JPY (¥)' },
  { code: 'AUD', label: 'AUD (A$)' },
  { code: 'CAD', label: 'CAD (C$)' }
];

function EditGig() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
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
    requirements: ''
  });
  const [currency, setCurrency] = useState('USD');
  const [userSetCurrency, setUserSetCurrency] = useState(false);
  const allowedCurrencyCodes = currencyOptions.map(o => o.code);

  const countryToCurrency = (countryToken) => {
    const t = (countryToken || '').trim();
    const up = t.toUpperCase();
    const map = {
      GB: 'GBP', UK: 'GBP', 'UNITED KINGDOM': 'GBP', IE: 'EUR',
      US: 'USD', USA: 'USD', 'UNITED STATES': 'USD', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
      FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', PT: 'EUR', GR: 'EUR', AT: 'EUR', FI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', LU: 'EUR', MT: 'EUR', CY: 'EUR', SK: 'EUR', SI: 'EUR', IE: 'EUR',
      SE: 'SEK', NO: 'NOK', DK: 'DKK', CH: 'CHF', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN',
      RU: 'RUB', TR: 'TRY',
      JP: 'JPY', CN: 'CNY', HK: 'HKD', SG: 'SGD', IN: 'INR', KR: 'KRW', TW: 'TWD', TH: 'THB', ID: 'IDR', MY: 'MYR', PH: 'PHP', VN: 'VND',
      MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN', ZA: 'ZAR',
      AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR', IL: 'ILS', NG: 'NGN', KE: 'KES', EG: 'EGP'
    };
    if (map[up]) return map[up];
    const name = t.toLowerCase();
    const byName = {
      'united kingdom': 'GBP', 'england': 'GBP', 'scotland': 'GBP', 'wales': 'GBP', 'northern ireland': 'GBP',
      'united states': 'USD', 'canada': 'CAD', 'australia': 'AUD', 'new zealand': 'NZD',
      'switzerland': 'CHF', 'sweden': 'SEK', 'norway': 'NOK', 'denmark': 'DKK',
      'poland': 'PLN', 'czech republic': 'CZK', 'hungary': 'HUF', 'romania': 'RON', 'bulgaria': 'BGN',
      'russia': 'RUB', 'turkey': 'TRY', 'japan': 'JPY', 'china': 'CNY', 'hong kong': 'HKD', 'singapore': 'SGD',
      'india': 'INR', 'south korea': 'KRW', 'taiwan': 'TWD', 'thailand': 'THB', 'indonesia': 'IDR', 'malaysia': 'MYR', 'philippines': 'PHP', 'vietnam': 'VND',
      'mexico': 'MXN', 'brazil': 'BRL', 'argentina': 'ARS', 'chile': 'CLP', 'colombia': 'COP', 'peru': 'PEN', 'south africa': 'ZAR',
      'united arab emirates': 'AED', 'saudi arabia': 'SAR', 'qatar': 'QAR', 'kuwait': 'KWD', 'bahrain': 'BHD', 'oman': 'OMR', 'israel': 'ILS', 'nigeria': 'NGN', 'kenya': 'KES', 'egypt': 'EGP'
    };
    return byName[name] || null;
  };

  const setCurrencyFromLocationString = (loc) => {
    if (!loc || userSetCurrency) return;
    const parts = String(loc).split(',').map(s => s.trim()).filter(Boolean);
    const token = parts[parts.length - 1] || '';
    const code = countryToCurrency(token);
    if (code && allowedCurrencyCodes.includes(code)) setCurrency(code);
  };

  useEffect(() => {
    // Initial guess from browser locale, only if gig didn't specify currency
    if (userSetCurrency) return;
    try {
      const lang = (navigator.languages && navigator.languages[0]) || navigator.language || '';
      const region = (lang.split('-')[1] || '').toUpperCase();
      if (region) {
        const code = countryToCurrency(region);
        if (code && allowedCurrencyCodes.includes(code)) setCurrency(code);
      }
    } catch {}
  }, [userSetCurrency]);
  const [schedules, setSchedules] = useState([{ date: '', startTime: '', endTime: '' }]);

  useEffect(() => {
    fetchGig();
  }, [id]);

  const fetchGig = async () => {
    try {
      const response = await fetch(`/api/gigs/${id}`, {
        headers: {
          'x-auth-token': token
        }
      });
      if (response.ok) {
        const gig = await response.json();
        
        // Check if user owns this gig (handle both user.id and user._id, and gig.user as object or string)
        const currentUserId = (user?.id || user?._id)?.toString();
        const gigOwnerId = (typeof gig.user === 'object' && gig.user !== null)
          ? (gig.user._id || gig.user.id || gig.user)?.toString()
          : gig.user?.toString();

        if (!currentUserId || !gigOwnerId || gigOwnerId !== currentUserId) {
          setError('You are not authorized to edit this gig');
          setLoading(false);
          return;
        }
        
        setFormData({
          title: gig.title || '',
          venue: gig.venue || '',
          location: gig.location || '',
          date: gig.date || '',
          time: gig.time || '',
          payment: gig.payment || '',
          instruments: gig.instruments || [],
          genres: gig.genres || [],
          description: gig.description || '',
          requirements: gig.requirements || ''
        });
        
        // Set currency if available
        if (gig.currency) {
          setCurrency(gig.currency);
        }
        
        // Set schedules if available, otherwise use legacy date/time
        if (gig.schedules && gig.schedules.length > 0) {
          setSchedules(gig.schedules);
        } else if (gig.date || gig.time) {
          setSchedules([{ date: gig.date || '', startTime: gig.time || '', endTime: '' }]);
        }
      } else {
        setError('Failed to fetch gig details');
      }
    } catch (err) {
      setError('Error fetching gig details');
    } finally {
      setLoading(false);
    }
  };

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
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const primaryDate = schedules[0]?.date || formData.date;
      const primaryTime = schedules[0]?.startTime || formData.time;

      const response = await fetch(`/api/gigs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          ...formData,
          date: primaryDate,
          time: primaryTime,
          currency,
          schedules
        })
      });

      if (response.ok) {
        setSuccess('Gig updated successfully!');
        setTimeout(() => {
          navigate(`/gigs/${id}`);
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.msg || 'Failed to update gig');
      }
    } catch (err) {
      setError('Error updating gig');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error && !formData.title) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Edit Gig</Typography>
      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Title" name="title" value={formData.title} onChange={handleChange} variant="outlined" required />
            </Grid>
            <Grid item xs={12}>
              <VenueAutocomplete
                value={formData.venue}
                near={formData.location}
                onChange={(venue) => setFormData(prev => ({ ...prev, venue }))}
                onLocationChange={(loc) => {
                  setFormData(prev => ({ ...prev, location: loc || '' }));
                  setCurrencyFromLocationString(loc);
                }}
                label="Venue"
                placeholder="Search venues"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                InputProps={{ readOnly: true }}
                placeholder="Auto-filled from venue"
                variant="outlined"
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
                    value={schedule.date || ''}
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
                          id: `edit-date-input-${index}`,
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
                                  const el = document.getElementById(`edit-date-input-${index}`);
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
                    value={schedule.startTime || ''}
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
                          id: `edit-start-time-input-${index}`,
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
                                  const el = document.getElementById(`edit-start-time-input-${index}`);
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
                      value={schedule.endTime || ''}
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
                            id: `edit-end-time-input-${index}`,
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
                                    const el = document.getElementById(`edit-end-time-input-${index}`);
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
                  onChange={(e) => { setCurrency(e.target.value); setUserSetCurrency(true); }}
                  MenuProps={{
                    PaperProps: { style: { maxHeight: 240, overflowY: 'auto' } }
                  }}
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
                autoHighlight
                options={instrumentOptions}
                value={formData.instruments}
                onChange={handleInstrumentsChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Instruments"
                    variant="outlined"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                autoHighlight
                options={genreOptions}
                value={formData.genres}
                onChange={handleGenresChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Genres"
                    variant="outlined"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={4}
                variant="outlined"
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField fullWidth label="Requirements (Optional)" name="requirements" multiline rows={3} value={formData.requirements} onChange={handleChange} variant="outlined" placeholder="Any specific requirements or qualifications needed..." />
            </Grid>
            
            {error && (
              <Grid item xs={12}>
                <Alert severity="error">{error}</Alert>
              </Grid>
            )}
            {success && (
              <Grid item xs={12}>
                <Alert severity="success">{success}</Alert>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button variant="outlined" onClick={() => navigate('/dashboard')}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={submitting}>
                    {submitting ? 'Updating...' : 'Update Gig'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}

export default EditGig;
