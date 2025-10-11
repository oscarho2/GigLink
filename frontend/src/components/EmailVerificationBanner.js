import React, { useState } from 'react';
import { Alert, AlertTitle, Box, Button, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const EmailVerificationBanner = ({ actionType = 'general' }) => {
  const { user, token } = useAuth();
  const [isResending, setIsResending] = useState(false);
  
  // Determine if user is authenticated and email is not verified
  const isEmailNotVerified = user && !user.isEmailVerified;

  if (!isEmailNotVerified) {
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

  const handleResendEmail = async () => {
    setIsResending(true);
    
    try {
      const response = await axios.post('/api/users/resend-verification', {}, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (response.data.success) {
        toast.success(response.data.message || 'Verification email has been sent successfully!');
      } else {
        toast.error(response.data.message || 'Failed to send verification email. Please try again.');
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      toast.error('An error occurred while sending the verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // Create mailto link for user's email
  const mailtoLink = `mailto:${user.email}`;

  return (
    <Box sx={{ 
      mb: 2,
      position: 'relative',
      zIndex: 1000  // Ensure it appears above other elements but not too high
    }}>
      <Alert 
        severity="warning"
        icon={false} // Remove the default icon
        sx={{
          backgroundColor: 'rgba(255, 235, 59, 0.1)', // Light yellow background
          border: '1px solid #FFECB3', // Light border
          borderRadius: '8px',
          '& .MuiAlert-message': {
            width: '100%'
          },
          alignItems: 'center', // Center items vertically
          py: 2, // Add vertical padding
          px: { xs: 1, sm: 2, md: 3 } // Add horizontal padding with more on desktop
        }}
      >
        <AlertTitle sx={{ fontWeight: 'bold', color: '#FF8F00', fontSize: '0.9rem', mb: 0.5, textAlign: 'center' }}>
          Email Verification Required!
        </AlertTitle>
        <Box sx={{ 
          fontSize: '0.9rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 1,
          textAlign: 'center',
          width: '100%'
        }}>
          <div>
            You need to verify your email to {getActionMessage()}.<br />
            Check your email (<a 
              href={mailtoLink} 
              style={{ 
                color: '#1a365d', 
                fontWeight: 'bold', 
                textDecoration: 'underline' 
              }}
            >
              {user.email}
            </a>) for a verification link.
          </div>
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            mt: 0.5
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleResendEmail}
                disabled={isResending}
                sx={{ 
                  backgroundColor: '#1a365d',
                  color: 'white',
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  minWidth: 'auto',
                  '&:hover': {
                    backgroundColor: '#2c5282'
                  }
                }}
              >
                {isResending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  'Resend Email'
                )}
              </Button>
            </Box>
            <span style={{ color: '#666', fontSize: '0.8rem' }}>
              or check your spam folder
            </span>
          </Box>
        </Box>
      </Alert>
    </Box>
  );
};

export default EmailVerificationBanner;