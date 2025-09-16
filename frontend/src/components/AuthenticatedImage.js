import React, { useState, useEffect, useCallback, memo } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const AuthenticatedImage = ({ src, alt, sx, onClick, onLoad, ...props }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    const fetchImage = async () => {
      if (!src || !token) {
        setLoading(false);
        setError(true);
        return;
      }

      try {
        setLoading(true);
        setError(false);

        const response = await fetch(src, {
          headers: {
            'x-auth-token': token,
          },
        });

        if (response.ok) {
          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);
          setImageSrc(imageUrl);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error loading authenticated image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();

    // Cleanup function to revoke object URL
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, token]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 100,
          ...sx,
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error || !imageSrc) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 100,
          backgroundColor: '#f5f5f5',
          color: '#666',
          borderRadius: 1,
          ...sx,
        }}
      >
        Failed to load image
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={imageSrc}
      alt={alt}
      sx={sx}
      onClick={onClick}
      onLoad={onLoad}
      {...props}
    />
  );
};

export default memo(AuthenticatedImage);