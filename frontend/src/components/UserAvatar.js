import React from 'react';
import { Avatar } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '') || '').replace(/\/$/, '');

const API_HOST = (() => {
  try {
    return new URL(API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).host;
  } catch {
    return '';
  }
})();

const STORAGE_KEY_PREFIXES = [
  'images',
  'videos',
  'audio',
  'misc',
  'documents',
  'avatars',
  'profiles',
  'profilePictures',
  'media',
  'files',
  'uploads'
];

const encodeKey = (key) => key.split('/').map(segment => encodeURIComponent(segment)).join('/');

const stripLeadingSlash = (value = '') => value.replace(/^\/+/, '');

const extractStorageKey = (value) => {
  if (!value) {
    return null;
  }

  if (value.startsWith('/api/media/r2/')) {
    const rawKey = value.replace('/api/media/r2/', '');
    try {
      return decodeURIComponent(rawKey);
    } catch {
      return rawKey;
    }
  }

  const fromPath = (path) => {
    const normalized = stripLeadingSlash(path);
    if (!normalized) {
      return null;
    }
    const firstSegment = normalized.split('/')[0];
    return STORAGE_KEY_PREFIXES.includes(firstSegment) ? normalized : null;
  };

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const url = new URL(value);
      if (API_HOST && url.host !== API_HOST) {
        return null;
      }
      return fromPath(url.pathname);
    } catch {
      return null;
    }
  }

  return fromPath(value);
};

const ensureProxyUrl = (input) => {
  if (!input) {
    return '';
  }

  if (input.startsWith('/api/media/r2/')) {
    return input;
  }

  const storageKey = extractStorageKey(input);
  if (storageKey) {
    return `/api/media/r2/${encodeKey(storageKey)}`;
  }

  const r2Match = input.match(/r2\.dev\/[\w-]+\/(.+)$/);
  if (r2Match && r2Match[1]) {
    return `/api/media/r2/${encodeKey(r2Match[1])}`;
  }

  return input;
};

const toAbsoluteUrl = (input) => {
  if (!input) {
    return '';
  }

  const proxied = ensureProxyUrl(input);

  if (proxied.startsWith('/api/media/r2/')) {
    return proxied;
  }

  if (proxied.startsWith('http://') || proxied.startsWith('https://')) {
    return proxied;
  }

  const normalizedPath = proxied.startsWith('/') ? proxied : `/${proxied}`;
  const absolute = `${API_BASE_URL}${normalizedPath}`;

  return ensureProxyUrl(absolute);
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
