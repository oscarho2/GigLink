import React from 'react';
import { Container, Typography, Box, Paper, Grid, Avatar, Chip, Button } from '@mui/material';

const Profile = () => {
  // Mock data for prototype
  const profile = {
    name: 'Jane Doe',
    avatar: '',
    bio: 'Professional guitarist with 10 years of experience in rock and jazz.',
    location: 'New York, NY',
    instruments: ['Guitar', 'Piano', 'Vocals'],
    genres: ['Rock', 'Jazz', 'Blues'],
    experience: '10 years',
    videos: [
      { title: 'Live at Jazz Club', url: 'https://youtube.com/watch?v=123' },
      { title: 'Studio Session', url: 'https://youtube.com/watch?v=456' }
    ]
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Avatar
              src={profile.avatar}
              alt={profile.name}
              sx={{ width: 150, height: 150, mb: 2 }}
            >
              {profile.name.charAt(0)}
            </Avatar>
            <Typography variant="h5" gutterBottom>{profile.name}</Typography>
            <Typography variant="body2" color="textSecondary">{profile.location}</Typography>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>Bio</Typography>
            <Typography paragraph>{profile.bio}</Typography>
            
            <Typography variant="h6" gutterBottom>Instruments</Typography>
            <Box sx={{ mb: 2 }}>
              {profile.instruments.map((instrument, index) => (
                <Chip key={index} label={instrument} sx={{ mr: 1, mb: 1 }} />
              ))}
            </Box>
            
            <Typography variant="h6" gutterBottom>Genres</Typography>
            <Box sx={{ mb: 2 }}>
              {profile.genres.map((genre, index) => (
                <Chip key={index} label={genre} sx={{ mr: 1, mb: 1 }} />
              ))}
            </Box>
            
            <Typography variant="h6" gutterBottom>Experience</Typography>
            <Typography paragraph>{profile.experience}</Typography>
          </Grid>
        </Grid>
      </Paper>
      
      <Typography variant="h5" gutterBottom>Videos</Typography>
      <Grid container spacing={3}>
        {profile.videos.map((video, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6">{video.title}</Typography>
              <Box sx={{ mt: 2, mb: 2, height: '200px', bgcolor: 'grey.300', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography>Video Preview</Typography>
              </Box>
              <Button variant="outlined" fullWidth href={video.url} target="_blank">
                Watch Video
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Profile;