import { Container, Typography, Paper, Box, Chip, Button, Grid, Avatar, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useParams, Link, useNavigate } from 'react-router-dom';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentIcon from '@mui/icons-material/Payment';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AssignmentIcon from '@mui/icons-material/Assignment';

import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { formatPayment } from '../utils/currency';

const GigDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated, token } = useAuth();
  const navigate = useNavigate();

  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openApplyDialog, setOpenApplyDialog] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applyStatus, setApplyStatus] = useState('');
  const [messageSent, setMessageSent] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState('');

  useEffect(() => {
    const fetchGig = async () => {
      try {
        const res = await axios.get(`/api/gigs/${id}`);
        setGig(res.data);
      } catch (err) {
        console.error(err);
        if (err.response) {
          setError(`Error: ${err.response.status} - ${err.response.data.message || 'Failed to fetch gig details'}`);
        } else if (err.request) {
          setError('Network error - Could not connect to server');
        } else {
          setError('Failed to fetch gig details');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGig();
  }, [id]);

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/gig/' + id);
    } else {
      setApplicationMessage("Hi, I'm available for this gig and would love to be considered. Please let me know if you'd like to discuss further.");
      setOpenApplyDialog(true);
    }
  };

  const handleCloseApplyDialog = () => {
    setOpenApplyDialog(false);
    setApplicationMessage('');
    setApplyStatus('');
  };

  const handleSendMessage = async () => {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        }
      };
      const body = { recipient: gig.user._id, content: applicationMessage };
      await axios.post('/api/messages', body, config);
      setApplyStatus('success');
      setMessageSent(true);
    } catch (err) {
      console.error(err);
      setApplyStatus('error');
    }
  };

  const handleDeleteClick = () => {
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setDeleteStatus('');
  };

  const handleConfirmDelete = async () => {
    try {
      const config = {
        headers: {
          'x-auth-token': token
        }
      };
      await axios.delete(`/api/gigs/${id}`, config);
      setDeleteStatus('success');
      setTimeout(() => {
        navigate('/gigs');
      }, 1500);
    } catch (err) {
      console.error(err);
      setDeleteStatus('error');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography>Loading gig details...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!gig) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">Gig not found.</Alert>
      </Container>
    );
  }

  // Check ownership - handle both populated and unpopulated user field
   const currentUserId = (user?.id || user?._id) ? (user.id || user._id).toString() : null;
   let gigOwnerId = null;
   
   if (typeof gig.user === 'string') {
     // User field is just an ID string
     gigOwnerId = gig.user;
   } else if (gig.user && typeof gig.user === 'object') {
     // User field is populated object with _id
     gigOwnerId = gig.user._id;
   }
   
   const isPoster = !!(currentUserId && gigOwnerId && currentUserId === gigOwnerId.toString());
   
   // Ownership check complete

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper 
        elevation={0} 
        sx={{
          borderRadius: 3, 
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }}
      >
        <Box 
          sx={{
            p: 4, 
            background: 'linear-gradient(to right, #334155, #1e293b)',
            color: 'white'
          }}
        >
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            {gig.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <LocationOnIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              {gig.venue}, {gig.location}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ p: 4 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" component="h2" fontWeight="bold" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1" paragraph sx={{ lineHeight: 1.7 }}>
                  {gig.description}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" component="h2" fontWeight="bold" gutterBottom>
                  Requirements
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 1 }}>
                  <AssignmentIcon color="primary" sx={{ mr: 2, mt: 0.5 }} />
                  <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                    {gig.requirements}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" component="h2" fontWeight="bold" gutterBottom>
                  Posted By
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Avatar sx={{ mr: 2 }}>{gig.user.name.charAt(0)}</Avatar>
                  <Typography variant="body1">
                    <Link to={`/profile/${gig.user._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {gig.user.name}
                    </Link>
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2, bgcolor: '#f5f5f5', mb: 3 }}>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CalendarTodayIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body1" fontWeight="medium">
                      Date
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ ml: 4 }}>
                    {new Date(gig.date).toLocaleDateString()}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AccessTimeIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body1" fontWeight="medium">
                      Time
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ ml: 4 }}>
                    {gig.time}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PaymentIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body1" fontWeight="medium">
                      Payment
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight="bold" sx={{ ml: 4 }}>
                    {formatPayment(gig.payment)}
                  </Typography>
                </Box>
              </Paper>
              
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2, bgcolor: '#f5f5f5' }}>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <MusicNoteIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body1" fontWeight="medium">
                      Instruments
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 4 }}>
                    {gig.instruments.map((instrument, index) => (
                      <Chip 
                        key={index} 
                        label={instrument} 
                        sx={{
                          mr: 1, 
                          mb: 1,
                          borderColor: '#64748b',
                          color: '#334155'
                        }} 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
                
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <MusicNoteIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body1" fontWeight="medium">
                      Genres
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 4 }}>
                    {gig.genres.map((genre, index) => (
                      <Chip 
                        key={index} 
                        label={genre} 
                        sx={{
                          mr: 1, 
                          mb: 1,
                          borderColor: '#64748b',
                          color: '#475569'
                        }} 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 5, display: 'flex', justifyContent: 'center', gap: 2 }}>
            {!isPoster && (
              <Button 
                variant="contained" 
                size="large"
                onClick={handleApplyClick}
                sx={{
                  py: 1.5, 
                  px: 5, 
                  borderRadius: 2,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  bgcolor: '#475569',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  '&:hover': {
                    bgcolor: '#334155',
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
                  }
                }}
                disabled={isPoster || messageSent}
              >
                {messageSent ? 'Application Sent!' : 'Apply for this Gig'}
              </Button>
            )}
            {isPoster && (
              <>
                <Button
                  variant="contained"
                  size="large"
                  disabled
                  sx={{
                    py: 1.5,
                    px: 5,
                    borderRadius: 2,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    bgcolor: '#cccccc',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  You Posted This Gig
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate(`/gigs/${id}/edit`)}
                  startIcon={<EditIcon />}
                  sx={{
                    py: 1.5,
                    px: 4,
                    borderRadius: 2,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    bgcolor: '#2563eb',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    '&:hover': {
                      bgcolor: '#1d4ed8',
                      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
                    }
                  }}
                >
                  Edit Gig
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleDeleteClick}
                  startIcon={<DeleteIcon />}
                  sx={{
                    py: 1.5,
                    px: 4,
                    borderRadius: 2,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    bgcolor: '#dc2626',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    '&:hover': {
                      bgcolor: '#b91c1c',
                      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
                    }
                  }}
                >
                  Delete Gig
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Paper>

      <Dialog open={openApplyDialog} onClose={handleCloseApplyDialog}>
        <DialogTitle>Apply for Gig</DialogTitle>
        <DialogContent>
          {applyStatus === 'success' ? (
            <Alert severity="success">Your application message has been sent!</Alert>
          ) : applyStatus === 'error' ? (
            <Alert severity="error">Failed to send application message. Please try again.</Alert>
          ) : (
            <>
              <DialogContentText>
                Send a message to the gig poster to apply for this gig.
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                id="message"
                label="Your Message"
                type="text"
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseApplyDialog}>Close</Button>
          {applyStatus === '' && (
            <Button onClick={handleSendMessage} variant="contained" color="primary">
              Send Application
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Gig</DialogTitle>
        <DialogContent>
          {deleteStatus === 'success' ? (
            <Alert severity="success">Gig deleted successfully! Redirecting...</Alert>
          ) : deleteStatus === 'error' ? (
            <Alert severity="error">Failed to delete gig. Please try again.</Alert>
          ) : (
            <DialogContentText>
              Are you sure you want to delete this gig? This action cannot be undone.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          {deleteStatus === '' && (
            <Button onClick={handleConfirmDelete} variant="contained" color="error">
              Delete
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GigDetail;