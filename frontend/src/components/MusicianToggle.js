import React, { useState } from 'react';
import { FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Button, Alert, Box } from '@mui/material';
import axios from 'axios';

const MusicianToggle = ({ initialValue, token, onSuccess, onError }) => {
  const [isMusician, setIsMusician] = useState(initialValue || 'no');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (event) => {
    setIsMusician(event.target.value);
    setMessage(''); // Clear any previous messages
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      console.log('🚀 Saving isMusician:', isMusician);
      
      const response = await axios.put('/api/profiles/musician-status', 
        { isMusician }, 
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Response:', response.data);
      setMessage(`Successfully updated to: ${response.data.isMusician}`);
      
      if (onSuccess) {
        onSuccess(response.data.isMusician);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update musician status';
      setMessage(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 2 }}>
      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <FormLabel component="legend">Are you a musician?</FormLabel>
        <RadioGroup
          row
          value={isMusician}
          onChange={handleChange}
        >
          <FormControlLabel value="yes" control={<Radio />} label="Yes" />
          <FormControlLabel value="no" control={<Radio />} label="No" />
        </RadioGroup>
      </FormControl>

      <Button
        variant="contained"
        onClick={handleSave}
        disabled={loading}
        sx={{ mr: 2 }}
      >
        {loading ? 'Saving...' : 'Save Musician Status'}
      </Button>

      {message && (
        <Alert severity={message.includes('Successfully') ? 'success' : 'error'} sx={{ mt: 2 }}>
          {message}
        </Alert>
      )}

      <Box sx={{ mt: 2, fontSize: '0.875rem', color: '#666' }}>
        Current value: {isMusician}
      </Box>
    </Box>
  );
};

export default MusicianToggle;