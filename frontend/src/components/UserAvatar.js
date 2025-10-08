import React from 'react';
import { Avatar } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '') || '').replace(/\/$/, '');

const encodeKey = (key) => key.split('/').map(segment => encodeURIComponent(segment)).join('/');

const convertR2PublicUrlToProxy = (url) => {
  if (!url) {
    return '';
  }

  const match = url.match(/\.r2\.dev\/[\w-]+\/(.+)$/);
  if (match && match[1]) {
    return `/api/media/r2/${encodeKey(match[1])}`;
  }

  return url;
};

const toAbsoluteUrl = (input) => {
  if (!input) {
    return '';
  }

  if (input.startsWith('http://') || input.startsWith('https://')) {
    return convertR2PublicUrlToProxy(input);
  }

  const normalizedPath = input.startsWith('/') ? input : `/${input}`;
  const absolute = `${API_BASE_URL}${normalizedPath}`;
  return convertR2PublicUrlToProxy(absolute);
};

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

  const fullAvatarSrc = toAbsoluteUrl(avatarSrc);

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
