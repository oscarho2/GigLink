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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import AuthContext from '../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { user, isAuthenticated, loading: authLoading, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogStep, setDeleteDialogStep] = useState(0); // 0: closed, 1: first warning, 2: second warning, 3: final confirmation
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [gigToDelete, setGigToDelete] = useState(null);
  const [gigDeleteDialogOpen, setGigDeleteDialogOpen] = useState(false);
  const [gigDeleteConfirmation, setGigDeleteConfirmation] = useState('');
  const [gigDeleteError, setGigDeleteError] = useState('');
  
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
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [linksLoading, setLinksLoading] = useState(true);

  const handleDeleteAccount = () => {
    setDeleteDialogStep(1);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogStep(0);
    setConfirmationText('');
    setIsDeleting(false);
  };

  const handleNextStep = () => {
    setDeleteDialogStep(deleteDialogStep + 1);
  };

  const handleFinalDelete = async () => {
    if (confirmationText !== 'DELETE MY ACCOUNT') {
      return;
    }

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
      const [friendsRes, pendingRes, sentRes] = await Promise.all([
        axios.get('/api/links/friends', { headers: { 'x-auth-token': token } }),
        axios.get('/api/links/requests/pending', { headers: { 'x-auth-token': token } }),
        axios.get('/api/links/requests/sent', { headers: { 'x-auth-token': token } })
      ]);
      
      // Transform backend response to match frontend expectations
      const transformedFriends = (friendsRes.data.friends || []).map(item => ({
        _id: item.friend.id,
        name: item.friend.name,
        email: item.friend.email,
        avatar: item.friend.avatar,
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
      
      setFriends(transformedFriends);
      setPendingRequests(transformedPending);
      setSentRequests(transformedSent);
    } catch (err) {
      console.error('Error fetching links data:', err);
    } finally {
      setLinksLoading(false);
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
    setGigDeleteConfirmation('');
    setGigDeleteError('');
  };

  const handleCloseGigDeleteDialog = () => {
    setGigDeleteDialogOpen(false);
    setGigToDelete(null);
    setGigDeleteConfirmation('');
    setGigDeleteError('');
  };

  const handleConfirmGigDelete = async () => {
    if (gigDeleteConfirmation !== gigToDelete?.title) {
      setGigDeleteError('Please type the gig title exactly as shown.');
      return;
    }

    try {
      await axios.delete(`/api/gigs/${gigToDelete._id}`, {
        headers: { 'x-auth-token': token }
      });
      
      // Remove the deleted gig from the local state
      setGigs(gigs.filter(gig => gig._id !== gigToDelete._id));
      handleCloseGigDeleteDialog();
    } catch (err) {
      console.error('Error deleting gig:', err);
      setGigDeleteError(err.response?.data?.msg || 'Failed to delete gig');
    }
  };

  const handleEditGig = (gigId) => {
    navigate(`/gigs/${gigId}/edit`);
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
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                <Avatar
                  src={user?.avatar}
                  alt={user?.name}
                  sx={{ width: 100, height: 100, mb: 2 }}
                />
                <Typography variant="h5" sx={{ textAlign: 'center' }}>{user?.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', wordBreak: 'break-word' }}>
                  {user?.email}
                </Typography>
                {user?.location && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
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
            <CardActions sx={{ 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 2 },
              p: { xs: 2, sm: 2 }
            }}>
              <Button
                component={RouterLink}
                to={`/profile/${user?.id}`}
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
          
          {/* Account Management */}
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Account Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Manage your account security and preferences
              </Typography>
            </CardContent>
            <CardActions sx={{ 
              flexDirection: 'column',
              gap: { xs: 1.5, sm: 2 },
              p: { xs: 2, sm: 2 }
            }}>
              <Box sx={{ 
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1.5, sm: 2 },
                width: '100%'
              }}>
                <Button
                  onClick={handleChangePassword}
                  variant="outlined"
                  startIcon={<LockIcon />}
                  sx={{ 
                    minHeight: { xs: 48, sm: 40 },
                    flex: { xs: 1, sm: 1 },
                    fontWeight: 500
                  }}
                >
                  Change Password
                </Button>
                <Button
                  onClick={handleDeleteAccount}
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  sx={{ 
                    minHeight: { xs: 48, sm: 40 },
                    flex: { xs: 1, sm: 1 },
                    fontWeight: 500
                  }}
                >
                  Delete Account
                </Button>
              </Box>
              <Button
                onClick={logout}
                variant="contained"
                color="warning"
                startIcon={<LogoutIcon />}
                sx={{ 
                  minHeight: { xs: 48, sm: 40 },
                  width: '100%',
                  fontWeight: 500
                }}
              >
                Logout
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
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          transform: 'translateY(-1px)',
                          boxShadow: 2
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
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {gig.title}
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
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 1
                        }}>
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
                <Typography variant="h6">
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
                  {/* Pending Friend Requests */}
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
                  
                  {/* Current Friends */}
                  {friends.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PeopleIcon fontSize="small" />
                        Friends ({friends.length})
                      </Typography>
                      <List>
                        {friends.map(friend => (
                          <ListItem
                            key={friend._id}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              mb: 1,
                              p: 2
                            }}
                          >
                            <Avatar
                              src={friend.avatar}
                              alt={friend.name}
                              sx={{ mr: 2 }}
                            />
                            <ListItemText
                              primary={friend.name}
                              secondary={friend.email}
                            />
                            <IconButton
                              onClick={() => handleRemoveLink(friend.linkId)}
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
                  {friends.length === 0 && pendingRequests.length === 0 && sentRequests.length === 0 && (
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
          <Button onClick={handleNextStep} color="error" variant="outlined">
            Yes, I Understand
          </Button>
        </DialogActions>
      </Dialog>

      {/* Step 3: Confirmation Text Input */}
      <Dialog open={deleteDialogStep === 3} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          Confirm Account Deletion
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="bold">
              LAST CHANCE TO CANCEL
            </Typography>
          </Alert>
          <Typography variant="body1" gutterBottom>
            To confirm the deletion of your account and all associated data, please type:
          </Typography>
          <Typography variant="h6" sx={{ my: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1, fontFamily: 'monospace' }}>
            DELETE MY ACCOUNT
          </Typography>
          <TextField
            fullWidth
            label="Type the confirmation text above"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="DELETE MY ACCOUNT"
            sx={{ mt: 2 }}
            error={confirmationText !== '' && confirmationText !== 'DELETE MY ACCOUNT'}
            helperText={confirmationText !== '' && confirmationText !== 'DELETE MY ACCOUNT' ? 'Text must match exactly' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleFinalDelete} 
            color="error" 
            variant="contained"
            disabled={confirmationText !== 'DELETE MY ACCOUNT' || isDeleting}
          >
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
          <Typography variant="body1" gutterBottom>
            To confirm, please type the gig title exactly as shown:
          </Typography>
          <Typography variant="h6" sx={{ my: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1, fontFamily: 'monospace' }}>
            {gigToDelete?.title}
          </Typography>
          <TextField
            fullWidth
            label="Type the gig title above"
            value={gigDeleteConfirmation}
            onChange={(e) => setGigDeleteConfirmation(e.target.value)}
            placeholder={gigToDelete?.title}
            sx={{ mt: 2 }}
            error={gigDeleteError !== ''}
            helperText={gigDeleteError || (gigDeleteConfirmation !== '' && gigDeleteConfirmation !== gigToDelete?.title ? 'Title must match exactly' : '')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGigDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmGigDelete} 
            color="error" 
            variant="contained"
            disabled={gigDeleteConfirmation !== gigToDelete?.title}
          >
            Delete Gig
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;