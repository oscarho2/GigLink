import React from 'react';
import { Box, CircularProgress, Typography, Skeleton, useTheme } from '@mui/material';
import { keyframes } from '@mui/system';

const pulse = keyframes`
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
`;

const LoadingSpinner = ({ 
  type = 'spinner', // 'spinner', 'skeleton', 'dots', 'text'
  size = 'medium', // 'small', 'medium', 'large'
  text = 'Loading...', 
  fullScreen = false,
  rows = 3,
  variant = 'rectangular' // for skeleton: 'text', 'rectangular', 'circular'
}) => {
  const theme = useTheme();
  
  const getSizeValue = () => {
    switch (size) {
      case 'small': return 24;
      case 'large': return 60;
      default: return 40;
    }
  };

  const renderDots = () => (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      {[0, 1, 2].map((index) => (
        <Box
          key={index}
          sx={{
            width: size === 'small' ? 6 : size === 'large' ? 12 : 8,
            height: size === 'small' ? 6 : size === 'large' ? 12 : 8,
            borderRadius: '50%',
            bgcolor: theme.palette.primary.main,
            animation: `${pulse} 1.4s ease-in-out infinite`,
            animationDelay: `${index * 0.16}s`,
          }}
        />
      ))}
    </Box>
  );

  const renderSkeleton = () => (
    <Box sx={{ width: '100%' }}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton
          key={index}
          variant={variant}
          height={variant === 'text' ? 20 : variant === 'circular' ? 40 : 60}
          sx={{ 
            mb: 1,
            width: variant === 'circular' ? 40 : `${100 - (index * 10)}%`,
            maxWidth: variant === 'circular' ? 40 : 'none'
          }}
        />
      ))}
    </Box>
  );

  const renderSpinner = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <CircularProgress size={getSizeValue()} thickness={4} />
      {text && (
        <Typography 
          variant={size === 'small' ? 'caption' : 'body2'} 
          color="text.secondary"
          sx={{ animation: `${pulse} 2s ease-in-out infinite` }}
        >
          {text}
        </Typography>
      )}
    </Box>
  );

  const renderTextOnly = () => (
    <Typography 
      variant={size === 'small' ? 'caption' : 'body2'} 
      color="text.secondary"
      sx={{ 
        animation: `${pulse} 2s ease-in-out infinite`,
        textAlign: 'center'
      }}
    >
      {text}
    </Typography>
  );

  const getContent = () => {
    switch (type) {
      case 'skeleton': return renderSkeleton();
      case 'dots': return renderDots();
      case 'text': return renderTextOnly();
      default: return renderSpinner();
    }
  };

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 9999,
        }}
      >
        {getContent()}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: size === 'small' ? 1 : size === 'large' ? 4 : 2,
        minHeight: size === 'small' ? 60 : size === 'large' ? 200 : 120,
      }}
    >
      {getContent()}
    </Box>
  );
};

export default LoadingSpinner;