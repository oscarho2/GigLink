import React, { useState } from 'react';
import { Alert, AlertTitle, Box, Button, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';

const EmailVerificationBanner = ({ actionType = 'general' }) => {
  const { user, token } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  
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
    setResendSuccess(false);
    
    try {
      const response = await axios.post('/api/users/resend-verification', {}, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (response.data.success) {
        setResendSuccess(true);
        setTimeout(() => {
          setResendSuccess(false);
        }, 5000); // Reset success message after 5 seconds
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
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
            You need to verify your email to {getActionMessage()}. 
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
            alignItems: 'center', 
            justifyContent: 'center', // Center the button section
            gap: 1, 
            mt: 0.5,
            flexWrap: 'wrap' // Allow wrapping on small screens
          }}>
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
            {resendSuccess && (
              <span style={{ color: '#4caf50', fontSize: '0.8rem' }}>
                Email sent!
              </span>
            )}
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