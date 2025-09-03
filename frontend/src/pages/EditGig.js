import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const instrumentOptions = [
  'Guitar', 'Bass', 'Drums', 'Piano', 'Keyboard', 'Violin', 'Viola', 'Cello',
  'Saxophone', 'Trumpet', 'Trombone', 'Flute', 'Clarinet', 'Vocals', 'DJ Equipment'
];

const genreOptions = [
  'Rock', 'Pop', 'Jazz', 'Classical', 'Electronic', 'Hip-Hop', 'R&B',
  'Country', 'Folk', 'Blues', 'Reggae', 'Alternative', 'Indie', 'Metal'
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

  useEffect(() => {
    fetchGig();
  }, [id]);

  const fetchGig = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/gigs/${id}`, {
        headers: {
          'x-auth-token': token
        }
      });
      if (response.ok) {
        const gig = await response.json();
        
        // Check if user owns this gig
        if (gig.user._id !== user?.id) {
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleMultiSelectChange = (event, fieldName) => {
    const value = typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value;
    setFormData({
      ...formData,
      [fieldName]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`http://localhost:5001/api/gigs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(formData)
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
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Gig
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Gig Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Venue"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Time"
                name="time"
                type="time"
                value={formData.time}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payment"
                name="payment"
                type="number"
                value={formData.payment}
                onChange={handleChange}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                }}
                inputProps={{
                  min: 0,
                  step: "0.01"
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Instruments Needed</InputLabel>
                <Select
                  multiple
                  value={formData.instruments}
                  onChange={(e) => handleMultiSelectChange(e, 'instruments')}
                  input={<OutlinedInput label="Instruments Needed" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  {instrumentOptions.map((instrument) => (
                    <MenuItem key={instrument} value={instrument}>
                      {instrument}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Genres</InputLabel>
                <Select
                  multiple
                  value={formData.genres}
                  onChange={(e) => handleMultiSelectChange(e, 'genres')}
                  input={<OutlinedInput label="Genres" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  {genreOptions.map((genre) => (
                    <MenuItem key={genre} value={genre}>
                      {genre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Requirements"
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                multiline
                rows={3}
                placeholder="Any specific requirements or qualifications needed..."
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/gigs/${id}`)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={20} /> : null}
                >
                  {submitting ? 'Updating...' : 'Update Gig'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
}

export default EditGig;