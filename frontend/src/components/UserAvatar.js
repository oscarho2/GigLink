import React from 'react';
import { Avatar } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

const UserAvatar = ({ 
  user, 
  src, 
  alt, 
  size = 40, 
  mobileSize, 
  onClick, 
  sx = {}, 
  ...props 
}) => {
  // Determine the avatar source
  const avatarSrc = src || user?.avatar || user?.profilePicture;
  
  // Build the full URL if we have a relative path
  const fullAvatarSrc = avatarSrc && avatarSrc.startsWith('/') 
    ? `http://localhost:5001${avatarSrc}` 
    : avatarSrc;

  // Determine the alt text
  const avatarAlt = alt || user?.name || 'User';
  
  // Get initials for fallback
  const getInitials = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (avatarAlt && avatarAlt !== 'User') {
      return avatarAlt.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Calculate responsive sizes
  const responsiveSize = mobileSize ? {
    width: { xs: mobileSize, sm: size },
    height: { xs: mobileSize, sm: size }
  } : {
    width: size,
    height: size
  };

  // Calculate responsive font size
  const responsiveFontSize = mobileSize ? {
    fontSize: { xs: mobileSize * 0.4, sm: size * 0.4 }
  } : {
    fontSize: size * 0.4
  };

  return (
    <Avatar
      src={fullAvatarSrc}
      alt={avatarAlt}
      onClick={onClick}
      sx={{
        ...responsiveSize,
        bgcolor: fullAvatarSrc ? 'transparent' : '#9e9e9e', // LinkedIn-style grey
        color: '#ffffff',
        ...responsiveFontSize,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          transform: 'scale(1.05)',
          transition: 'transform 0.2s ease-in-out'
        } : {},
        ...sx
      }}
      {...props}
    >
      {!fullAvatarSrc && (
        <PersonIcon 
          sx={{ 
            fontSize: mobileSize ? { xs: mobileSize * 0.6, sm: size * 0.6 } : size * 0.6,
            color: '#ffffff'
          }} 
        />
      )}
      {!fullAvatarSrc && !PersonIcon && getInitials()}
    </Avatar>
  );
};

export default UserAvatar;