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
      const body = {
        recipientId: gig.user._id,
        content: applicationMessage,
        messageType: 'gig_application',
        gigApplication: {
          gigId: gig._id,
          gigTitle: gig.title,
          gigVenue: gig.venue,
          gigDate: new Date(gig.date),
          gigPayment: parseFloat(gig.payment),
          gigInstruments: gig.instruments || [],
          gigGenres: gig.genres || []
        }
      };
      await axios.post('/api/messages/send', body, config);
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
      <Container 
        maxWidth="md" 
        sx={{ 
          py: { xs: 2, sm: 4 },
          px: { xs: 1, sm: 3 }
        }}
      >
        <Alert 
          severity="error"
          sx={{
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          {error}
        </Alert>
      </Container>
    );
  }

  if (!gig) {
    return (
      <Container 
        maxWidth="md" 
        sx={{ 
          py: { xs: 2, sm: 4 },
          px: { xs: 1, sm: 3 }
        }}
      >
        <Alert 
          severity="info"
          sx={{
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          Gig not found.
        </Alert>
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
    <Container 
      maxWidth="md" 
      sx={{ 
        py: { xs: 2, sm: 4 },
        px: { xs: 1, sm: 3 }
      }}
    >
      <Paper 
        elevation={0} 
        sx={{
          borderRadius: { xs: 2, sm: 3 }, 
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }}
      >
        <Box 
          sx={{
            p: { xs: 2.5, sm: 3, md: 4 }, 
            background: 'linear-gradient(to right, #334155, #1e293b)',
            color: 'white'
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            fontWeight="bold" 
            gutterBottom
            sx={{
              fontSize: { xs: '1.75rem', sm: '2.125rem', md: '2.5rem' },
              lineHeight: { xs: 1.2, sm: 1.3 }
            }}
          >
            {gig.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: { xs: 1.5, sm: 2 } }}>
            <LocationOnIcon sx={{ mr: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
            <Typography 
              variant="h6"
              sx={{
                fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' }
              }}
            >
              {gig.venue}, {gig.location}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ p: { xs: 2.5, sm: 3, md: 4 } }}>
          <Grid container spacing={{ xs: 3, sm: 4 }}>
            <Grid item xs={12} md={8}>
              <Box sx={{ mb: { xs: 3, sm: 4 } }}>
                <Typography 
                  variant="h5" 
                  component="h2" 
                  fontWeight="bold" 
                  gutterBottom
                  sx={{
                    fontSize: { xs: '1.375rem', sm: '1.5rem' }
                  }}
                >
                  Description
                </Typography>
                <Typography 
                  variant="body1" 
                  paragraph 
                  sx={{ 
                    lineHeight: 1.7,
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}
                >
                  {gig.description}
                </Typography>
              </Box>
              
              <Box sx={{ mb: { xs: 3, sm: 4 } }}>
                <Typography 
                  variant="h5" 
                  component="h2" 
                  fontWeight="bold" 
                  gutterBottom
                  sx={{
                    fontSize: { xs: '1.375rem', sm: '1.5rem' }
                  }}
                >
                  Requirements
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 1 }}>
                  <AssignmentIcon 
                    color="primary" 
                    sx={{ 
                      mr: { xs: 1.5, sm: 2 }, 
                      mt: 0.5,
                      fontSize: { xs: '1.25rem', sm: '1.5rem' }
                    }} 
                  />
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      lineHeight: 1.7,
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    {gig.requirements}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ mb: { xs: 3, sm: 4 } }}>
                <Typography 
                  variant="h5" 
                  component="h2" 
                  fontWeight="bold" 
                  gutterBottom
                  sx={{
                    fontSize: { xs: '1.375rem', sm: '1.5rem' }
                  }}
                >
                  Posted By
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Avatar 
                    sx={{ 
                      mr: { xs: 1.5, sm: 2 },
                      width: { xs: 36, sm: 40 },
                      height: { xs: 36, sm: 40 },
                      fontSize: { xs: '1rem', sm: '1.125rem' }
                    }}
                  >
                    {gig.user.name.charAt(0)}
                  </Avatar>
                  <Typography 
                    variant="body1"
                    sx={{
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    <Link to={`/profile/${gig.user._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {gig.user.name}
                    </Link>
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: { xs: 2.5, sm: 3 }, 
                  borderRadius: { xs: 1.5, sm: 2 }, 
                  bgcolor: '#f5f5f5', 
                  mb: { xs: 2.5, sm: 3 } 
                }}
              >
                <Box sx={{ mb: { xs: 2.5, sm: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                    <CalendarTodayIcon 
                      color="primary" 
                      sx={{ 
                        mr: 1,
                        fontSize: { xs: '1.125rem', sm: '1.25rem' }
                      }} 
                    />
                    <Typography 
                      variant="body1" 
                      fontWeight="medium"
                      sx={{
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      Date
                    </Typography>
                  </Box>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      ml: { xs: 3.5, sm: 4 },
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    {new Date(gig.date).toLocaleDateString()}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: { xs: 2.5, sm: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                    <AccessTimeIcon 
                      color="primary" 
                      sx={{ 
                        mr: 1,
                        fontSize: { xs: '1.125rem', sm: '1.25rem' }
                      }} 
                    />
                    <Typography 
                      variant="body1" 
                      fontWeight="medium"
                      sx={{
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      Time
                    </Typography>
                  </Box>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      ml: { xs: 3.5, sm: 4 },
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    {gig.time}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: { xs: 2.5, sm: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                    <PaymentIcon 
                      color="primary" 
                      sx={{ 
                        mr: 1,
                        fontSize: { xs: '1.125rem', sm: '1.25rem' }
                      }} 
                    />
                    <Typography 
                      variant="body1" 
                      fontWeight="medium"
                      sx={{
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      Payment
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h6" 
                    fontWeight="bold" 
                    sx={{ 
                      ml: { xs: 3.5, sm: 4 },
                      fontSize: { xs: '1rem', sm: '1.125rem' }
                    }}
                  >
                    {formatPayment(gig.payment)}
                  </Typography>
                </Box>
              </Paper>
              
              <Paper 
                elevation={0} 
                sx={{ 
                  p: { xs: 2.5, sm: 3 }, 
                  borderRadius: { xs: 1.5, sm: 2 }, 
                  bgcolor: '#f5f5f5' 
                }}
              >
                <Box sx={{ mb: { xs: 2.5, sm: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                    <MusicNoteIcon 
                      color="primary" 
                      sx={{ 
                        mr: 1,
                        fontSize: { xs: '1.125rem', sm: '1.25rem' }
                      }} 
                    />
                    <Typography 
                      variant="body1" 
                      fontWeight="medium"
                      sx={{
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      Instruments
                    </Typography>
                  </Box>
                  <Box sx={{ ml: { xs: 3.5, sm: 4 } }}>
                    {gig.instruments.map((instrument, index) => (
                      <Chip 
                        key={index} 
                        label={instrument} 
                        sx={{
                          mr: { xs: 0.75, sm: 1 }, 
                          mb: { xs: 0.75, sm: 1 },
                          borderColor: '#64748b',
                          color: '#334155',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          height: { xs: 28, sm: 32 }
                        }} 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
                
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                    <MusicNoteIcon 
                      color="primary" 
                      sx={{ 
                        mr: 1,
                        fontSize: { xs: '1.125rem', sm: '1.25rem' }
                      }} 
                    />
                    <Typography 
                      variant="body1" 
                      fontWeight="medium"
                      sx={{
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      Genres
                    </Typography>
                  </Box>
                  <Box sx={{ ml: { xs: 3.5, sm: 4 } }}>
                    {gig.genres.map((genre, index) => (
                      <Chip 
                        key={index} 
                        label={genre} 
                        sx={{
                          mr: { xs: 0.75, sm: 1 }, 
                          mb: { xs: 0.75, sm: 1 },
                          borderColor: '#64748b',
                          color: '#475569',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          height: { xs: 28, sm: 32 }
                        }} 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
          
          <Box 
            sx={{ 
              mt: { xs: 3, sm: 4, md: 5 }, 
              display: 'flex', 
              justifyContent: 'center', 
              gap: { xs: 1.5, sm: 2 },
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center'
            }}
          >
            {!isPoster && (
              <Button 
                variant="contained" 
                size="large"
                onClick={handleApplyClick}
                sx={{
                  py: { xs: 1.25, sm: 1.5 }, 
                  px: { xs: 3, sm: 4, md: 5 }, 
                  borderRadius: 2,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  fontWeight: 'bold',
                  bgcolor: '#475569',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  width: { xs: '100%', sm: 'auto' },
                  minHeight: { xs: 48, sm: 'auto' },
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
                    py: { xs: 1.25, sm: 1.5 },
                    px: { xs: 3, sm: 4, md: 5 },
                    borderRadius: 2,
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                    fontWeight: 'bold',
                    bgcolor: '#cccccc',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    width: { xs: '100%', sm: 'auto' },
                    minHeight: { xs: 48, sm: 'auto' }
                  }}
                >
                  You Posted This Gig
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate(`/gigs/${id}/edit`)}
                  startIcon={<EditIcon sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }} />}
                  sx={{
                    py: { xs: 1.25, sm: 1.5 },
                    px: { xs: 3, sm: 4 },
                    borderRadius: 2,
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                    fontWeight: 'bold',
                    bgcolor: '#2563eb',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    width: { xs: '100%', sm: 'auto' },
                    minHeight: { xs: 48, sm: 'auto' },
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
                  startIcon={<DeleteIcon sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }} />}
                  sx={{
                    py: { xs: 1.25, sm: 1.5 },
                    px: { xs: 3, sm: 4 },
                    borderRadius: 2,
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                    fontWeight: 'bold',
                    bgcolor: '#dc2626',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    width: { xs: '100%', sm: 'auto' },
                    minHeight: { xs: 48, sm: 'auto' },
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