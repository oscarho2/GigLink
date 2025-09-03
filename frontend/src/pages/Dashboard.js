import React, { useContext, useState, useEffect } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import WorkIcon from '@mui/icons-material/Work';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import AuthContext from '../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { user, isAuthenticated, loading: authLoading, token } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user.id) {
        console.log('Dashboard - No authenticated user, skipping data fetch');
        setLoading(false);
        return;
      }
      
      try {
        // Fetch profile data
        const profileRes = await axios.get('http://localhost:5001/api/profiles/me', {
          headers: { 'x-auth-token': token }
        });
        setProfile(profileRes.data);
        
        // Fetch user's gigs
        const gigsRes = await axios.get('http://localhost:5001/api/gigs', {
          headers: { 'x-auth-token': token }
        });
        const userGigs = gigsRes.data.filter(gig => gig.user._id === user.id);
        setGigs(userGigs);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (authLoading || loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={4}>
        {/* Profile Summary */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                <Avatar
                  src={user?.avatar}
                  alt={user?.name}
                  sx={{ width: 100, height: 100, mb: 2 }}
                />
                <Typography variant="h5">{user?.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
                {user?.location && (
                  <Typography variant="body2" color="text.secondary">
                    {user?.location}
                  </Typography>
                )}
              </Box>
              
              {user?.instruments && user.instruments.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Instruments
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {user.instruments.map((instrument, index) => (
                      <Chip key={index} label={instrument} size="small" />
                    ))}
                  </Box>
                </Box>
              )}
              
              {user?.genres && user.genres.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Genres
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {user.genres.map((genre, index) => (
                      <Chip key={index} label={genre} size="small" />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
            <CardActions sx={{ flexDirection: 'column', gap: 1 }}>
              <Button
                component={RouterLink}
                to={`/profile/${user?.id}`}
                fullWidth
                variant="outlined"
              >
                View Profile
              </Button>
              <Button
                component={RouterLink}
                to="/edit-profile"
                fullWidth
                variant="contained"
              >
                Edit Profile
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        {/* Gigs */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <WorkIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  My Gigs
                </Typography>
                <Button
                  component={RouterLink}
                  to="/create-gig"
                  variant="contained"
                  startIcon={<AddIcon />}
                  size="small"
                >
                  Post Gig
                </Button>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              {gigs.length > 0 ? (
                <List>
                  {gigs.map(gig => (
                    <ListItem
                      key={gig._id}
                      component={RouterLink}
                      to={`/gigs/${gig._id}`}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        textDecoration: 'none',
                        color: 'inherit'
                      }}
                    >
                      <ListItemText
                        primary={gig.title}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {gig.venue} - {gig.location}
                            </Typography>
                            <br />
                            {new Date(gig.date).toLocaleDateString()} at {gig.time}
                          </>
                        }
                      />
                      <Chip
                        label={gig.isFilled ? 'Filled' : 'Open'}
                        color={gig.isFilled ? 'default' : 'success'}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  You haven't posted any gigs yet.
                </Typography>
              )}
            </CardContent>
          </Card>
          
          {/* Videos */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <VideoLibraryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  My Videos
                </Typography>
                <Button
                  component={RouterLink}
                  to="/edit-profile"
                  variant="contained"
                  startIcon={<AddIcon />}
                  size="small"
                >
                  Add Video
                </Button>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              {profile?.videos && profile.videos.length > 0 ? (
                <Grid container spacing={2}>
                  {profile.videos.map((video, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1">{video.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {video.description}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            <Button
                              href={video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                            >
                              Watch Video
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  You haven't added any videos yet.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;