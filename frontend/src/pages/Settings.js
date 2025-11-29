import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  TextField,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import pushNotificationService from '../utils/pushNotifications';

const Settings = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    profileVisibility: true,
    autoAcceptLinks: false
  });
  
  const [notificationPreferences, setNotificationPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    commentNotifications: true,
    messageNotifications: true,
    gigResponseNotifications: true,
    gigApplicationNotifications: true,
    linkRequestNotifications: true,
    likeNotifications: true
  });
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Password change state
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
  
  // Delete account state
  const [deleteDialogStep, setDeleteDialogStep] = useState(0); // 0: closed, 1: first warning, 2: final confirmation
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Push notification state
  const [pushNotificationSupported, setPushNotificationSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const isNativePush = pushNotificationService.isNativeMode();
  const normalizePushPermission = useCallback((value) => {
    if (!value) return 'default';
    const lower = value.toLowerCase();
    if (lower === 'authorized' || lower === 'granted') return 'granted';
    if (lower === 'denied') return 'denied';
    return 'default';
  }, []);

  useEffect(() => {
    const handlePermissionEvent = (event) => {
      setPushPermission(normalizePushPermission(event?.detail));
    };
    const handleSupported = () => setPushNotificationSupported(true);

    window.addEventListener('push-permission-state', handlePermissionEvent);
    window.addEventListener('push-supported', handleSupported);

    return () => {
      window.removeEventListener('push-permission-state', handlePermissionEvent);
      window.removeEventListener('push-supported', handleSupported);
    };
  }, [normalizePushPermission]);



  const handleSaveSettings = async () => {
    try {
      // Save notification preferences
      await axios.put('/api/settings/notifications', notificationPreferences, {
        headers: { 'x-auth-token': token }
      });
      
      // TODO: Implement API call to save other settings
      // Success feedback removed as requested
    } catch (err) {
      console.error('Error saving settings:', err);
      // TODO: Show error message
    }
  };
  
  const handleNotificationChange = (setting) => async (event) => {
    const isChecked = event.target.checked;
    const prevPreferences = notificationPreferences;
    const prevSubscribed = isSubscribed;

    // Handle push notifications specially
    let updatedPreferences = {
      ...notificationPreferences,
      [setting]: isChecked
    };

    if (setting === 'pushNotifications') {
      setNotificationPreferences(updatedPreferences);

      if (isChecked) {
        try {
          // Request permission first
          const permission = await pushNotificationService.requestPermission();
          setPushPermission(permission);
          
          if (permission !== 'granted') {
            setNotificationPreferences(prevPreferences);
            return;
          }

          setIsSubscribed(true); // optimistic while registration completes
          await pushNotificationService.subscribe(token);
          setIsSubscribed(true);
        } catch (error) {
          console.error('Error enabling push notifications:', error);
          setNotificationPreferences(prevPreferences);
          setIsSubscribed(prevSubscribed);
          return;
        }
      } else {
        try {
          // Unsubscribe from push notifications
          setIsSubscribed(false); // optimistic
          await pushNotificationService.unsubscribe(token);
        } catch (error) {
          console.error('Error disabling push notifications:', error);
          setNotificationPreferences(prevPreferences);
          setIsSubscribed(prevSubscribed);
          return;
        }
      }
    } else {
      setNotificationPreferences(updatedPreferences);
    }
    
    const newPreferences = updatedPreferences;
    
    // Auto-save settings when changed
    try {
      await axios.put('/api/settings/notifications', newPreferences, {
        headers: { 'x-auth-token': token }
      });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      // Keep the local toggle state; surface the error for debugging
    }
  };
  
  // Load notification preferences on component mount
  React.useEffect(() => {
    const loadNotificationPreferences = async () => {
      try {
        const response = await axios.get('/api/settings/notifications', {
          headers: { 'x-auth-token': token }
        });
        setNotificationPreferences(response.data);
      } catch (err) {
        console.error('Error loading notification preferences:', err);
      }
    };
    
    if (token) {
      loadNotificationPreferences();
    }
  }, [token]);
  
  // Initialize push notifications on component mount
  React.useEffect(() => {
    const initializePushNotifications = async () => {
      try {
        const isInitialized = await pushNotificationService.init();
        setPushNotificationSupported(isInitialized);
        
        if (isInitialized) {
          // Check current permission status
          const permission = normalizePushPermission(Notification.permission);
          setPushPermission(permission);
          
          // Check if user is already subscribed
          const subscribed = await pushNotificationService.isSubscribed();
          setIsSubscribed(subscribed);
        }
      } catch (error) {
        console.error('Error initializing push notifications:', error);
        setPushNotificationSupported(false);
      }
    };
    
    initializePushNotifications();
  }, [normalizePushPermission]);

  // Password change handlers
  const handlePasswordChange = () => {
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

  const handlePasswordInputChange = (e) => {
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
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }, 2000);
    } catch (err) {
      console.error('Error changing password:', err);
      const errorMsg = err.response?.data?.errors?.[0]?.msg || 'Failed to change password';
      setPasswordError(errorMsg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteDialogStep(1);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogStep(0);
    setIsDeleting(false);
    setDeleteConfirmText('');
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

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      {showSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings updated successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Notification Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notification Preferences
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose which notifications you'd like to receive
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
                  Delivery Methods
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationPreferences.emailNotifications}
                        onChange={handleNotificationChange('emailNotifications')}
                        color="primary"
                      />
                    }
                    label="Email Notifications"
                    sx={{ 
                      m: 0,
                      p: 1.5,
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationPreferences.pushNotifications && isSubscribed}
                        onChange={handleNotificationChange('pushNotifications')}
                        disabled={!pushNotificationSupported || pushPermission === 'denied'}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Box component="span">
                          Push Notifications
                        </Box>
                        {!pushNotificationSupported && (
                          <Box component="div" sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                            Not supported in this browser
                          </Box>
                        )}
                        {pushNotificationSupported && pushPermission === 'denied' && (
                          <Box component="div" sx={{ fontSize: '0.75rem', color: 'error.main', mt: 0.5 }}>
                            Permission denied - please enable in browser settings
                          </Box>
                        )}
                        {pushNotificationSupported && pushPermission === 'granted' && isSubscribed && (
                          <Box component="div" sx={{ fontSize: '0.75rem', color: 'success.main', mt: 0.5 }}>
                            Active
                          </Box>
                        )}
                        {pushNotificationSupported && pushNotificationService.isNativeMode() && (
                          <Box component="div" sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                            Uses the iOS app's notification settings
                          </Box>
                        )}
                      </Box>
                    }
                    sx={{ 
                      m: 0,
                      p: 1.5,
                      borderRadius: 1,
                      opacity: (!pushNotificationSupported || pushPermission === 'denied') ? 0.6 : 1,
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  />
                </Box>
                
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
                  Notification Types
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationPreferences.likeNotifications}
                        onChange={handleNotificationChange('likeNotifications')}
                        color="primary"
                      />
                    }
                    label="Likes on your posts"
                    sx={{ 
                      m: 0,
                      p: 1.5,
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationPreferences.commentNotifications}
                        onChange={handleNotificationChange('commentNotifications')}
                        color="primary"
                      />
                    }
                    label="Comments on your posts"
                    sx={{ 
                      m: 0,
                      p: 1.5,
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationPreferences.messageNotifications}
                        onChange={handleNotificationChange('messageNotifications')}
                        color="primary"
                      />
                    }
                    label="Direct messages"
                    sx={{ 
                      m: 0,
                      p: 1.5,
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationPreferences.gigResponseNotifications}
                        onChange={handleNotificationChange('gigResponseNotifications')}
                        color="primary"
                      />
                    }
                    label="Gig responses"
                    sx={{ 
                      m: 0,
                      p: 1.5,
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationPreferences.gigApplicationNotifications}
                        onChange={handleNotificationChange('gigApplicationNotifications')}
                        color="primary"
                      />
                    }
                    label="Gig applications"
                    sx={{ 
                      m: 0,
                      p: 1.5,
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationPreferences.linkRequestNotifications}
                        onChange={handleNotificationChange('linkRequestNotifications')}
                        color="primary"
                      />
                    }
                    label="Link requests"
                    sx={{ 
                      m: 0,
                      p: 1.5,
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>





        {/* Account Management */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Manage your account security and data
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button 
                  variant="contained" 
                  onClick={handlePasswordChange}
                  sx={{ 
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 500
                  }}
                >
                  Change Password
                </Button>
                
                <Button 
                  variant="outlined" 
                  color="error" 
                  onClick={handleDeleteAccount}
                  sx={{ 
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 500,
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                      backgroundColor: 'error.main',
                      color: 'white'
                    }
                  }}
                >
                  Delete Account
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onClose={handleCloseChangePassword} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
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
              margin="normal"
              required
              fullWidth
              name="currentPassword"
              label="Current Password"
              type={showCurrentPassword ? 'text' : 'password'}
              value={passwordData.currentPassword}
              onChange={handlePasswordInputChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
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
              margin="normal"
              required
              fullWidth
              name="newPassword"
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={handlePasswordInputChange}
              helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
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
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={passwordData.confirmPassword}
              onChange={handlePasswordInputChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
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
            <Button onClick={handleCloseChangePassword}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isChangingPassword}
            >
              {isChangingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Multi-step Delete Account Dialog */}
      <Dialog
        open={deleteDialogStep > 0}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Delete Account?
        </DialogTitle>
        <DialogContent>
          {deleteDialogStep === 1 && (
            <Typography>
              Are you sure you want to delete your account? This will permanently remove:
              <br />• Your profile and all personal information
              <br />• All your gig posts and applications
              <br />• Your connections and messages
              <br />• All other data associated with your account
              <br /><br />
              This action cannot be undone.
            </Typography>
          )}
          {deleteDialogStep === 2 && (
            <>
              <Typography color="error" sx={{ fontWeight: 'bold' }}>
                FINAL WARNING: This will permanently delete your account and ALL associated data.
                <br /><br />
                Type "DELETE" below to confirm:
              </Typography>
              <TextField
                fullWidth
                margin="normal"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                variant="outlined"
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>
            Cancel
          </Button>
          {deleteDialogStep === 1 && (
            <Button onClick={handleNextStep} color="error">
              Continue
            </Button>
          )}
          {deleteDialogStep === 2 && (
            <Button 
              onClick={handleFinalDelete} 
              color="error" 
              variant="contained"
              disabled={isDeleting || deleteConfirmText !== 'DELETE'}
            >
              {isDeleting ? 'Deleting...' : 'DELETE ACCOUNT'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;
