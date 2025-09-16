import React, { useContext, useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, Navigate } from 'react-router-dom';
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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
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
import ApplicantSelectionModal from '../components/ApplicantSelectionModal';
import axios from 'axios';
import UserAvatar from '../components/UserAvatar';

// TabPanel component for links section
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-links-tabpanel-${index}`}
      aria-labelledby={`dashboard-links-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

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
  const [linksTabValue, setLinksTabValue] = useState(0);

  const handleLinksTabChange = (event, newValue) => {
    setLinksTabValue(newValue);
  };
  const [sentRequests, setSentRequests] = useState([]);
  const [linksLoading, setLinksLoading] = useState(true);
  
  // Applicant selection modal state
  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [selectedGig, setSelectedGig] = useState(null);
  
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

  const handleOpenApplicantModal = (gig) => {
    setSelectedGig(gig);
    setShowApplicantModal(true);
  };

  const handleSelectApplicant = async (applicant) => {
    if (!selectedGig) return;
    
    const applicantId = typeof applicant.user === 'string' ? applicant.user : applicant.user?._id;
    await handleAcceptApplicant(selectedGig._id, applicantId);
    setShowApplicantModal(false);
    setSelectedGig(null);
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
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6
              }
            }}
          >
            <CardContent sx={{ p: 2, pb: 1.5 }}>
              {/* Profile Header */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                <UserAvatar
                  user={profile?.user || user}
                  size={80}
                  sx={{ mb: 2 }}
                />
                <Typography variant="h6" component="h2" align="center" gutterBottom>
                  {profile?.user?.name || user?.name}
                </Typography>
                {(profile?.user?.location || user?.location) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOnIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />
                    <Typography variant="body2" color="text.secondary">
                      {profile?.user?.location || user?.location}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              {/* Bio */}
              {(profile?.bio || user?.bio) && (profile?.bio !== 'No bio available') && (user?.bio !== 'No bio available') && (
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  paragraph 
                  sx={{ 
                    textAlign: 'center', 
                    mb: 1.5, 
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
                  {profile?.bio || user?.bio}
                </Typography>
              )}

              {/* Skills - Two Column Layout */}
              {(((profile?.user?.instruments || user?.instruments) && (profile?.user?.instruments || user?.instruments).length > 0) || 
                ((profile?.user?.genres || user?.genres) && (profile?.user?.genres || user?.genres).length > 0)) && (
                <Grid container spacing={2}>
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
            </CardContent>
            <CardActions sx={{ 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 2 },
              px: { xs: 2, sm: 2 },
              pt: { xs: 1, sm: 1.25 },
              pb: { xs: 2, sm: 2 }
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

          {/* Navigation Buttons */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Quick Navigation
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  component={RouterLink}
                  to="/links"
                  variant="outlined"
                  startIcon={<PeopleIcon />}
                  sx={{ 
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  Links
                </Button>
                <Button
                  component={RouterLink}
                  to="/my-gigs?tab=gigs"
                  variant="outlined"
                  startIcon={<WorkIcon />}
                  sx={{ 
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  My Gigs
                </Button>
                <Button
                  component={RouterLink}
                  to="/my-posts"
                  variant="outlined"
                  startIcon={<PersonIcon />}
                  sx={{ 
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  My Posts
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Right Column - Links */}
        <Grid item xs={12} md={6} lg={8}>
          <Grid container spacing={2}>
          <Card sx={{ mb: 4 }}>
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
                <Box sx={{ maxHeight: 400, overflow: 'auto', pr: 1 }}>
                  <Paper sx={{ width: '100%', mb: 2 }}>
                    <Tabs
                      value={linksTabValue}
                      onChange={handleLinksTabChange}
                      indicatorColor="primary"
                      textColor="primary"
                      variant="fullWidth"
                    >
                      <Tab label={`Links (${links.length})`} />
                      <Tab label={`Requests (${pendingRequests.length})`} />
                      <Tab label={`Sent (${sentRequests.length})`} />
                    </Tabs>
                  </Paper>

                  {/* Links Tab */}
                  <TabPanel value={linksTabValue} index={0}>
                    {links.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                        No links yet. Start connecting with other musicians!
                      </Typography>
                    ) : (
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
                            <UserAvatar
                              user={link}
                              size={40}
                              sx={{ 
                                mr: 2,
                                cursor: 'pointer'
                              }}
                              onClick={() => navigate(`/profile/${link._id}`)}
                            />
                            <ListItemText
                              primary={
                                <Typography
                                  component="span"
                                  sx={{
                                    cursor: 'pointer',
                                    color: 'primary.main',
                                  }}
                                  onClick={() => navigate(`/profile/${link._id}`)}
                                >
                                  {link.name}
                                </Typography>
                              }
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
                    )}
                  </TabPanel>

                  {/* Pending Requests Tab */}
                  <TabPanel value={linksTabValue} index={1}>
                    {pendingRequests.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                        No pending requests.
                      </Typography>
                    ) : (
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
                            <UserAvatar
                              user={request.requester}
                              size={40}
                              sx={{ mr: 2 }}
                            />
                            <ListItemText
                              primary={
                                <Typography
                                  component="span"
                                  sx={{
                                    cursor: 'pointer',
                                    color: 'primary.main',
                                  }}
                                  onClick={() => navigate(`/profile/${request.requester?._id || request.requester?.id}`)}
                                >
                                  {request.requester?.name}
                                </Typography>
                              }
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
                    )}
                  </TabPanel>

                  {/* Sent Requests Tab */}
                  <TabPanel value={linksTabValue} index={2}>
                    {sentRequests.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                        No sent requests.
                      </Typography>
                    ) : (
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
                            <UserAvatar
                              user={request.recipient}
                              size={40}
                              sx={{ mr: 2 }}
                            />
                            <ListItemText
                              primary={
                                <Typography
                                  component="span"
                                  sx={{
                                    cursor: 'pointer',
                                    color: 'primary.main',
                                    '&:hover': {
                                      color: 'primary.dark'
                                    }
                                  }}
                                  onClick={() => navigate(`/profile/${request.recipient?._id || request.recipient?.id}`)}
                                >
                                  {request.recipient?.name}
                                </Typography>
                              }
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
                    )}
                  </TabPanel>
                </Box>
              )}
            </CardContent>
          </Card>
          
          {/* My Gigs Section */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography 
                  variant="h6" 
                  component={RouterLink} 
                  to="/my-gigs?tab=gigs"
                  sx={{ 
                    textDecoration: 'none', 
                    color: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    '&:hover': {
                      color: 'primary.main',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }
                  }}
                >
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
                <Box sx={{ maxHeight: 400, overflow: 'auto', pr: 1 }}>
                  <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                    {/* Mobile Card Layout */}
                    {gigs.map(gig => (
                      <Card
                        key={gig._id || gig.id}
                        sx={{
                          mb: 2,
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
                        <CardContent sx={{ pb: 1 }}>
                          <Box
                            component={RouterLink}
                            to={`/gigs/${gig._id}`}
                            sx={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 600,
                                lineHeight: 1.3,
                                mb: 1,
                                color: gig.isFilled ? 'text.disabled' : 'inherit'
                              }}
                            >
                              {gig.isFilled ? 'FILLED: ' : ''}{gig.title}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <LocationOnIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.primary">
                                {gig.venue} - {gig.location}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <CalendarTodayIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {new Date(gig.date).toLocaleDateString()} at {gig.time}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Chip
                              label={gig.isFilled ? 'Filled' : 'Open'}
                              color={gig.isFilled ? 'default' : 'success'}
                              size="small"
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PersonIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {(() => { const count = (gig.applicantCount ?? (Array.isArray(gig.applicants) ? gig.applicants.length : 0)); return count; })()} applicants
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                        <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
                          <Box sx={{ display: 'flex', gap: 1, width: '100%', flexWrap: 'wrap' }}>
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
                                  if (accepted) {
                                    const targetId = typeof accepted.user === 'string' ? accepted.user : accepted.user?._id;
                                    if (targetId) {
                                      handleAcceptApplicant(gig._id, targetId);
                                    }
                                  } else {
                                    handleOpenApplicantModal(gig);
                                  }
                                }}
                                sx={{ flex: 1, minWidth: 'fit-content' }}
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
                              sx={{ flex: 1, minWidth: 'fit-content' }}
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
                              sx={{ flex: 1, minWidth: 'fit-content' }}
                            >
                              Delete
                            </Button>
                          </Box>
                        </CardActions>
                      </Card>
                    ))}
                  </Box>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    {/* Desktop List Layout */}
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
                                if (accepted) {
                                  // If someone is already accepted, undo their acceptance
                                  const targetId = typeof accepted.user === 'string' ? accepted.user : accepted.user?._id;
                                  if (targetId) {
                                    handleAcceptApplicant(gig._id, targetId);
                                  }
                                } else {
                                  // If no one is accepted, open modal to select applicant
                                  handleOpenApplicantModal(gig);
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
              </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  No gigs posted yet. Create your first gig to get started!
                </Typography>
              </Box>
            )}
        </CardContent>
      </Card>

      {/* My Gig Applications Section */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography 
              variant="h6" 
              component={RouterLink} 
              to="/my-gigs?tab=applications"
              sx={{ 
                textDecoration: 'none', 
                color: 'inherit',
                display: 'flex',
                alignItems: 'center',
                '&:hover': {
                  color: 'primary.main',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }
              }}
            >
              <WorkIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              My Gig Applications
            </Typography>
          </Box>

          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {applications.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                No gig applications yet. Start applying to gigs to see them here!
              </Typography>
            ) : (
              <List>
                {applications.slice(0, 3).map((application) => (
                  <ListItem key={application._id} divider>
                    <ListItemText
                      primary={application.gig?.title || 'Gig Title'}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Status: <Chip 
                              label={application.status} 
                              size="small" 
                              color={application.status === 'accepted' ? 'success' : 
                                     application.status === 'rejected' ? 'error' : 'default'}
                            />
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Applied: {new Date(application.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </CardContent>
      </Card>

        </Grid>
        </Grid>
      </Grid>

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
              helperText="Must contain at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)"
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

      {/* Applicant Selection Modal */}
      <ApplicantSelectionModal
        open={showApplicantModal}
        onClose={() => {
          setShowApplicantModal(false);
          setSelectedGig(null);
        }}
        applicants={selectedGig?.applicants || []}
        onSelectApplicant={handleSelectApplicant}
        gigTitle={selectedGig?.title || ''}
      />
    </Container>
  );
};

export default Dashboard;