import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, Box, Chip, Button, Grid, Avatar, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, LocationOn as LocationOnIcon, CalendarToday as CalendarTodayIcon, AccessTime as AccessTimeIcon, Payment as PaymentIcon, MusicNote as MusicNoteIcon, Assignment as AssignmentIcon, Person as PersonIcon } from '@mui/icons-material';
import { formatLocationString } from '../utils/text';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatPayment } from '../utils/currency';
import UserAvatar from '../components/UserAvatar';
import EmailVerificationBanner from '../components/EmailVerificationBanner';
import axios from 'axios';

const GigDetail = () => {
  const { id } = useParams();
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  


  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openApplyDialog, setOpenApplyDialog] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applyStatus, setApplyStatus] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState('');
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null); // 'pending', 'accepted', 'rejected'

  const formatFullLocation = (venue, location) => {
    const locationString = typeof location === 'string'
      ? location
      : location?.name || [location?.city, location?.region, location?.country].filter(Boolean).join(', ');

    const formattedLocation = formatLocationString(locationString);

    if (!venue) return formattedLocation;
    if (!formattedLocation) return venue;
    
    // Avoid duplication if venue is already in the location string
    if (formattedLocation.toLowerCase().includes(venue.toLowerCase())) {
      return formattedLocation;
    }
    
    return `${venue}, ${formattedLocation}`;
  };

  useEffect(() => {
    const fetchGig = async () => {
      try {
        const res = await axios.get(`/api/gigs/${id}`, {
          headers: { 'x-auth-token': token },
        });
        setGig(res.data);
        
        // Check if user has applied using the yourApplicationStatus field
        if (res.data.yourApplicationStatus) {
          setHasApplied(true);
          // Show 'fixed' status if gig is fixed by another applicant
          if (res.data.acceptedByOther && res.data.yourApplicationStatus === 'pending') {
            setApplicationStatus('fixed');
          } else {
            setApplicationStatus(res.data.yourApplicationStatus);
          }
        } else {
          // Fallback: check applicants array if user is the gig owner
          // Check if user has already applied using yourApplicationStatus first
          if (res.data.yourApplicationStatus) {
            setHasApplied(true);
            setApplicationStatus(res.data.yourApplicationStatus);
          } else if (res.data.applicants && user?.id) {
            // Fallback to checking applicants array (for gig owners)
            const uid = (user?.id || user?._id)?.toString();
            const userApplication = res.data.applicants.find((applicant) => {
              const aUser = applicant?.user;
              if (!aUser) return false;
              if (typeof aUser === 'string') return aUser === uid;
              if (typeof aUser === 'object' && aUser._id) return aUser._id.toString() === uid;
              try { return aUser.toString() === uid; } catch { return false; }
            });
            
            if (userApplication) {
              setHasApplied(true);
              setApplicationStatus(userApplication.status || 'pending');
            }
          } else {
            setHasApplied(false);
            setApplicationStatus(null);
          }
        }
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

    if (token) {
      fetchGig();
    }
  }, [id, user, token]);

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
        message: applicationMessage
      };
      
      // Apply to the gig using the proper endpoint
      await axios.post(`/api/gigs/${id}/apply`, body, config);
      
      // Refresh gig data to get updated applicant count
      const res = await axios.get(`/api/gigs/${id}`);
      setGig(res.data);
      setHasApplied(true);
      setApplicationStatus('pending'); // New applications start as pending
      
      setApplyStatus('success');
    } catch (err) {
      console.error(err);
      if (err.response?.data?.msg === 'Already applied to this gig') {
        setApplyStatus('duplicate');
        setHasApplied(true);
        // Try to get the current application status
        const res = await axios.get(`/api/gigs/${id}`);
        const uid = (user?.id || user?._id)?.toString();
        if (uid && Array.isArray(res.data.applicants)) {
          const userApplication = res.data.applicants.find((applicant) => {
            const aUser = applicant?.user;
            if (!aUser) return false;
            if (typeof aUser === 'string') return aUser === uid;
            if (typeof aUser === 'object' && aUser._id) return aUser._id.toString() === uid;
            try { return aUser.toString() === uid; } catch { return false; }
          });
          if (userApplication) {
            setApplicationStatus(userApplication.status || 'pending');
          }
        }
      } else {
        setApplyStatus('error');
      }
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

  const handleAcceptApplicant = async (applicantId) => {
    try {
      const config = {
        headers: {
          'x-auth-token': token,
        },
      };
      
      // Determine if this applicant is already accepted based on applicants' status
      const applicantsArray = Array.isArray(gig.applicants) ? gig.applicants : [];
      const target = applicantsArray.find(a => {
        const aId = (typeof a.user === 'string') ? a.user : a.user?._id;
        return aId?.toString() === applicantId.toString();
      });
      const isAccepted = target?.status === 'accepted';
      
      if (isAccepted) {
        // Undo acceptance
        await axios.post(`/api/gigs/${id}/undo/${applicantId}`, {}, config);
      } else {
        // Accept applicant
        await axios.post(`/api/gigs/${id}/accept/${applicantId}`, {}, config);
      }
      
      const res = await axios.get(`/api/gigs/${id}`);
      setGig(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to process applicant action. Please try again.');
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
  const isAdmin = Boolean(user?.isAdmin);
  const canDeleteGig = isPoster || isAdmin;

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
            background: gig.isFilled ? 'linear-gradient(to right, #9ca3af, #6b7280)' : 'linear-gradient(to right, #2c5282, #1a365d)',
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
            {gig.isFilled ? 'FIXED: ' : ''}{gig.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: { xs: 1.5, sm: 2 } }}>
            <LocationOnIcon sx={{ mr: 1, mt: 0.25, fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
            <Typography 
              variant="h6"
              sx={{
                fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' }
              }}
            >
              {formatFullLocation(gig.venue, gig.location)}
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
              
              {gig.requirements && (typeof gig.requirements === 'string' ? gig.requirements.trim() !== '' : true) && (
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
              )}
              
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
                <Box 
                  component={Link} 
                  to={`/profile/${gig.user._id}`} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mt: 1,
                    textDecoration: 'none', 
                    color: 'inherit',
                    transition: 'opacity 0.2s',
                    '&:hover': {
                      opacity: 0.8
                    }
                  }}
                >
                  <UserAvatar 
                    user={gig.user}
                    size={{ xs: 36, sm: 40 }}
                    sx={{ 
                      mr: { xs: 1.5, sm: 2 },
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'scale(1.1)'
                      }
                    }}
                  />
                  <Typography 
                    variant="body1"
                    sx={{
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      transition: 'color 0.2s',
                      '&:hover': {
                        color: '#1a365d'
                      }
                    }}
                  >
                    {gig.user.name}
                  </Typography>
                </Box>
              </Box>

              {(() => {
                const currentUserId = (user?.id || user?._id)?.toString();
                const ownerId = (typeof gig.user === 'string') ? gig.user : gig.user?._id?.toString();
                const poster = !!(currentUserId && ownerId && currentUserId === ownerId);
                const applicantsArray = Array.isArray(gig.applicants) ? gig.applicants : [];
                return poster && applicantsArray.length > 0;
              })() && (
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
                    Applicants
                  </Typography>
                  {Array.isArray(gig.applicants) && gig.applicants.map((applicant) => {
                    const applicantUserId = (typeof applicant.user === 'string') ? applicant.user : applicant.user?._id;
                    const isAccepted = applicant?.status === 'accepted';
                    const status = applicant?.status || 'pending';
                    
                    const getStatusColor = (status) => {
                      switch (status) {
                        case 'accepted': return 'success';
                        case 'rejected': return 'error';
                        default: return 'warning';
                      }
                    };
                    
                    const getStatusText = (status) => {
                      switch (status) {
                        case 'accepted': return 'Accepted';
                        case 'rejected': return 'Rejected';
                        default: return 'Pending';
                      }
                    };
                    
                    return (
                      <Paper key={applicantUserId} sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box 
                          component={Link} 
                          to={`/profile/${applicantUserId}`} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            textDecoration: 'none', 
                            color: 'inherit',
                            flex: 1,
                            '&:hover': {
                              opacity: 0.8
                            }
                          }}
                        >
                          <UserAvatar 
                            user={typeof applicant.user === 'object' ? applicant.user : { name: 'Unknown', _id: applicantUserId }}
                            size={40}
                            mobileSize={32}
                            sx={{ 
                              mr: 2
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                              {typeof applicant.user === 'object' ? applicant.user.name : applicantUserId}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                           <Chip
                             label={getStatusText(status)}
                             color={getStatusColor(status)}
                             size="small"
                             sx={{ fontWeight: 'bold' }}
                           />
                           {(!gig.isFilled || isAccepted) && (
                             <Button
                            variant="contained"
                            color={isAccepted ? 'secondary' : 'primary'}
                            onClick={() => handleAcceptApplicant(applicantUserId)}
                            sx={{
                              transition: 'all 0.3s ease',
                              boxShadow: isAccepted ? 'none' : 3,
                              '&:hover': {
                                transform: isAccepted ? 'none' : 'translateY(-2px)',
                                boxShadow: isAccepted ? 'none' : 6,
                              },
                            }}
                          >
                            {isAccepted ? 'Undo' : 'Accept'}
                          </Button>
                            )}
                          </Box>
                        </Paper>
                    );
                  })}
                </Box>
              )}
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
                {((Array.isArray(gig.schedules) && gig.schedules.length > 0) || gig.date) && (
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
                   <Box 
                     sx={{ 
                       ml: { xs: 3.5, sm: 4 }
                     }}
                   >
                     {/* Show multiple schedules if provided, otherwise fallback to single date */}
                     {Array.isArray(gig.schedules) && gig.schedules.length > 0 ? (
                       gig.schedules.length === 1 ? (
                         // Single schedule: show date then time underneath
                         <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                           <Typography variant="body1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                             {(gig.schedules[0].date ? new Date(gig.schedules[0].date).toLocaleDateString() : 'Date TBD')}
                           </Typography>
                           {gig.schedules[0].startTime && (
                             <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, opacity: 0.8, mt: 0.5 }}>
                               {gig.schedules[0].startTime}{gig.schedules[0].endTime ? ` - ${gig.schedules[0].endTime}` : ''}
                             </Typography>
                           )}
                         </Box>
                       ) : (
                         // Multiple schedules: show each date with time
                         <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                           {gig.schedules.map((s, idx) => (
                             <Typography key={idx} variant="body1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                               {(s.date ? new Date(s.date).toLocaleDateString() : 'Date TBD')}
                               {s.startTime ? ` • ${s.startTime}` : ''}
                               {s.endTime ? ` - ${s.endTime}` : ''}
                             </Typography>
                           ))}
                         </Box>
                       )
                     ) : (
                       // Fallback to single date/time: show date then time underneath
                       <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                         <Typography 
                           variant="body1"
                           sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                         >
                           {new Date(gig.date).toLocaleDateString()}
                         </Typography>
                         {gig.time && (
                           <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, opacity: 0.8, mt: 0.5 }}>
                             {gig.time}
                           </Typography>
                         )}
                       </Box>
                     )}
                   </Box>
                   </Box>
                )}
                  
                  {/* Only render the single Time section if there are multiple schedules and no times in schedules */}
                  {Array.isArray(gig.schedules) && gig.schedules.length > 1 && !gig.schedules.some(s => s.startTime) && Boolean(gig.time) && (
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
                  )}
                  
                  {(gig.payment !== undefined && gig.payment !== null && gig.payment !== '') && (
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
                    {formatPayment(gig.payment, gig.currency || 'GBP')}
                  </Typography>
                </Box>
                  )}
                
                <Box sx={{ mb: { xs: 2.5, sm: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                    <PersonIcon 
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
                      Applicants
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
                    {(gig.applicantCount ?? (Array.isArray(gig.applicants) ? gig.applicants.length : 0))}
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
                {Array.isArray(gig.instruments) && gig.instruments.length > 0 && (
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
                )}
                
                {Array.isArray(gig.genres) && gig.genres.length > 0 && (
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
                )}
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
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
                {hasApplied && applicationStatus && (
                  <Chip
                    label={applicationStatus === 'fixed' ? 'Fixed' : `${applicationStatus.charAt(0).toUpperCase() + applicationStatus.slice(1)}`}
                    color={applicationStatus === 'accepted' ? 'success' : applicationStatus === 'rejected' ? 'error' : applicationStatus === 'fixed' ? 'default' : 'warning'}
                    sx={{
                      fontWeight: 'bold',
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      py: 1,
                      px: 2,
                      ...(applicationStatus === 'fixed' && {
                        bgcolor: '#9e9e9e',
                        color: 'white'
                      })
                    }}
                  />
                )}
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
                    bgcolor: gig.isFilled ? '#cccccc' : '#2c5282',
                    boxShadow: gig.isFilled ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                    width: { xs: '100%', sm: 'auto' },
                    minHeight: { xs: 48, sm: 'auto' },
                    '&:hover': {
                      bgcolor: gig.isFilled ? '#cccccc' : '#1a365d',
                      boxShadow: gig.isFilled ? 'none' : '0 6px 16px rgba(0, 0, 0, 0.2)',
                    },
                    '&.Mui-disabled': {
                      bgcolor: '#cccccc',
                      color: '#666666'
                    }
                  }}
                  disabled={isPoster || hasApplied || gig.isFilled}
                >
                   {gig.isFilled ? 'Gig Fixed' : hasApplied ? 'Already Applied' : 'Apply for this Gig'}
                </Button>
              </Box>
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
                    bgcolor: '#1a365d',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    width: { xs: '100%', sm: 'auto' },
                    minHeight: { xs: 48, sm: 'auto' },
                    '&:hover': {
                      bgcolor: '#2c5282',
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
                    bgcolor: '#e53e3e',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    width: { xs: '100%', sm: 'auto' },
                    minHeight: { xs: 48, sm: 'auto' },
                    '&:hover': {
                      bgcolor: '#c53030',
                      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
                    }
                  }}
                >
                  Delete Gig
                </Button>
              </>
            )}
            {!isPoster && canDeleteGig && (
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
                  bgcolor: '#e53e3e',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  width: { xs: '100%', sm: 'auto' },
                  minHeight: { xs: 48, sm: 'auto' },
                  '&:hover': {
                    bgcolor: '#c53030',
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
                  }
                }}
              >
                Delete Gig
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      <Dialog open={openApplyDialog} onClose={handleCloseApplyDialog}>
        <DialogTitle>
          {applyStatus === 'success' ? 'Application Sent!' : 
           applyStatus === 'duplicate' ? 'Already Applied' : 
           'Apply for Gig'}
        </DialogTitle>
        <DialogContent>
          {applyStatus === 'success' ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 2,
                  '& .MuiAlert-message': {
                    fontSize: '1.1rem',
                    fontWeight: 'medium'
                  }
                }}
              >
                🎉 Application Sent Successfully!
              </Alert>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                Your application has been submitted to the gig poster. The applicant count has been updated.
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                The gig poster will be able to review your application and contact you if selected.
              </Typography>
            </Box>
          ) : applyStatus === 'duplicate' ? (
            <Alert severity="warning">You have already applied to this gig. You cannot apply multiple times.</Alert>
          ) : applyStatus === 'error' ? (
            <Alert severity="error">Failed to send application. Please try again.</Alert>
          ) : (
            <>
              <DialogContentText>
                Apply for this gig by sending a message to the poster.
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
            <Button onClick={handleSendMessage} variant="contained" sx={{ bgcolor: '#2c5282', '&:hover': { bgcolor: '#2a4b78' } }}>
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
