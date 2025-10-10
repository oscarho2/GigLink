import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, Button, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const EmailVerificationBanner = ({ actionType = 'general' }) => {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Determine if user is authenticated and email is not verified
  const isEmailNotVerified = user && !user.isEmailVerified;

  // Get dismissed state from localStorage
  useEffect(() => {
    const dismissedActions = JSON.parse(localStorage.getItem('dismissedEmailVerificationBanners') || '{}');
    const isActionDismissed = dismissedActions[actionType] || false;
    setIsDismissed(isActionDismissed);
  }, [actionType]);

  // Show banner when user is not verified and action is critical
  useEffect(() => {
    if (isEmailNotVerified && !isDismissed) {
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [isEmailNotVerified, isDismissed]);

  const handleDismiss = () => {
    // Store that this action's banner has been dismissed
    const dismissedActions = JSON.parse(localStorage.getItem('dismissedEmailVerificationBanners') || '{}');
    dismissedActions[actionType] = true;
    localStorage.setItem('dismissedEmailVerificationBanners', JSON.stringify(dismissedActions));
    setIsDismissed(true);
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  // Define action-specific messages
  const getActionMessage = () => {
    switch (actionType) {
      case 'create-gig':
        return 'Create Gig Posts';
      case 'create-community-post':
        return 'Create Community Posts';
      case 'message':
        return 'Enter the Message Section';
      case 'apply-gig':
        return 'Apply for Gigs';
      default:
        return 'Use Critical Features';
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Alert 
        severity="warning" 
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={handleDismiss}
            sx={{ 
              fontWeight: 'bold',
              textDecoration: 'underline',
              textTransform: 'none'
            }}
          >
            Dismiss
          </Button>
        }
        sx={{
          backgroundColor: 'rgba(255, 235, 59, 0.1)', // Light yellow background
          border: '1px solid #FFECB3', // Light border
          borderRadius: '8px',
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
      >
        <AlertTitle sx={{ fontWeight: 'bold', color: '#FF8F00' }}>
          Email Verification Required
        </AlertTitle>
        <Box>
          <div>
            You need to verify your email to {getActionMessage()}. 
            <br />
            <Link 
              to="/profile" 
              style={{ 
                color: '#1a365d', 
                fontWeight: 'bold', 
                textDecoration: 'underline',
                marginLeft: '4px'
              }}
            >
              Verify email now
            </Link>
          </div>
        </Box>
      </Alert>
    </Box>
  );
};

export default EmailVerificationBanner;