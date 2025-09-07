import React from 'react';
import { Box, Typography, Fade, Zoom, useTheme, useMediaQuery } from '@mui/material';
import { keyframes } from '@mui/system';

// Keyframe animations
const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const LoadingAnimation = ({ 
  type = 'welcome', // 'welcome' or 'conversations'
  title,
  subtitle,
  showIcon = true,
  compact = false 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const renderDots = () => (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 2 }}>
      {[0, 1, 2].map((index) => (
        <Box
          key={index}
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: theme.palette.primary.main,
            animation: `${pulse} 1.5s ease-in-out infinite`,
            animationDelay: `${index * 0.2}s`,
          }}
        />
      ))}
    </Box>
  );

  const renderShimmerBars = () => (
    <Box sx={{ width: '100%', maxWidth: 300, mx: 'auto' }}>
      {[0, 1, 2].map((index) => (
        <Box
          key={index}
          sx={{
            height: compact ? 12 : 16,
            borderRadius: 1,
            mb: 1.5,
            background: `linear-gradient(90deg, ${theme.palette.grey[200]} 25%, ${theme.palette.grey[100]} 50%, ${theme.palette.grey[200]} 75%)`,
            backgroundSize: '200px 100%',
            animation: `${shimmer} 2s infinite linear`,
            animationDelay: `${index * 0.3}s`,
            width: index === 0 ? '100%' : index === 1 ? '80%' : '60%',
          }}
        />
      ))}
    </Box>
  );

  const renderFloatingIcon = () => (
    <Box
      sx={{
        width: compact ? 40 : 60,
        height: compact ? 40 : 60,
        borderRadius: '50%',
        bgcolor: theme.palette.primary.main,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 2,
        animation: `${float} 3s ease-in-out infinite`,
        boxShadow: `0 4px 20px ${theme.palette.primary.main}30`,
      }}
    >
      <Typography
        variant={compact ? 'h6' : 'h4'}
        sx={{ color: 'white', fontWeight: 'bold' }}
      >
        💬
      </Typography>
    </Box>
  );

  if (type === 'conversations') {
    return (
      <Fade in timeout={500}>
        <Box
          sx={{
            p: compact ? 2 : 3,
            textAlign: 'center',
            animation: `${fadeInUp} 0.6s ease-out`,
          }}
        >
          {renderDots()}
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              mb: 2,
              animation: `${fadeInUp} 0.8s ease-out`,
            }}
          >
            {title || 'Loading conversations...'}
          </Typography>
          {renderShimmerBars()}
        </Box>
      </Fade>
    );
  }

  return (
    <Fade in timeout={800}>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f8f9fa',
          textAlign: 'center',
          p: isMobile ? 2 : 4,
          animation: `${fadeInUp} 0.8s ease-out`,
        }}
      >
        {showIcon && (
          <Zoom in timeout={600}>
            <Box>{renderFloatingIcon()}</Box>
          </Zoom>
        )}
        
        <Box sx={{ mb: 3, maxWidth: 400 }}>
          <Typography 
            variant={isMobile ? 'h5' : 'h4'} 
            color="text.secondary" 
            gutterBottom
            sx={{
              animation: `${fadeInUp} 1s ease-out`,
              fontWeight: 500,
            }}
          >
            {title || 'Welcome to GigLink Messages'}
          </Typography>
          
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{
              animation: `${fadeInUp} 1.2s ease-out`,
              opacity: 0.8,
            }}
          >
            {subtitle || 'Select a conversation to start messaging'}
          </Typography>
        </Box>

        {renderDots()}
        
        <Box sx={{ mt: 2, maxWidth: 200 }}>
          {renderShimmerBars()}
        </Box>
      </Box>
    </Fade>
  );
};

export default LoadingAnimation;