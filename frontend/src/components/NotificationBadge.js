import React from 'react';
import { Badge } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#f44336',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    border: `2px solid ${theme.palette.background.paper}`,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    top: '8px',
    right: '8px',
    transform: 'scale(1) translate(50%, -50%)',
    transformOrigin: '100% 0%',
    zIndex: 1000,
    // Animation for new notifications
    animation: '$pulse 2s infinite',
  },
  '@keyframes pulse': {
    '0%': {
      transform: 'scale(1) translate(50%, -50%)',
    },
    '50%': {
      transform: 'scale(1.1) translate(50%, -50%)',
    },
    '100%': {
      transform: 'scale(1) translate(50%, -50%)',
    },
  },
}));

const NotificationBadge = ({ children, count = 0, showZero = false }) => {
  // Don't show badge if count is 0 and showZero is false
  const shouldShowBadge = count > 0 || showZero;
  
  // Format count display (show 99+ for counts over 99)
  const displayCount = count > 99 ? '99+' : count;

  return (
    <StyledBadge
      badgeContent={shouldShowBadge ? displayCount : 0}
      invisible={!shouldShowBadge}
      overlap="circular"
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      {children}
    </StyledBadge>
  );
};

export default NotificationBadge;