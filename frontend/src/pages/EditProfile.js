import React, { useState, useEffect, useRef } from 'react';
import { Container, Typography, Box, Paper, TextField, Button, Grid, Chip, Autocomplete, Alert, Card, CardContent, CardActions, Divider, IconButton, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, PhotoCamera } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import GeoNamesAutocomplete from '../components/GeoNamesAutocomplete';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';



const EditProfile = () => {
  const { user, token, isAuthenticated, loading: authLoading, updateAvatar } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/edit-profile');
    }
  }, [isAuthenticated, authLoading, navigate]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  
  // Predefined options for instruments and genres
  const instrumentOptions = ["Guitar", "Piano", "Drums", "Violin", "Saxophone", "Bass", "Vocals", "Trumpet", "Flute", "Cello", "Clarinet", "Trombone", "Harp", "Banjo", "Mandolin", "Accordion", "Harmonica", "Ukulele", "DJ Equipment", "Synthesizer"];
  const genreOptions = ["Rock", "Jazz", "Classical", "Pop", "Electronic", "Hip Hop", "R&B", "Folk", "Country", "Blues", "Reggae", "Punk", "Metal", "Alternative", "Indie", "Funk", "Soul", "Gospel", "Latin", "World Music"];
  
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    bio: '',
    isMusician: '',
    instruments: [],
    genres: [],

    photos: []
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);



  // Normalize incoming values to match options (case-insensitive match to use canonical option labels)
  const normalizeValuesToOptions = (values, options) => {
    if (!Array.isArray(values)) return [];
    return values
      .map(v => {
        const str = String(v).trim();
        const match = options.find(opt => opt.toLowerCase() === str.toLowerCase());
        return match || str;
      })
      .filter(Boolean);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !(user._id || user.id)) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch profile data from backend
        const profileRes = await axios.get('/api/profiles/me', {
          headers: { 'x-auth-token': token }
        });
        const profileData = profileRes.data;
        setProfile(profileData);
        
        // Decide source arrays
        const sourceInstruments = (profileData.user?.instruments && profileData.user.instruments.length > 0)
          ? profileData.user.instruments
          : (profileData.skills || []);
        const sourceGenres = profileData.user?.genres || [];

        // Normalize to match Autocomplete options so chips render selected
        const normalizedInstruments = normalizeValuesToOptions(sourceInstruments, instrumentOptions);
        const normalizedGenres = normalizeValuesToOptions(sourceGenres, genreOptions);
        
        // Set form data with fetched profile data (no forced casing)
        setFormData({
          name: profileData.user?.name || user?.name || '',
          location: (profileData.user?.location && profileData.user.location.trim()) || '',
          bio: (profileData.bio && profileData.bio.trim() && profileData.bio !== 'No bio available') ? profileData.bio : '',
          isMusician: profileData.user?.isMusician || user?.isMusician || (normalizedInstruments.length > 0 || normalizedGenres.length > 0 ? 'yes' : 'no'),
          instruments: normalizedInstruments,
          genres: normalizedGenres,
    
          photos: profileData.photos || []
        });
      } catch (err) {
        console.error('Error fetching profile:', err);
        // Fallback to user data if profile fetch fails
        const fallbackInstruments = normalizeValuesToOptions(user?.instruments || [], instrumentOptions);
        const fallbackGenres = normalizeValuesToOptions(user?.genres || [], genreOptions);
        setFormData({
          name: user?.name || '',
          location: (user?.location && user.location.trim()) || '',
          bio: '',
          isMusician: user?.isMusician || (fallbackInstruments.length > 0 || fallbackGenres.length > 0 ? 'yes' : 'no'),
          instruments: fallbackInstruments,
          genres: fallbackGenres,
    
          photos: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleInstrumentsChange = (event, newValue) => {
    setFormData({ ...formData, instruments: newValue });
  };

  const handleGenresChange = (event, newValue) => {
    setFormData({ ...formData, genres: newValue });
  };

  const handleLocationChange = (event, newValue) => {
    setFormData({ ...formData, location: newValue || '' });
  };

  const handleMusicianChange = (event) => {
    const isMusician = event.target.value;
    setFormData({ 
      ...formData, 
      isMusician,
      // Clear instruments and genres if not a musician
      instruments: isMusician === 'no' ? [] : formData.instruments,
      genres: isMusician === 'no' ? [] : formData.genres
    });
  };



  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Validate each file
      for (let file of files) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          setError('Each photo file size must be less than 5MB');
          return;
        }
        if (!file.type.startsWith('image/')) {
          setError('Please select valid image files only');
          return;
        }
      }
      
      if (files.length === 1) {
        setSelectedPhoto(files[0]);
        setSelectedPhotos([]);
      } else {
        setSelectedPhotos(files);
        setSelectedPhoto(null);
      }
      setError('');
    }
  };

  const handleMultiplePhotoUpload = async () => {
    if (selectedPhotos.length === 0) return;
    
    setUploadingPhoto(true);
    setError('');
    
    try {
      const uploadPromises = selectedPhotos.map(async (photo) => {
        const formDataUpload = new FormData();
        formDataUpload.append('photo', photo);
        formDataUpload.append('caption', photoCaption);
        
        return axios.post('/api/profiles/photos', formDataUpload, {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'multipart/form-data'
          }
        });
      });
      
      const responses = await Promise.all(uploadPromises);
      
      // Add all new photos to the formData
      const newPhotos = responses.map(response => response.data.photo);
      setFormData({
        ...formData,
        photos: [...formData.photos, ...newPhotos]
      });
      
      setSelectedPhotos([]);
      setPhotoCaption('');
      setSuccess(`${selectedPhotos.length} photos uploaded successfully!`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error uploading photos');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedPhoto) return;
    
    setUploadingPhoto(true);
    setError('');
    
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('photo', selectedPhoto);
      formDataUpload.append('caption', photoCaption);
      
      const response = await axios.post('/api/profiles/photos', formDataUpload, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Add the new photo to the formData
      setFormData({
        ...formData,
        photos: [...formData.photos, response.data.photo]
      });
      
      setSelectedPhoto(null);
      setPhotoCaption('');
      setSuccess('Photo uploaded successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Error uploading photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async (photoId, index) => {
    try {
      await axios.delete(`/api/profiles/photos/${photoId}`, {
        headers: { 'x-auth-token': token }
      });
      
      const updatedPhotos = formData.photos.filter((_, i) => i !== index);
      setFormData({ ...formData, photos: updatedPhotos });
      setSuccess('Photo removed successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Error removing photo');
    }
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Avatar file size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  function centerCrop(mediaWidth, mediaHeight, aspect) {
    const mediaAspect = mediaWidth / mediaHeight;
    let crop = { x: 0, y: 0, width: 0, height: 0, unit: 'px' };

    if (mediaAspect > aspect) {
        crop.width = mediaHeight * aspect;
        crop.height = mediaHeight;
        crop.x = (mediaWidth - crop.width) / 2;
        crop.y = 0;
    } else {
        crop.width = mediaWidth;
        crop.height = mediaWidth / aspect;
        crop.x = 0;
        crop.y = (mediaHeight - crop.height) / 2;
    }
    return crop;
  }

  function onImageLoad(e) {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    const newCrop = centerCrop(width, height, 1);
    setCrop(newCrop);
    setCompletedCrop(newCrop);
  }

  const handleCropComplete = (crop) => {
    setCompletedCrop(crop);
  };

  const handleCropChange = (crop) => {
    setCrop(crop);
  };

  const getCroppedImg = (image, crop) => {
    console.log('getCroppedImg called', { image, crop });
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('Cropped image blob created:', blob);
          resolve(blob);
        } else {
          console.error('Canvas to Blob conversion failed');
          resolve(null);
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const handleCropConfirm = async () => {
    console.log('handleCropConfirm called', { completedCrop, imgRef });

    if (!imgRef.current) {
        console.error("Image ref is not set!");
        setError("An error occurred while cropping. Please try again.");
        return;
    }

    if (!completedCrop || !completedCrop.width || !completedCrop.height) {
        console.error("Crop dimensions are not valid!", completedCrop);
        setError("Please make a selection on the image to crop.");
        return;
    }

    setUploadingAvatar(true);
      
      try {
        const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
        console.log('croppedImageBlob in handleCropConfirm:', croppedImageBlob);
        if (!croppedImageBlob) {
          setError('Could not crop image. Please try again.');
          setUploadingAvatar(false);
          return;
        }
        const formDataUpload = new FormData();
        formDataUpload.append('avatar', croppedImageBlob, 'avatar.jpg');
        
        // Use token from AuthContext to avoid null/invalid localStorage values
        const response = await axios.put('/api/profiles/avatar', formDataUpload, {
          headers: {
            // Let the browser set the correct multipart boundary automatically
            'x-auth-token': token
          }
        });
        
        console.log('Avatar upload response:', response);
        if (response.data.avatar) {
          setSuccess('Profile picture updated successfully!');
          setShowCropModal(false);
          setImageToCrop(null);
          setCompletedCrop(null);
          // Update the form/profile preview locally
          setFormData(prev => ({ ...prev, avatar: response.data.avatar }));
          setProfile(prev => prev ? { ...prev, user: { ...prev.user, avatar: response.data.avatar, profilePicture: response.data.avatar } } : prev);
          updateAvatar(response.data.avatar);
        }
      } catch (error) {
        console.error('Avatar upload error:', error?.response?.status, error?.response?.data || error);
        setError('Failed to update profile picture. Please try again.');
      } finally {
        setUploadingAvatar(false);
      }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageToCrop(null);
    setCompletedCrop(null);
  };

  const handleAvatarUpload = async () => {
    if (!selectedAvatar) return;
    
    setUploadingAvatar(true);
    setError('');
    
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('avatar', selectedAvatar);
      
      const response = await axios.put('/api/profiles/avatar', formDataUpload, {
        headers: {
          // Let the browser set the correct multipart boundary automatically
          'x-auth-token': token
        }
      });
      
      setSelectedAvatar(null);
      setSuccess('Profile picture updated successfully!');
      if (response.data?.avatar) {
        updateAvatar(response.data.avatar);
        setProfile(prev => prev ? { ...prev, user: { ...prev.user, avatar: response.data.avatar, profilePicture: response.data.avatar } } : prev);
      }
      
      // No page reload; the UI should reflect changes immediately via state and context updates
      // ...
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    console.log('handleSubmit called');
    console.log('Form data before transformation:', formData);
    
    // Validation: If user is a musician, they must select at least one instrument and one genre
    if (formData.isMusician === 'yes') {
      if (!formData.instruments || formData.instruments.length === 0) {
        setError('Musicians must select at least one instrument.');
        return;
      }
      if (!formData.genres || formData.genres.length === 0) {
        setError('Musicians must select at least one genre.');
        return;
      }
    }
    
    try {
      // Transform form data to match backend expectations
      const updateData = {
        name: formData.name,
        bio: formData.bio,
        skills: Array.isArray(formData.instruments) ? formData.instruments : [],
  
        location: formData.location,
        isMusician: formData.isMusician,
        instruments: Array.isArray(formData.instruments) ? formData.instruments : [],
        genres: Array.isArray(formData.genres) ? formData.genres : [],

      };
      
      console.log('Sending update data:', updateData);
      
      const response = await axios.put(
        '/api/profiles/me',
        updateData,
        {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data) {
        setSuccess('Profile updated successfully!');
        console.log('Profile updated:', response.data);
        // Redirect to user's specific profile page after 2 seconds
        setTimeout(() => {
          navigate(`/profile/${user._id || user.id}`);
        }, 2000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Error config:', error.config);
      setError(`Failed to update profile: Status ${error.response?.status || 'Unknown'} - ${error.response?.data?.message || error.message}`);
    }
  };

  if (authLoading || loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Edit Profile</Typography>
      


      <Paper elevation={3} sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            {/* Profile Picture Section - Moved to Top */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Profile Picture</Typography>
              <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3} alignItems="center">
                  {/* Preview Section */}
                  <Grid item xs={12} sm={4}>
                    <Box
                      sx={{
                        width: 120,
                        height: 120,
                        borderRadius: '50%',
                        border: '3px solid #e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        mx: 'auto',
                        bgcolor: '#f5f5f5',
                        position: 'relative'
                      }}
                    >
                      {selectedAvatar ? (
                        <Box
                          component="img"
                          src={URL.createObjectURL(selectedAvatar)}
                          alt="Profile preview"
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (profile?.user?.avatar || profile?.user?.profilePicture) ? (
                        <Box
                          component="img"
                          src={profile.user.avatar || profile.user.profilePicture}
                          alt="Current profile picture"
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                          No Image
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                      {selectedAvatar ? 'Preview' : 'Current'}
                    </Typography>
                  </Grid>
                  
                  {/* Upload Controls */}
                  <Grid item xs={12} sm={8}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <input
                          accept="image/*"
                          style={{ display: 'none' }}
                          id="avatar-upload"
                          type="file"
                          onChange={handleAvatarSelect}
                        />
                        <label htmlFor="avatar-upload">
                          <Button 
                            variant="outlined" 
                            component="span" 
                            fullWidth
                            sx={{ mb: 1 }}
                          >
                            Choose New Picture
                          </Button>
                        </label>
                      </Grid>
                      
                      {selectedAvatar && (
                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                            Selected: {selectedAvatar.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="contained"
                              onClick={handleAvatarUpload}
                              disabled={uploadingAvatar}
                              sx={{ flex: 1 }}
                            >
                              {uploadingAvatar ? 'Uploading...' : 'Upload Picture'}
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={() => setSelectedAvatar(null)}
                              disabled={uploadingAvatar}
                            >
                              Cancel
                            </Button>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <GeoNamesAutocomplete
                value={formData.location}
                onChange={(location) => {
                  setFormData({ ...formData, location });
                }}
                placeholder="Enter your location"
                style={{
                  width: '100%'
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bio"
                name="bio"
                multiline
                rows={4}
                value={formData.bio}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Are you a musician?</FormLabel>
                <RadioGroup
                  row
                  value={formData.isMusician}
                  onChange={handleMusicianChange}
                >
                  <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                  <FormControlLabel value="no" control={<Radio />} label="No" />
                </RadioGroup>
              </FormControl>
            </Grid>
            
            {formData.isMusician === 'yes' && (
              <>
                {/* Skills Section */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Skills</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={instrumentOptions}
                    value={formData.instruments}
                    onChange={handleInstrumentsChange}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        label="Instruments"
                        placeholder="Add instruments"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={genreOptions}
                    value={formData.genres}
                    onChange={handleGenresChange}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        label="Genres"
                        placeholder="Add genres"
                      />
                    )}
                  />
                </Grid>
              </>
            )}
            

            {/* Media Section */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Media</Typography>
              
              {/* Media Upload */}
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 3, 
                  mb: 2, 
                  border: '2px dashed #e2e8f0',
                  borderRadius: 2,
                  textAlign: 'center',
                  bgcolor: '#f8fafc',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: '#1a365d',
                    bgcolor: '#f1f5f9'
                  }
                }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                  id="media-upload"
                />
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
                  <label htmlFor="media-upload">
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={<AddIcon />}
                      sx={{
                        bgcolor: '#1a365d',
                        '&:hover': { bgcolor: '#2c5282' }
                      }}
                    >
                      Add Photo
                    </Button>
                  </label>
                </Box>
                
                {(!selectedPhoto && selectedPhotos.length === 0) && (
                  <Typography variant="body2" color="text.secondary">
                    Upload photos
                  </Typography>
                )}
                
                {(selectedPhoto || selectedPhotos.length > 0) && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#1a365d' }}>
                      Selected Files:
                    </Typography>
                    {selectedPhoto && (
                      <Chip
                        label={selectedPhoto.name}
                        onDelete={() => setSelectedPhoto(null)}
                        sx={{ 
                          mr: 1, 
                          mb: 1,
                          bgcolor: '#e2e8f0',
                          '& .MuiChip-deleteIcon': {
                            color: '#718096',
                            '&:hover': { color: '#1a365d' }
                          }
                        }}
                      />
                    )}
                    {selectedPhotos.map((file, index) => (
                      <Chip
                        key={index}
                        label={file.name}
                        onDelete={() => setSelectedPhotos(prev => prev.filter((_, i) => i !== index))}
                        sx={{ 
                          mr: 1, 
                          mb: 1,
                          bgcolor: '#e2e8f0',
                          '& .MuiChip-deleteIcon': {
                            color: '#718096',
                            '&:hover': { color: '#1a365d' }
                          }
                        }}
                      />
                    ))}
                    <Box sx={{ mt: 2 }}>
                      <TextField
                        fullWidth
                        label="Caption (Optional)"
                        value={photoCaption}
                        onChange={(e) => setPhotoCaption(e.target.value)}
                        variant="outlined"
                        size="small"
                        sx={{ mb: 2 }}
                      />
                      <Button
                        variant="contained"
                        onClick={selectedPhotos.length > 0 ? handleMultiplePhotoUpload : handlePhotoUpload}
                        disabled={uploadingPhoto}
                        startIcon={<AddIcon />}
                        fullWidth
                        sx={{
                          bgcolor: '#1a365d',
                          '&:hover': { bgcolor: '#2c5282' }
                        }}
                      >
                        {uploadingPhoto ? 'Uploading...' : 
                          selectedPhotos.length > 0 ? `Upload ${selectedPhotos.length} Files` : 'Upload File'
                        }
                      </Button>
                    </Box>
                  </Box>
                )}
              </Paper>
              
              {/* Display Photos */}
              {formData.photos && formData.photos.length > 0 ? (
                <Grid container spacing={2}>
                  {formData.photos.map((photo, index) => (
                    <Grid item xs={12} sm={6} md={4} key={photo._id || index}>
                      <Card>
                        <Box
                          component="img"
                          src={photo.url}
                          alt={photo.caption || 'Profile photo'}
                          sx={{
                            width: '100%',
                            height: 200,
                            objectFit: 'cover'
                          }}
                        />
                        <CardContent>
                          {photo.caption && (
                            <Typography variant="body2" color="text.secondary">
                              {photo.caption}
                            </Typography>
                          )}
                        </CardContent>
                        <CardActions>
                          <IconButton
                            aria-label="delete"
                            color="error"
                            onClick={() => handleRemovePhoto(photo._id, index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  You haven't added any photos yet.
                </Typography>
              )}
            </Grid>
            
            {/* Video Section */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Videos</Typography>
              
              {/* YouTube Video Link */}
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 3, 
                  mb: 2, 
                  border: '2px dashed #e2e8f0',
                  borderRadius: 2,
                  bgcolor: '#f8fafc',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: '#1a365d',
                    bgcolor: '#f1f5f9'
                  }
                }}
              >
                <Typography variant="subtitle1" sx={{ mb: 2, color: '#1a365d', fontWeight: 600 }}>
                  Add YouTube Video
                </Typography>
                <TextField
                  fullWidth
                  label="YouTube Video URL"
                  placeholder="https://www.youtube.com/watch?v=..."
                  variant="outlined"
                  size="small"
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  sx={{
                    bgcolor: '#1a365d',
                    '&:hover': { bgcolor: '#2c5282' }
                  }}
                >
                  Add Video
                </Button>
              </Paper>
              
              {/* Display Videos */}
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                You haven't added any videos yet.
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                sx={{ mt: 3, mb: 2 }}
              >
                Save Changes
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      
      {/* Image Crop Modal */}
      <Dialog
        open={showCropModal}
        onClose={handleCropCancel}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Crop Your Profile Picture</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            {imageToCrop && (
              <ReactCrop
                  crop={crop}
                  onChange={handleCropChange}
                  onComplete={handleCropComplete}
                  circularCrop
                  keepSelection={true}
                  aspect={1}
                >
                <img
                  ref={imgRef}
                  src={imageToCrop}
                  onLoad={onImageLoad}
                  alt="Crop preview"
                  style={{ maxWidth: '100%', maxHeight: '400px' }}
                />
              </ReactCrop>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCropCancel} color="secondary">
            Cancel
          </Button>
          <Button 
            onClick={handleCropConfirm} 
            color="primary" 
            variant="contained"
            disabled={!completedCrop || uploadingAvatar}
          >
            {uploadingAvatar ? 'Uploading...' : 'Confirm & Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EditProfile;