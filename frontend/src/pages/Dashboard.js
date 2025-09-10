import React, { useContext, useState, useEffect } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
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
import ListItemButton from '@mui/material/ListItemButton';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import WorkIcon from '@mui/icons-material/Work';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import LockIcon from '@mui/icons-material/Lock';
import LogoutIcon from '@mui/icons-material/Logout';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PaymentIcon from '@mui/icons-material/Payment';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AuthContext from '../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { user, isAuthenticated, loading: authLoading, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogStep, setDeleteDialogStep] = useState(0); // 0: closed, 1: first warning, 2: final confirmation
  const [isDeleting, setIsDeleting] = useState(false);
  const [gigToDelete, setGigToDelete] = useState(null);
  const [gigDeleteDialogOpen, setGigDeleteDialogOpen] = useState(false);

  
  // Change password state
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Links state
  const [links, setLinks] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [linksLoading, setLinksLoading] = useState(true);
  
  // Gig applications state
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);

  const handleDeleteAccount = () => {
    setDeleteDialogStep(1);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogStep(0);
    setIsDeleting(false);
  };

  const handleNextStep = () => {
    setDeleteDialogStep(deleteDialogStep + 1);
  };

  const handleFinalDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await axios.delete('/api/profiles/me', {
        headers: { 'x-auth-token': token }
      });
      
      alert('Account and all data deleted successfully. You will be redirected to the home page.');
      window.location.href = '/';
    } catch (err) {
      console.error('Error deleting account:', err);
      alert(`Failed to delete account: ${err.response?.data?.msg || err.message}`);
      setIsDeleting(false);
    }
  };

  // Change password handlers
  const handleChangePassword = () => {
    setChangePasswordOpen(true);
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleCloseChangePassword = () => {
    setChangePasswordOpen(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
    setPasswordSuccess('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    setPasswordError('');
  };

  const handleSubmitPasswordChange = async (e) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordError('');

    try {
      const response = await axios.put('/api/users/change-password', passwordData, {
        headers: { 'x-auth-token': token }
      });
      
      setPasswordSuccess('Password changed successfully!');
      setTimeout(() => {
        handleCloseChangePassword();
      }, 2000);
    } catch (err) {
      console.error('Error changing password:', err);
      const errorMsg = err.response?.data?.errors?.[0]?.msg || 'Failed to change password';
      setPasswordError(errorMsg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Links handlers
  const fetchLinksData = async () => {
    try {
      setLinksLoading(true);
      const [linksRes, pendingRes, sentRes] = await Promise.all([
        axios.get('/api/links/links', { headers: { 'x-auth-token': token } }),
        axios.get('/api/links/requests/pending', { headers: { 'x-auth-token': token } }),
        axios.get('/api/links/requests/sent', { headers: { 'x-auth-token': token } })
      ]);
      
      // Transform backend response to match frontend expectations
      const transformedLinks = (linksRes.data.links || []).map(item => ({
        _id: item.link.id,
        name: item.link.name,
        email: item.link.email,
        avatar: item.link.avatar,
        linkId: item.linkId
      }));
      
      const transformedPending = (pendingRes.data.requests || []).map(item => ({
        _id: item.linkId,
        requester: item.requester
      }));
      
      const transformedSent = (sentRes.data.requests || []).map(item => ({
        _id: item.linkId,
        recipient: item.recipient
      }));
      
      setLinks(transformedLinks);
      setPendingRequests(transformedPending);
      setSentRequests(transformedSent);
    } catch (err) {
      console.error('Error fetching links data:', err);
    } finally {
      setLinksLoading(false);
    }
  };

  const fetchApplicationsData = async () => {
    try {
      setApplicationsLoading(true);
      const res = await axios.get('/api/gigs/user/applications', {
        headers: { 'x-auth-token': token }
      });
      setApplications(res.data);
    } catch (err) {
      console.error('Error fetching applications data:', err);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleAcceptRequest = async (linkId) => {
    try {
      await axios.put(`/api/links/accept/${linkId}`, {}, {
        headers: { 'x-auth-token': token }
      });
      fetchLinksData(); // Refresh data
    } catch (err) {
      console.error('Error accepting request:', err);
    }
  };

  const handleDeclineRequest = async (linkId) => {
    try {
      await axios.put(`/api/links/decline/${linkId}`, {}, {
        headers: { 'x-auth-token': token }
      });
      fetchLinksData(); // Refresh data
    } catch (err) {
      console.error('Error declining request:', err);
    }
  };

  const handleRemoveLink = async (linkId) => {
    try {
      await axios.delete(`/api/links/${linkId}`, {
        headers: { 'x-auth-token': token }
      });
      fetchLinksData(); // Refresh data
    } catch (err) {
      console.error('Error removing link:', err);
    }
  };

  const handleGigDeleteClick = (gig) => {
    setGigToDelete(gig);
    setGigDeleteDialogOpen(true);
  };

  const handleCloseGigDeleteDialog = () => {
    setGigDeleteDialogOpen(false);
    setGigToDelete(null);
  };

  const handleConfirmGigDelete = async () => {
    try {
      await axios.delete(`/api/gigs/${gigToDelete._id}`, {
        headers: { 'x-auth-token': token }
      });
      
      // Remove the deleted gig from the local state
      setGigs(gigs.filter(gig => gig._id !== gigToDelete._id));
      handleCloseGigDeleteDialog();
    } catch (err) {
      console.error('Error deleting gig:', err);
      alert(`Failed to delete gig: ${err.response?.data?.msg || err.message}`);
    }
  };

  const handleEditGig = (gigId) => {
    navigate(`/gigs/${gigId}/edit`);
  };

  const handleAcceptApplicant = async (gigId, applicantId) => {
    try {
      const currentGig = gigs.find(g => g._id === gigId);
      const accepted = Array.isArray(currentGig?.applicants) && currentGig.applicants.find(a => a.status === 'accepted');
      const headers = { 'x-auth-token': token };

      const acceptedUserId = accepted ? ((typeof accepted.user === 'string') ? accepted.user : accepted.user?._id) : null;
      if (accepted && acceptedUserId && acceptedUserId.toString() === applicantId.toString()) {
        // Undo acceptance for the currently accepted applicant
        await axios.post(`/api/gigs/${gigId}/undo/${acceptedUserId}`, {}, { headers });
      } else {
        // Accept the specified applicant
        await axios.post(`/api/gigs/${gigId}/accept/${applicantId}`, {}, { headers });
      }

      // Refresh the gig from server to ensure we have up-to-date applicants and isFilled
      const res = await axios.get(`/api/gigs/${gigId}`, { headers });
      setGigs(gigs.map(g => g._id === gigId ? res.data : g));
    } catch (err) {
      console.error('Error accepting/undoing applicant:', err);
      alert(`Failed to process applicant: ${err.response?.data?.msg || err.message}`);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user || (!user.id && !user._id)) {
        console.log('Dashboard - No authenticated user (id/_id missing), skipping data fetch');
        setLoading(false);
        return;
      }
      
      try {
        // Fetch profile data
        const profileRes = await axios.get('/api/profiles/me', {
          headers: { 'x-auth-token': token }
        });
        setProfile(profileRes.data);
        
        // Fetch user's gigs
        const gigsRes = await axios.get('/api/gigs', {
          headers: { 'x-auth-token': token }
        });
        
        const currentUserId = (user.id || user._id)?.toString();
        const userGigs = gigsRes.data.filter(gig => {
          if (!gig.user || !currentUserId) return false;
          
          // Handle both populated user object and string ID
          const gigUserId = typeof gig.user === 'object' && gig.user !== null 
            ? (gig.user._id || gig.user.id || gig.user)
            : gig.user;
          
          return gigUserId?.toString() === currentUserId;
        });
        setGigs(userGigs);
        
        // Fetch links data
        await fetchLinksData();
        
        // Fetch user's gig applications
        await fetchApplicationsData();
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token]);

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
        {/* Left Column - Profile and Account Settings */}
        <Grid item xs={12} md={6} lg={4}>
          {/* Profile Summary */}
          <Card 
            sx={{ 
              mb: 2,
              height: '100%',
              maxHeight: '500px',
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6
              }
            }}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              {/* Profile Header */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <Avatar
                  src={profile?.user?.avatar || user?.avatar}
                  alt={profile?.user?.name || user?.name}
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: '2rem'
                  }}
                >
                  {(profile?.user?.name || user?.name)?.charAt(0)}
                </Avatar>
                <Typography variant="h6" component="h2" align="center" gutterBottom>
                  {profile?.user?.name || user?.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationOnIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />
                  <Typography variant="body2" color="text.secondary">
                    {profile?.user?.location || user?.location || 'Location not specified'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Bio */}
              <Typography 
                variant="body2" 
                color="text.secondary" 
                paragraph 
                sx={{ 
                  textAlign: 'center', 
                  mb: 2, 
                  whiteSpace: 'pre-wrap',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxHeight: '4.5em',
                  lineHeight: '1.5em'
                }}
              >
                {profile?.bio || user?.bio || 'Professional musician available for collaborations'}
              </Typography>

              {/* Skills - Two Column Layout */}
              {(((profile?.user?.instruments || user?.instruments) && (profile?.user?.instruments || user?.instruments).length > 0) || 
                ((profile?.user?.genres || user?.genres) && (profile?.user?.genres || user?.genres).length > 0)) && (
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {/* Left Half - Instruments */}
                  <Grid item xs={12} sm={6}>
                    {(profile?.user?.instruments || user?.instruments) && (profile?.user?.instruments || user?.instruments).length > 0 && (
                      <>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          <MusicNoteIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                          Instruments
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(profile?.user?.instruments || user?.instruments).slice(0, 3).map((instrument, index) => (
                            <Chip
                              key={`instrument-${index}`}
                              label={instrument}
                              size="small"
                              color="primary"
                              variant="filled"
                            />
                          ))}
                          {(profile?.user?.instruments || user?.instruments).length > 3 && (
                            <Chip
                              label={`+${(profile?.user?.instruments || user?.instruments).length - 3} more`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </>
                    )}
                  </Grid>

                  {/* Right Half - Genres */}
                  <Grid item xs={12} sm={6}>
                    {(profile?.user?.genres || user?.genres) && (profile?.user?.genres || user?.genres).length > 0 && (
                      <>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          <MusicNoteIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                          Genres
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(profile?.user?.genres || user?.genres).slice(0, 3).map((genre, index) => (
                            <Chip
                              key={`genre-${index}`}
                              label={genre}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          ))}
                          {(profile?.user?.genres || user?.genres).length > 3 && (
                            <Chip
                              label={`+${(profile?.user?.genres || user?.genres).length - 3} more`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </>
                    )}
                  </Grid>
                </Grid>
              )}

              {/* Experience */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WorkIcon sx={{ mr: 0.5, color: 'primary.main', fontSize: '1rem' }} />
                <Typography variant="caption" color="text.secondary">
                  {profile?.experience || user?.experience || 'Beginner'}
                </Typography>
              </Box>

            </CardContent>
            <CardActions sx={{ 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 2 },
              p: { xs: 2, sm: 2 }
            }}>
              <Button
                component={RouterLink}
                to={`/profile/${profile?.user?._id || user?.id || user?._id}`}
                variant="outlined"
                sx={{ 
                  minHeight: { xs: 48, sm: 40 },
                  flex: { xs: 1, sm: 1 },
                  fontWeight: 500
                }}
              >
                View Profile
              </Button>
              <Button
                component={RouterLink}
                to="/edit-profile"
                variant="contained"
                sx={{ 
                  minHeight: { xs: 48, sm: 40 },
                  flex: { xs: 1, sm: 1 },
                  fontWeight: 500
                }}
              >
                Edit Profile
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        {/* Right Column - Gigs */}
        <Grid item xs={12} md={6} lg={8}>
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
              
              {Array.isArray(gigs) && gigs.length ? (
                <List>
                  {gigs.map(gig => (
                    <ListItem
                      key={gig._id || gig.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        backgroundColor: gig.isFilled ? 'action.disabledBackground' : 'inherit',
                        opacity: gig.isFilled ? 0.7 : 1,
                        '&:hover': {
                          backgroundColor: gig.isFilled ? 'action.disabledBackground' : 'action.hover',
                          transform: gig.isFilled ? 'none' : 'translateY(-1px)',
                          boxShadow: gig.isFilled ? 'none' : 2
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      <Box 
                        component={RouterLink}
                        to={`/gigs/${gig._id}`}
                        sx={{ 
                          textDecoration: 'none', 
                          color: 'inherit',
                          flex: 1,
                          mr: 2,
                          minWidth: 0
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: gig.isFilled ? 'text.disabled' : 'inherit'
                              }}
                            >
                              {gig.isFilled ? 'Fixed: ' : ''}{gig.title}
                            </Typography>
                          }
                          secondary={
                            <>
                              <Typography 
                                component="span" 
                                variant="body2" 
                                color="text.primary"
                                sx={{
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {gig.venue} - {gig.location}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{
                                  mt: 0.5
                                }}
                              >
                                {new Date(gig.date).toLocaleDateString()} at {gig.time}
                              </Typography>
                            </>
                          }
                        />
                      </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        flexDirection: { xs: 'column', sm: 'row' },
                        minWidth: 'fit-content'
                      }}>
                        <Chip
                          label={gig.isFilled ? 'Filled' : 'Open'}
                          color={gig.isFilled ? 'default' : 'success'}
                          size="small"
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {(() => { const count = (gig.applicantCount ?? (Array.isArray(gig.applicants) ? gig.applicants.length : 0)); return count; })()}
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 1
                        }}>
                          {(() => {
                            const hasApplicants = (gig.applicantCount ?? (Array.isArray(gig.applicants) ? gig.applicants.length : 0)) > 0;
                            const accepted = Array.isArray(gig.applicants) && gig.applicants.find(a => a.status === 'accepted');
                            const showBtn = hasApplicants && (!gig.isFilled || !!accepted);
                            return showBtn;
                          })() && (
                            <Button
                              size="small"
                              variant="contained"
                              color={(Array.isArray(gig.applicants) && gig.applicants.some(a => a.status === 'accepted')) ? 'secondary' : 'primary'}
                              startIcon={<CheckCircleIcon />}
                              onClick={(e) => {
                                e.preventDefault();
                                const accepted = Array.isArray(gig.applicants) && gig.applicants.find(a => a.status === 'accepted');
                                const targetId = accepted
                                  ? (typeof accepted.user === 'string' ? accepted.user : accepted.user?._id)
                                  : (Array.isArray(gig.applicants) && gig.applicants[0]
                                      ? (typeof gig.applicants[0].user === 'string' ? gig.applicants[0].user : gig.applicants[0].user?._id)
                                      : null);
                                if (targetId) {
                                  handleAcceptApplicant(gig._id, targetId);
                                }
                              }}
                            >
                              {(Array.isArray(gig.applicants) && gig.applicants.some(a => a.status === 'accepted')) ? 'Undo' : 'Accept'}
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={(e) => {
                              e.preventDefault();
                              handleEditGig(gig._id);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={(e) => {
                              e.preventDefault();
                              handleGigDeleteClick(gig);
                            }}
                          >
                            Delete
                          </Button>
                        </Box>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  You haven't posted any gigs yet.
                </Typography>
              )}
            </CardContent>
          </Card>
          
          {/* Links Section */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography 
                  variant="h6"
                  component={RouterLink}
                  to="/links"
                  sx={{
                    textDecoration: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    '&:hover': {
                      color: 'primary.main',
                      textDecoration: 'underline'
                    }
                  }}
                >
                  <PeopleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Links
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              {linksLoading ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  Loading links...
                </Typography>
              ) : (
                <>
                  {/* Pending Link Requests */}
                  {pendingRequests.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonAddIcon fontSize="small" />
                        Pending Requests ({pendingRequests.length})
                      </Typography>
                      <List>
                        {pendingRequests.map(request => (
                          <ListItem
                            key={request._id}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              mb: 1,
                              p: 2
                            }}
                          >
                            <Avatar
                              src={request.requester?.avatar}
                              alt={request.requester?.name}
                              sx={{ mr: 2 }}
                            />
                            <ListItemText
                              primary={request.requester?.name}
                              secondary={request.requester?.email}
                            />
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton
                                onClick={() => handleAcceptRequest(request._id)}
                                color="success"
                                size="small"
                              >
                                <CheckCircleIcon />
                              </IconButton>
                              <IconButton
                                onClick={() => handleDeclineRequest(request._id)}
                                color="error"
                                size="small"
                              >
                                <CancelIcon />
                              </IconButton>
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                  
                  {/* Current Links */}
                  {links.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PeopleIcon fontSize="small" />
                        Links ({links.length})
                      </Typography>
                      <List>
                        {links.map(link => (
                          <ListItem
                            key={link._id}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              mb: 1,
                              p: 2
                            }}
                          >
                            <Avatar
                              src={link.avatar}
                              alt={link.name}
                              sx={{ mr: 2 }}
                            />
                            <ListItemText
                              primary={link.name}
                              secondary={link.email}
                            />
                            <IconButton
                              onClick={() => handleRemoveLink(link.linkId)}
                              color="error"
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                  
                  {/* Sent Requests */}
                  {sentRequests.length > 0 && (
                    <Box>
                      <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SearchIcon fontSize="small" />
                        Sent Requests ({sentRequests.length})
                      </Typography>
                      <List>
                        {sentRequests.map(request => (
                          <ListItem
                            key={request._id}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              mb: 1,
                              p: 2
                            }}
                          >
                            <Avatar
                              src={request.recipient?.avatar}
                              alt={request.recipient?.name}
                              sx={{ mr: 2 }}
                            />
                            <ListItemText
                              primary={request.recipient?.name}
                              secondary="Request pending..."
                            />
                            <IconButton
                              onClick={() => handleRemoveLink(request._id)}
                              color="error"
                              size="small"
                            >
                              <CancelIcon />
                            </IconButton>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                  
                  {/* No Links Message */}
                  {links.length === 0 && pendingRequests.length === 0 && sentRequests.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      No links yet. Start connecting with other musicians!
                    </Typography>
                  )}
                </>
              )}
            </CardContent>
          </Card>

        </Grid>
      </Grid>

      {/* Gig Applications Section */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <WorkIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              My Gig Applications
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {applicationsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <Typography>Loading applications...</Typography>
            </Box>
          ) : applications.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              No gig applications yet. Start applying to gigs to see them here!
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {applications.map((application) => {
                const getStatusColor = (status, acceptedByOther) => {
                  if (acceptedByOther && status !== 'accepted') return 'error';
                  switch (status) {
                    case 'accepted': return 'success';
                    case 'rejected': return 'error';
                    default: return 'warning';
                  }
                };
                
                const getStatusText = (status, acceptedByOther) => {
                  if (acceptedByOther && status !== 'accepted') return 'Position Filled';
                  switch (status) {
                    case 'accepted': return 'Accepted';
                    case 'rejected': return 'Rejected';
                    default: return 'Pending';
                  }
                };
                
                return (
                  <Grid item xs={12} md={6} key={application._id}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 4
                        }
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                            {application.title}
                          </Typography>
                          <Chip
                            label={getStatusText(application.applicationStatus, application.acceptedByOther)}
                            color={getStatusColor(application.applicationStatus, application.acceptedByOther)}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationOnIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />
                          <Typography variant="body2" color="text.secondary">
                            {application.venue} • {application.location}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <CalendarTodayIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />
                          <Typography variant="body2" color="text.secondary">
                            {application.date} {application.time && `• ${application.time}`}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <PaymentIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />
                          <Typography variant="body2" color="text.secondary">
                            {application.payment}
                          </Typography>
                        </Box>
                        
                        {application.instruments && application.instruments.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              Instruments:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {application.instruments.slice(0, 3).map((instrument, index) => (
                                <Chip
                                  key={index}
                                  label={instrument}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                />
                              ))}
                              {application.instruments.length > 3 && (
                                <Chip
                                  label={`+${application.instruments.length - 3} more`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </Box>
                        )}
                        
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Applied: {new Date(application.applicationDate).toLocaleDateString()}
                        </Typography>
                        
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Posted by: {application.poster?.name || 'Unknown'}
                        </Typography>
                      </CardContent>
                      
                      <CardActions>
                        <Button
                          component={RouterLink}
                          to={`/gigs/${application._id}`}
                          size="small"
                          variant="outlined"
                        >
                          View Gig
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Multi-step Delete Account Dialog */}
      {/* Step 1: Initial Warning */}
      <Dialog open={deleteDialogStep === 1} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Delete Account?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete your account? This action will:
          </Typography>
          <Box component="ul" sx={{ mt: 2, pl: 2 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Permanently delete your profile and personal information
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Remove all your posted gigs
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Delete all your messages and conversations
            </Typography>
            <Typography component="li" variant="body2">
              Remove you from any gig applications
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleNextStep} color="warning" variant="outlined">
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Step 2: Final Warning */}
      <Dialog open={deleteDialogStep === 2} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          Final Warning
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              This action is IRREVERSIBLE!
            </Typography>
          </Alert>
          <Typography variant="body1" gutterBottom>
            Once you delete your account:
          </Typography>
          <Box component="ul" sx={{ mt: 2, pl: 2 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>All your data will be permanently lost</strong>
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>You cannot recover your account or any information</strong>
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              <strong>Other users will no longer be able to contact you</strong>
            </Typography>
            <Typography component="li" variant="body2">
              <strong>You will need to create a new account to use GigLink again</strong>
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ mt: 2, fontWeight: 'bold' }}>
            Are you absolutely certain you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleFinalDelete} color="error" variant="contained" disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'DELETE MY ACCOUNT'}
          </Button>
        </DialogActions>
      </Dialog>



      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onClose={handleCloseChangePassword} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockIcon color="primary" />
          Change Password
        </DialogTitle>
        <form onSubmit={handleSubmitPasswordChange}>
          <DialogContent>
            {passwordError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {passwordError}
              </Alert>
            )}
            {passwordSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {passwordSuccess}
              </Alert>
            )}
            <TextField
              fullWidth
              margin="normal"
              name="currentPassword"
              label="Current Password"
              type={showCurrentPassword ? 'text' : 'password'}
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      edge="end"
                    >
                      {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              name="newPassword"
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
              helperText="Must contain at least 8 characters with uppercase, lowercase, number, and special character"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              name="confirmPassword"
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseChangePassword} color="primary">
              Cancel
            </Button>
            <Button 
              type="submit"
              color="primary" 
              variant="contained"
              disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
            >
              {isChangingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Gig Delete Confirmation Dialog */}
      <Dialog open={gigDeleteDialogOpen} onClose={handleCloseGigDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon color="error" />
          Delete Gig
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="bold">
              This action cannot be undone
            </Typography>
          </Alert>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete the gig "{gigToDelete?.title}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGigDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmGigDelete} 
            color="error" 
            variant="contained"
          >
            Delete Gig
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;