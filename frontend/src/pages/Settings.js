import React, { useState } from 'react';
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

const Settings = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    profileVisibility: true,
    autoAcceptLinks: false,
    darkMode: false
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

  const handleSettingChange = (setting) => (event) => {
    setSettings({
      ...settings,
      [setting]: event.target.checked
    });
  };

  const handleSaveSettings = () => {
    // TODO: Implement API call to save settings
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

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
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={handleSettingChange('emailNotifications')}
                    />
                  }
                  label="Email Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                  Receive email notifications for new messages and gig opportunities
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.pushNotifications}
                      onChange={handleSettingChange('pushNotifications')}
                    />
                  }
                  label="Push Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  Receive push notifications on your device
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>



        {/* Appearance Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Appearance
              </Typography>
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.darkMode}
                      onChange={handleSettingChange('darkMode')}
                    />
                  }
                  label="Dark Mode"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  Switch to dark theme (coming soon)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Actions */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              onClick={handlePasswordChange}
            >
              Change Password
            </Button>
            <Button 
              variant="outlined" 
              color="error" 
              onClick={handleDeleteAccount}
            >
              Delete Account
            </Button>
          </Box>
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