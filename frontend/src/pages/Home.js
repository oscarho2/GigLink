import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import WorkIcon from '@mui/icons-material/Work';
import GroupIcon from '@mui/icons-material/Group';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';

const Home = () => {
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
            Connect with Musicians & Find Gigs
          </Typography>
          <Typography variant="h5" component="p" paragraph>
            GigLink is the professional network for musicians to showcase their talent,
            find performance opportunities, and connect with other professionals.
          </Typography>
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
    </Box>
  );
};

export default Home;