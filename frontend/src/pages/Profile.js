import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Grid, Avatar, Chip, Button, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import ChatIcon from '@mui/icons-material/Chat';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Profile = () => {
  const { user, token } = useAuth();
  const { id } = useParams(); // Get user ID from URL params
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [linkStatus, setLinkStatus] = useState(null); // 'none', 'pending', 'links', 'received'
  const [linkId, setLinkId] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'requester' or 'recipient'
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, message: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let profileData;
        
        if (id) {
          // Fetch specific user's profile by ID (public route)
          const profileRes = await axios.get(`/api/profiles/user/${id}`);
          profileData = profileRes.data;
          // Consider both _id and id in user object
          setIsOwnProfile(!!user && (user._id === id || user.id === id));
        } else {
          // Fetch current user's profile (private route)
          if (!user || !(user._id || user.id)) {
            setLoading(false);
            return;
          }
          
          const profileRes = await axios.get('/api/profiles/me', {
            headers: { 'x-auth-token': token }
          });
          profileData = profileRes.data;
          setIsOwnProfile(true);
        }
        
        // Transform backend data to match UI expectations
        const transformedProfile = {
          name: profileData.user?.name || user?.name || 'User',
          avatar: profileData.user?.avatar || '',
          bio: profileData.bio || '',
          location: profileData.user?.location || '',
          instruments: profileData.user?.instruments || profileData.skills?.filter(skill => ['Piano', 'Guitar', 'Vocals', 'Drums', 'Bass', 'Violin', 'Saxophone'].includes(skill)) || ['Piano', 'Guitar'],
          genres: profileData.user?.genres || ['Rock', 'Jazz', 'Blues'],
    
          videos: profileData.videos || [
            { title: 'Live at Jazz Club', url: 'https://youtube.com/watch?v=123' },
            { title: 'Studio Session', url: 'https://youtube.com/watch?v=456' }
          ]
        };
        
        setProfile(transformedProfile);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, token, id]);

  // Check link status when viewing another user's profile
  useEffect(() => {
    const checkLinkStatus = async () => {
      if (!user || !id || isOwnProfile) return;
      
      try {
        const response = await axios.get(`/api/links/status/${id}`, {
          headers: { 'x-auth-token': token }
        });
        const { status, linkId: responseLink, role } = response.data;
        setLinkStatus(status);
        setLinkId(responseLink);
        setUserRole(role);
        
        // Map backend status to frontend status
        if (status === 'pending') {
          setLinkStatus(role === 'requester' ? 'pending' : 'received');
        } else if (status === 'accepted') {
          setLinkStatus('links');
        } else {
          setLinkStatus('none');
        }
      } catch (err) {
        console.error('Error checking link status:', err);
        setLinkStatus('none');
      }
    };

    checkLinkStatus();
  }, [user, token, id, isOwnProfile]);

  const handleSendLinkRequest = async () => {
    try {
      await axios.post('/api/links/request', 
        { recipientId: id },
        { headers: { 'x-auth-token': token } }
      );
      setLinkStatus('pending');
      setSnackbar({ open: true, message: 'Link request sent!', severity: 'success' });
    } catch (err) {
      console.error('Error sending link request:', err);
      setSnackbar({ open: true, message: 'Failed to send link request', severity: 'error' });
    }
  };

  const handleAcceptLinkRequest = async () => {
    try {
      if (!linkId) {
        setSnackbar({ open: true, message: 'Link ID not found', severity: 'error' });
        return;
      }
      await axios.put(`/api/links/accept/${linkId}`, {}, {
        headers: { 'x-auth-token': token }
      });
      setLinkStatus('links');
      setSnackbar({ open: true, message: 'Link request accepted!', severity: 'success' });
    } catch (err) {
      console.error('Error accepting link request:', err);
      setSnackbar({ open: true, message: 'Failed to accept link request', severity: 'error' });
    }
  };

  const handleDeclineLinkRequest = async () => {
    try {
      if (!linkId) {
        setSnackbar({ open: true, message: 'Link ID not found', severity: 'error' });
        return;
      }
      await axios.put(`/api/links/decline/${linkId}`, {}, {
        headers: { 'x-auth-token': token }
      });
      setLinkStatus('none');
      setLinkId(null);
      setSnackbar({ open: true, message: 'Link request declined', severity: 'info' });
    } catch (err) {
      console.error('Error declining link request:', err);
      setSnackbar({ open: true, message: 'Failed to decline link request', severity: 'error' });
    }
  };

  const handleRemoveLink = () => {
    setConfirmDialog({
      open: true,
      action: 'removeLink',
      message: `Are you sure you want to remove your link with ${profile?.name}?`
    });
  };

  const executeRemoveLink = async () => {
    try {
      if (!linkId) {
        setSnackbar({ open: true, message: 'Link ID not found', severity: 'error' });
        return;
      }
      await axios.delete(`/api/links/${linkId}`, {
        headers: { 'x-auth-token': token }
      });
      setLinkStatus('none');
      setLinkId(null);
      setSnackbar({ open: true, message: 'Link removed', severity: 'info' });
    } catch (err) {
      console.error('Error removing link:', err);
      setSnackbar({ open: true, message: 'Failed to remove link', severity: 'error' });
    }
  };

  const handleCancelRequest = () => {
    setConfirmDialog({
      open: true,
      action: 'cancelRequest',
      message: `Are you sure you want to cancel your link request to ${profile?.name}?`
    });
  };

  const executeCancelRequest = async () => {
    try {
      if (!linkId) {
        setSnackbar({ open: true, message: 'Link ID not found', severity: 'error' });
        return;
      }
      await axios.delete(`/api/links/${linkId}`, {
        headers: { 'x-auth-token': token }
      });
      setLinkStatus('none');
      setLinkId(null);
      setSnackbar({ open: true, message: 'Link request cancelled', severity: 'info' });
    } catch (err) {
      console.error('Error cancelling request:', err);
      setSnackbar({ open: true, message: 'Failed to cancel request', severity: 'error' });
    }
  };

  const handleStartConversation = () => {
    navigate('/messages', { state: { startConversationWith: id } });
  };

  const renderLinkButton = () => {
    if (!user || !id) return null;

    switch (linkStatus) {
      case 'links':
        return (
          <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Button
              variant="outlined"
              startIcon={<PersonRemoveIcon />}
              onClick={handleRemoveLink}
              size="small"
              sx={{
                minHeight: { xs: 40, sm: 32 },
                fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                px: { xs: 2, sm: 1.5 }
              }}
            >
               Linked
             </Button>
            <Button
              variant="outlined"
              startIcon={<ChatIcon />}
              onClick={handleStartConversation}
              size="small"
              sx={{
                minHeight: { xs: 40, sm: 32 },
                fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                px: { xs: 2, sm: 1.5 }
              }}
            >
              Message
            </Button>
          </Box>
        );
      case 'pending':
        return (
          <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Button
              variant="outlined"
              startIcon={<HourglassEmptyIcon />}
              onClick={handleCancelRequest}
              size="small"
              sx={{
                minHeight: { xs: 40, sm: 32 },
                fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                px: { xs: 2, sm: 1.5 }
              }}
            >
              Requested
            </Button>
            <Button
              variant="outlined"
              startIcon={<ChatIcon />}
              onClick={handleStartConversation}
              size="small"
              sx={{
                minHeight: { xs: 40, sm: 32 },
                fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                px: { xs: 2, sm: 1.5 }
              }}
            >
              Message
            </Button>
          </Box>
        );
      case 'received':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={handleAcceptLinkRequest}
                size="small"
                sx={{
                  minHeight: { xs: 40, sm: 32 },
                  fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                  px: { xs: 2, sm: 1.5 }
                }}
              >
                Accept
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeclineLinkRequest}
                size="small"
                sx={{
                  minHeight: { xs: 40, sm: 32 },
                  fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                  px: { xs: 2, sm: 1.5 }
                }}
              >
                Decline
              </Button>
            </Box>
            <Button
              variant="outlined"
              startIcon={<ChatIcon />}
              onClick={handleStartConversation}
              size="small"
              sx={{
                minHeight: { xs: 40, sm: 32 },
                fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                px: { xs: 2, sm: 1.5 }
              }}
            >
              Message
            </Button>
          </Box>
        );
      case 'none':
      default:
        return (
          <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={handleSendLinkRequest}
              size="small"
              sx={{
                minHeight: { xs: 40, sm: 32 },
                fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                px: { xs: 2, sm: 1.5 }
              }}
            >
               Add Link
            </Button>
            <Button
              variant="outlined"
              startIcon={<ChatIcon />}
              onClick={handleStartConversation}
              size="small"
              sx={{
                minHeight: { xs: 40, sm: 32 },
                fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                px: { xs: 2, sm: 1.5 }
              }}
            >
              Message
            </Button>
          </Box>
        );
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography>Profile not found</Typography>
      </Container>
    );
  }

  return (
    <Container 
      maxWidth="md" 
      sx={{ 
        py: { xs: 2, sm: 4 },
        px: { xs: 1, sm: 3 }
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: { xs: 1.5, sm: 2, md: 3 }, 
          mb: { xs: 3, sm: 4 },
          overflow: 'visible',
          pb: { xs: 1, sm: 1.25, md: 1.5 }
        }}
      >
        <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
          <Grid 
            item 
            xs={12} 
            md={4} 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              mb: { xs: 2, md: 0 },
              pb: 0
            }}
          >
            <Avatar
              src={profile.avatar}
              alt={profile.name}
              sx={{ 
                width: { xs: 120, sm: 150 }, 
                height: { xs: 120, sm: 150 }, 
                mb: { xs: 1.5, sm: 2 },
                fontSize: { xs: '2.5rem', sm: '3rem' }
              }}
            >
              {profile.name.charAt(0)}
            </Avatar>
            <Typography 
              variant="h5" 
              gutterBottom
              sx={{
                fontSize: { xs: '1.5rem', sm: '2.125rem' },
                textAlign: 'center'
              }}
            >
              {profile.name}
            </Typography>
            {profile.location && (
              <Typography 
                variant="body2" 
                color="textSecondary" 
                sx={{ 
                  mb: { xs: 1.5, sm: 2 },
                  fontSize: { xs: '0.875rem', sm: '0.875rem' },
                  textAlign: 'center'
                }}
              >
                {profile.location}
              </Typography>
            )}
            {isOwnProfile ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                <Button
                  component={RouterLink}
                  to="/edit-profile"
                  variant="contained"
                  startIcon={<EditIcon />}
                  size="small"
                  sx={{
                    minHeight: { xs: 40, sm: 32 },
                    fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                    px: { xs: 2, sm: 1.5 }
                  }}
                >
                  Edit Profile
                </Button>
                <Button
                  component={RouterLink}
                  to={`/user/${id || user._id || user.id}/links`}
                  variant="outlined"
                  startIcon={<PeopleIcon />}
                  size="small"
                  sx={{
                    minHeight: { xs: 40, sm: 32 },
                    fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                    px: { xs: 2, sm: 1.5 }
                  }}
                >
                  Links
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                {renderLinkButton()}
                <Button
                  component={RouterLink}
                  to={`/user/${id || user._id || user.id}/links`}
                  variant="outlined"
                  startIcon={<PeopleIcon />}
                  size="small"
                  sx={{
                    minHeight: { xs: 40, sm: 32 },
                    fontSize: { xs: '0.875rem', sm: '0.8125rem' },
                    px: { xs: 2, sm: 1.5 }
                  }}
                >
                  Links
                </Button>
              </Box>
            )}
          </Grid>
          
          <Grid item xs={12} md={8} sx={{ pb: 0 }}>
            {profile.bio && (
              <>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{
                    fontSize: { xs: '1.125rem', sm: '1.25rem' },
                    fontWeight: 600
                  }}
                >
                  Bio
                </Typography>
                <Typography 
                  paragraph 
                  sx={{ 
                    whiteSpace: 'pre-wrap',
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    lineHeight: { xs: 1.5, sm: 1.6 },
                    mb: { xs: 2, sm: 2 }
                  }}
                >
                  {profile.bio.length > 200 ? `${profile.bio.substring(0, 200)}...` : profile.bio}
                </Typography>
              </>
            )}
            
            <Typography 
              variant="h6" 
              sx={{
                fontSize: { xs: '1.125rem', sm: '1.25rem' },
                fontWeight: 600,
                mb: 1
              }}
            >
              Instruments
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.75, sm: 1 }, mb: 0 }}>
              {profile.instruments.map((instrument, index) => (
                <Chip 
                  key={index} 
                  label={instrument} 
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                    height: { xs: 28, sm: 32 }
                  }} 
                />
              ))}
            </Box>
            
            <Typography 
              variant="h6" 
              sx={{
                fontSize: { xs: '1.125rem', sm: '1.25rem' },
                fontWeight: 600,
                mb: 1
              }}
            >
              Genres
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.75, sm: 1 }, mb: 0 }}>
              {profile.genres.map((genre, index) => (
                <Chip 
                  key={index} 
                  label={genre} 
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                    height: { xs: 28, sm: 32 }
                  }} 
                />
              ))}
            </Box>

          </Grid>
        </Grid>
      </Paper>
      
      {profile.videos && profile.videos.length > 0 && (
        <>
          <Typography 
            variant="h5" 
            gutterBottom
            sx={{
              fontSize: { xs: '1.5rem', sm: '2.125rem' },
              fontWeight: 600,
              mb: { xs: 2, sm: 3 }
            }}
          >
            Videos
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {profile.videos.map((video, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: { xs: 1.5, sm: 2 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Typography 
                variant="h6"
                sx={{
                  fontSize: { xs: '1.125rem', sm: '1.25rem' },
                  fontWeight: 500,
                  mb: { xs: 1.5, sm: 2 }
                }}
              >
                {video.title}
              </Typography>
              <Box 
                sx={{ 
                  mt: { xs: 1, sm: 2 }, 
                  mb: { xs: 1.5, sm: 2 }, 
                  height: { xs: '150px', sm: '200px' }, 
                  bgcolor: 'grey.300', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderRadius: 1,
                  flex: 1
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    color: 'text.secondary'
                  }}
                >
                  Video Preview
                </Typography>
              </Box>
              <Button 
                variant="outlined" 
                fullWidth 
                href={video.url} 
                target="_blank"
                sx={{
                  minHeight: { xs: 40, sm: 36 },
                  fontSize: { xs: '0.875rem', sm: '0.875rem' },
                  mt: 'auto'
                }}
              >
                Watch Video
              </Button>
            </Paper>
          </Grid>
        ))}          </Grid>        </>      )}      
      {profile.photos && profile.photos.length > 0 && (
        <>
          <Typography 
            variant="h5" 
            gutterBottom
            sx={{
              fontSize: { xs: '1.5rem', sm: '2.125rem' },
              fontWeight: 600,
              mb: { xs: 2, sm: 3 },
              mt: 0
            }}
          >
            Photos
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {profile.photos.map((photo, index) => (
              <Grid item xs={12} sm={6} md={4} key={photo._id || index}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    overflow: 'hidden',
                    borderRadius: 2
                  }}
                >
                  <Box
                    component="img"
                    src={`http://localhost:5001${photo.url}`}
                    alt={photo.caption || 'Profile photo'}
                    sx={{
                      width: '100%',
                      height: { xs: 200, sm: 250 },
                      objectFit: 'cover'
                    }}
                  />
                  {photo.caption && (
                    <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          fontSize: { xs: '0.875rem', sm: '0.875rem' }
                        }}
                      >
                        {photo.caption}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, action: null, message: '' })}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">
          Confirm Action
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null, message: '' })} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (confirmDialog.action === 'removeLink') {
                executeRemoveLink();
              } else if (confirmDialog.action === 'cancelRequest') {
                executeCancelRequest();
              }
              setConfirmDialog({ open: false, action: null, message: '' });
            }} 
            color="primary" 
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Profile;