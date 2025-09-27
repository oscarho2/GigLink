import React from 'react';
import { Container, Typography, Box, Paper, Grid } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import BusinessIcon from '@mui/icons-material/Business';

const About = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          About GigLink
        </Typography>
      </Box>

      <Paper elevation={1} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Our Mission
        </Typography>
        <Typography variant="body1" paragraph>
          GigLink is a platform designed to connect musicians and venues. Our mission is to streamline the process of booking and managing gigs, making it easier for artists to find opportunities and for venues to find the perfect talent for their events.
        </Typography>
        <Typography variant="body1" paragraph>
          Whether you're a solo artist, a band, or a venue owner, GigLink provides the tools you need to network, schedule, and collaborate.
        </Typography>
      </Paper>

      <Grid container spacing={4}>
        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Paper elevation={1} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <MusicNoteIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6" component="h3">For Artists</Typography>
            <Typography variant="body2">Discover new venues, showcase your talent, and get booked for gigs. Manage your schedule and connect with other musicians.</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Paper elevation={1} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <BusinessIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6" component="h3">For Venues</Typography>
            <Typography variant="body2">Find the perfect artists for your events. Browse profiles, listen to demos, and manage bookings all in one place.</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Paper elevation={1} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <InfoIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6" component="h3">Our Vision</Typography>
            <Typography variant="body2">We aim to build a vibrant community where music thrives. We are constantly evolving and adding new features to support the music industry.</Typography>
          </Paper>
        </Grid>
      </Grid>

    </Container>
  );
};

export default About;