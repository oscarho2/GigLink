import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import WorkIcon from '@mui/icons-material/Work';
import GroupIcon from '@mui/icons-material/Group';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import googleAuthService from '../utils/googleAuth';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Handle Google OAuth sign-in
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const result = await googleAuthService.signIn();
      
      if (result.success) {
        // Send Google user data to backend for authentication
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: result.user.idToken,
            email: result.user.email,
            name: result.user.name,
            imageUrl: result.user.imageUrl
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Store token and user data
          localStorage.setItem('token', data.token);
          login(data.user);
          
          // Navigate to dashboard or profile setup
          if (data.user.profileComplete) {
            navigate('/dashboard');
          } else {
            navigate('/profile-setup');
          }
        } else {
          throw new Error(data.message || 'Authentication failed');
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      setError(error.message || 'Failed to sign in with Google. Please try again.');
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle error snackbar close
  const handleCloseError = () => {
    setShowError(false);
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 8,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" gutterBottom>
            Welcome to GigLink - Connect with Musicians & Find Gigs
          </Typography>
          <Typography variant="h5" component="p" paragraph>
            GigLink is the professional network for musicians to showcase their talent,
            find performance opportunities, and connect with other professionals.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGoogleSignIn}
            disabled={isLoading}

            sx={{ 
              mt: 2,
              mb: 2,
              bgcolor: 'white',
              color: '#757575',
              border: '1px solid #dadce0',
              '&:hover': {
                bgcolor: isLoading ? 'white' : '#f8f9fa',
                boxShadow: isLoading ? 'none' : '0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15)'
              },
              '&:disabled': {
                bgcolor: 'white',
                color: '#757575',
                border: '1px solid #dadce0'
              },
              fontWeight: 500,
              textTransform: 'none',
              px: 3,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </Button>
          <Button
            component={RouterLink}
            to="/login"
            variant="outlined"
            size="large"
            sx={{ 
              mt: 2,
              mb: 2,
              bgcolor: 'white',
              color: '#757575',
              border: '1px solid #dadce0',
              '&:hover': {
                bgcolor: '#f8f9fa',
                boxShadow: '0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15)'
              },
              fontWeight: 500,
              textTransform: 'none',
              px: 3,
              width: '200px',
              display: 'block',
              mx: 'auto'
            }}
          >
            Sign in with Email
          </Button>
          <Box sx={{ mt: 4 }}>
            <Button
              component={RouterLink}
              to="/register"
              variant="contained"
              size="large"
              sx={{ 
                mx: 1, 
                bgcolor: '#e53e3e',
                '&:hover': {
                  bgcolor: '#c53030'
                },
                fontWeight: 'bold'
              }}
            >
              Join Now
            </Button>
            <Button
              component={RouterLink}
              to="/gigs"
              variant="outlined"
              color="inherit"
              size="large"
              sx={{ mx: 1 }}
            >
              Browse Gigs
            </Button>
            <Button
              component={RouterLink}
              to="/discover"
              variant="outlined"
              color="inherit"
              size="large"
              sx={{ mx: 1 }}
            >
              Discover Musicians
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" align="center" gutterBottom>
          Features for Musicians
        </Typography>
        <Grid container spacing={4} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <MusicNoteIcon sx={{ fontSize: 60, color: '#1a365d' }} />
              </Box>
              <CardContent>
                <Typography variant="h5" component="h3" align="center" gutterBottom>
                  Professional Profile
                </Typography>
                <Typography>
                  Create a detailed profile showcasing your musical experience, skills, and portfolio.
                  Upload videos of your performances to demonstrate your talent.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <WorkIcon sx={{ fontSize: 60, color: '#1a365d' }} />
              </Box>
              <CardContent>
                <Typography variant="h5" component="h3" align="center" gutterBottom>
                  Gig Opportunities
                </Typography>
                <Typography>
                  Browse and apply for gig opportunities posted by venues, event organizers, and other musicians.
                  Post your own gigs when you need to find substitute musicians.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <GroupIcon sx={{ fontSize: 60, color: '#1a365d' }} />
              </Box>
              <CardContent>
                <Typography variant="h5" component="h3" align="center" gutterBottom>
                  Musician Network
                </Typography>
                <Typography>
                  Connect with other musicians in your area or with similar interests.
                  Build your professional network and find collaboration opportunities.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Call to Action */}
      <Box sx={{ bgcolor: 'grey.100', py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to advance your music career?
          </Typography>
          <Typography variant="h6" component="p" paragraph>
            Join GigLink today and connect with the professional music community.
          </Typography>
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            size="large"
            sx={{ 
              bgcolor: '#e53e3e',
              '&:hover': {
                bgcolor: '#c53030'
              },
              fontWeight: 'bold'
            }}
          >
            Sign Up Now
          </Button>
        </Container>
      </Box>

      {/* Error Feedback Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseError}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Home;