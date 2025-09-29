import React, { useState, useEffect } from 'react';
import { Container, Typography, Button, Box, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import MusicianToggle from '../components/MusicianToggle';

const TestMusicianAPI = () => {
  const { user, token } = useAuth();
  const [currentStatus, setCurrentStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      fetchCurrentStatus();
    }
  }, [token]);

  const fetchCurrentStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/profiles/musician-status', {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentStatus(data.isMusician);
        console.log('Current musician status from API:', data);
      } else {
        const errorData = await response.json();
        setMessage(`Error: ${errorData.message}`);
      }
    } catch (error) {
      setMessage(`Fetch error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDirectUpdate = async (newStatus) => {
    setLoading(true);
    setMessage('');
    
    try {
      console.log('Testing direct API call with status:', newStatus);
      
      const response = await fetch('/api/profiles/musician-status', {
        method: 'PUT',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isMusician: newStatus })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Direct API response:', data);
        setCurrentStatus(data.isMusician);
        setMessage(`Success: Updated to ${data.isMusician}`);
        
        // Fetch again to verify persistence
        setTimeout(fetchCurrentStatus, 1000);
      } else {
        const errorData = await response.json();
        console.error('Direct API error:', errorData);
        setMessage(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Direct API call error:', error);
      setMessage(`API call error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMusicianToggleSuccess = (newStatus) => {
    console.log('MusicianToggle success callback:', newStatus);
    setCurrentStatus(newStatus);
    setMessage(`MusicianToggle success: ${newStatus}`);
    
    // Fetch again to verify persistence
    setTimeout(fetchCurrentStatus, 1000);
  };

  const handleMusicianToggleError = (error) => {
    console.log('MusicianToggle error callback:', error);
    setMessage(`MusicianToggle error: ${error}`);
  };

  if (!user || !token) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">Please log in to test the musician API.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Musician API Test
      </Typography>
      
      <Typography variant="body1" gutterBottom>
        Current status: <strong>{currentStatus || 'Loading...'}</strong>
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Button 
          variant="outlined" 
          onClick={fetchCurrentStatus} 
          disabled={loading}
          sx={{ mr: 2 }}
        >
          Refresh Status
        </Button>
        <Button 
          variant="contained" 
          onClick={() => testDirectUpdate('yes')} 
          disabled={loading}
          sx={{ mr: 2 }}
        >
          Set to Yes (Direct API)
        </Button>
        <Button 
          variant="contained" 
          onClick={() => testDirectUpdate('no')} 
          disabled={loading}
        >
          Set to No (Direct API)
        </Button>
      </Box>

      <Typography variant="h6" gutterBottom>
        MusicianToggle Component Test:
      </Typography>
      
      <MusicianToggle
        initialValue={currentStatus}
        token={token}
        onSuccess={handleMusicianToggleSuccess}
        onError={handleMusicianToggleError}
      />
      
      {message && (
        <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ mt: 2 }}>
          {message}
        </Alert>
      )}
    </Container>
  );
};

export default TestMusicianAPI;