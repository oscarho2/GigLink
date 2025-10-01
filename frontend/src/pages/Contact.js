import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Snackbar, 
  Alert, 
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import axios from 'axios';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [errors, setErrors] = useState({});

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/contact/categories');
        setCategories(response.data.categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback categories if API fails
        setCategories([
          { value: 'general', label: 'General Inquiry' },
          { value: 'support', label: 'Technical Support' },
          { value: 'bug', label: 'Bug Report' },
          { value: 'feature', label: 'Feature Request' },
          { value: 'business', label: 'Business Inquiry' }
        ]);
      }
    };

    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    } else if (formData.message.trim().length > 2000) {
      newErrors.message = 'Message must be less than 2000 characters';
    }

    if (formData.subject && formData.subject.length > 200) {
      newErrors.subject = 'Subject must be less than 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSnackbar({ 
        open: true, 
        message: 'Please fix the errors below', 
        severity: 'error' 
      });
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/contact', formData);
      const { success, message: responseMessage, error: responseError, delivery } = response.data || {};

      if (success) {
        setSnackbar({
          open: true,
          message: responseMessage || 'Message sent successfully.',
          severity: delivery === 'queued' ? 'info' : 'success'
        });

        // Reset form
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
          category: 'general'
        });
      } else {
        if (Array.isArray(response?.data?.errors)) {
          const backendErrors = {};
          response.data.errors.forEach(err => {
            backendErrors[err.path || err.param] = err.msg;
          });
          setErrors(backendErrors);
        }
        setSnackbar({
          open: true,
          message: responseError || responseMessage || 'Unable to send your message right now. Please try again later.',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Contact form error:', error);
      
      let errorMessage = 'Failed to send message. Please try again later.';
      
      if (error.response?.status === 429) {
        errorMessage = error.response.data.error || 'Too many submissions. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle validation errors from backend
        const backendErrors = {};
        error.response.data.errors.forEach(err => {
          backendErrors[err.path || err.param] = err.msg;
        });
        setErrors(backendErrors);
        errorMessage = 'Please fix the errors below';
      }
      
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ open: false, message: '', severity: 'info' });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
          Contact Us
        </Typography>
        <Typography variant="body1" paragraph color="text.secondary">
          Have a question, feedback, or need support? We'd love to hear from you! 
          Fill out the form below and we'll get back to you as soon as possible.
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Your Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                required
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Your Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                required
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={loading}>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  label="Category"
                >
                  {categories.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Subject (Optional)"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                error={!!errors.subject}
                helperText={errors.subject}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                error={!!errors.message}
                helperText={errors.message || `${formData.message.length}/2000 characters`}
                required
                multiline
                rows={6}
                disabled={loading}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              disabled={loading}
              sx={{ minWidth: 140 }}
            >
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Contact;
