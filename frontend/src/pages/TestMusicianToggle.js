import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, Alert, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import MusicianToggle from '../components/MusicianToggle';
import axios from 'axios';

const TestMusicianToggle = () => {
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const [currentStatus, setCurrentStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCurrentStatus = async () => {
      if (!isAuthenticated || !token) return;

      try {
        const response = await axios.get('/api/profiles/musician-status', {
          headers: { 'x-auth-token': token }
        });
        setCurrentStatus(response.data.isMusician);
      } catch (err) {
        setError('Failed to fetch current status');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchCurrentStatus();
    }
  }, [isAuthenticated, token, authLoading]);

  const handleSuccess = (newStatus) => {
    setCurrentStatus(newStatus);
    setError('');
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
  };

  if (authLoading || loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">Please log in to test the musician toggle.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Test Musician Toggle
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        This is a standalone test of the musician toggle functionality.
        Current database status: <strong>{currentStatus}</strong>
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <MusicianToggle
          initialValue={currentStatus}
          token={token}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </Paper>

      <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="h6">Debug Info:</Typography>
        <Typography variant="body2">
          • Current Status: {currentStatus}<br/>
          • Has Token: {token ? 'Yes' : 'No'}<br/>
          • Is Authenticated: {isAuthenticated ? 'Yes' : 'No'}
        </Typography>
      </Box>
    </Container>
  );
};

export default TestMusicianToggle;