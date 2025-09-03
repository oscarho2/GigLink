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
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import AuthContext from '../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { user, isAuthenticated, loading: authLoading, token } = useContext(AuthContext);
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
      const response = await axios.delete('http://localhost:5001/api/profiles/me', {
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
      await axios.delete(`http://localhost:5001/api/gigs/${gigToDelete._id}`, {
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
        const userGigs = gigsRes.data.filter(gig => 
          gig.user && user.id && (gig.user._id === user.id || gig.user._id.toString() === user.id.toString())
        );
        setGigs(userGigs);
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
                to={`/profile/${user?._id}`}
                fullWidth
                variant="outlined"
              >
                View Profile
              </Button>
              <Button
                onClick={handleDeleteAccount}
                fullWidth
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
              >
                Delete Account
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
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Box 
                        component={RouterLink}
                        to={`/gigs/${gig._id}`}
                        sx={{ 
                          textDecoration: 'none', 
                          color: 'inherit',
                          flex: 1,
                          mr: 2
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
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={gig.isFilled ? 'Filled' : 'Open'}
                          color={gig.isFilled ? 'default' : 'success'}
                          size="small"
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={(e) => {
                            e.preventDefault();
                            handleEditGig(gig._id);
                          }}
                          sx={{ minWidth: 'auto', px: 1 }}
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
                          sx={{ minWidth: 'auto', px: 1 }}
                        >
                          Delete
                        </Button>
                      </Box>
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