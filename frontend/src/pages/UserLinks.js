import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';

const UserLinks = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserAndLinks();
  }, [userId]);

  const fetchUserAndLinks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch user profile
      const userResponse = await fetch(`http://localhost:5001/api/users/${userId}`);
      
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }
      
      const userData = await userResponse.json();
      setUser(userData);
 
      // Fetch user's links
      const linksResponse = await fetch(`http://localhost:5001/api/links/user/${userId}`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!linksResponse.ok) {
        throw new Error('Failed to fetch user links');
      }
      
      const linksData = await linksResponse.json();
      setLinks(linksData);
    } catch (error) {
      console.error('Error fetching user links:', error);
      setError(error.message);
      toast.error('Failed to load user links');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (clickedUserId) => {
    navigate(`/profile/${clickedUserId}`);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        {/* Header with back button */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBackClick}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            {user?.name}'s Links
          </Typography>
        </Box>



        <Divider sx={{ mb: 3 }} />

        {/* Links list */}
        <Typography variant="h6" sx={{ mb: 2 }}>
          Connections ({links.length})
        </Typography>

        {links.length === 0 ? (
          <Alert severity="info">
            {user?.name} doesn't have any connections yet.
          </Alert>
        ) : (
          <List>
            {links.map((link) => {
              // Determine which user to display (not the current user being viewed)
              const displayUser = link.requester._id === userId ? link.recipient : link.requester;
              
              return (
                <ListItem
                  key={link._id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'grey.200',
                    borderRadius: 1,
                    mb: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'grey.50'
                    }
                  }}
                  onClick={() => handleUserClick(displayUser._id)}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={displayUser.profilePicture}
                      alt={displayUser.name}
                    >
                      {displayUser.name?.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" fontWeight="medium">
                        {displayUser.name}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        {displayUser.bio && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {displayUser.bio.length > 100
                              ? `${displayUser.bio.substring(0, 100)}...`
                              : displayUser.bio
                            }
                          </Typography>
                        )}
                        {displayUser.instruments && displayUser.instruments.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {displayUser.instruments.slice(0, 3).map((instrument, index) => (
                              <Chip
                                key={index}
                                label={instrument}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                            {displayUser.instruments.length > 3 && (
                              <Chip
                                label={`+${displayUser.instruments.length - 3} more`}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default UserLinks;