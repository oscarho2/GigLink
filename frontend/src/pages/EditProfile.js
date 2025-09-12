import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, TextField, Button, Grid, Chip, Autocomplete, Alert, Card, CardContent, CardActions, Divider, IconButton, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, VideoLibrary as VideoLibraryIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import GeoNamesAutocomplete from '../components/GeoNamesAutocomplete';



const EditProfile = () => {
  const { user, token, isAuthenticated, loading: authLoading } = useAuth();
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
    videos: [],
    photos: []
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newVideo, setNewVideo] = useState({ title: '', url: '', description: '' });
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
          videos: profileData.videos || [],
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
          videos: [],
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

  const handleVideoChange = (e) => {
    setNewVideo({
      ...newVideo,
      [e.target.name]: e.target.value
    });
  };

  const handleAddVideo = () => {
    if (newVideo.title && newVideo.url) {
      setFormData({
        ...formData,
        videos: [...formData.videos, { ...newVideo }]
      });
      setNewVideo({ title: '', url: '', description: '' });
      setShowAddVideo(false);
    }
  };

  const handleRemoveVideo = (index) => {
    const updatedVideos = formData.videos.filter((_, i) => i !== index);
    setFormData({ ...formData, videos: updatedVideos });
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Photo file size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      setSelectedPhoto(file);
      setError('');
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
      setSelectedAvatar(file);
      setError('');
    }
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
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSelectedAvatar(null);
      setSuccess('Profile picture updated successfully!');
      
      // Refresh the page to show the new avatar
      window.location.reload();
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
        videos: Array.isArray(formData.videos) ? formData.videos : []
      };
      
      console.log('Sending update data:', updateData);
      
      const response = await axios.put(
        'http://localhost:5001/api/profiles/me',
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
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  size="small"
                  onClick={() => setShowAddVideo(true)}
                >
                  Add Video
                </Button>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              {showAddVideo && (
                <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Add New Video
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Video Title"
                        name="title"
                        value={newVideo.title}
                        onChange={handleVideoChange}
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Video URL"
                        name="url"
                        value={newVideo.url}
                        onChange={handleVideoChange}
                        variant="outlined"
                        size="small"
                        placeholder="https://youtube.com/watch?v=..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description (Optional)"
                        name="description"
                        value={newVideo.description}
                        onChange={handleVideoChange}
                        variant="outlined"
                        size="small"
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          onClick={handleAddVideo}
                          disabled={!newVideo.title || !newVideo.url}
                        >
                          Add Video
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setShowAddVideo(false);
                            setNewVideo({ title: '', url: '', description: '' });
                          }}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Card>
              )}
              
              {formData.videos && formData.videos.length > 0 ? (
                <Grid container spacing={2}>
                  {formData.videos.map((video, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6">{video.title}</Typography>
                          <Typography variant="body2" color="text.secondary">{video.description || 'No description'}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{video.url}</Typography>
                        </CardContent>
                        <CardActions>
                          <Button size="small" href={video.url} target="_blank" rel="noreferrer">View</Button>
                          <IconButton aria-label="delete" color="error" onClick={() => handleRemoveVideo(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  You haven't added any videos yet.
                </Typography>
              )}
            </Grid>
            
            {/* Profile Picture Section */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Profile Picture</Typography>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="avatar-upload"
                      type="file"
                      onChange={handleAvatarSelect}
                    />
                    <label htmlFor="avatar-upload">
                      <Button variant="outlined" component="span" fullWidth>
                        Choose Profile Picture
                      </Button>
                    </label>
                    {selectedAvatar && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Selected: {selectedAvatar.name}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="contained"
                      onClick={handleAvatarUpload}
                      disabled={!selectedAvatar || uploadingAvatar}
                      fullWidth
                    >
                      {uploadingAvatar ? 'Uploading...' : 'Update Profile Picture'}
                    </Button>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
            
            {/* Photos Section */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Photos</Typography>
              
              {/* Photo Upload */}
              <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Add New Photo
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="photo-upload"
                      type="file"
                      onChange={handlePhotoSelect}
                    />
                    <label htmlFor="photo-upload">
                      <Button variant="outlined" component="span" fullWidth>
                        Choose Photo
                      </Button>
                    </label>
                    {selectedPhoto && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Selected: {selectedPhoto.name}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Caption (Optional)"
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={handlePhotoUpload}
                      disabled={!selectedPhoto || uploadingPhoto}
                      startIcon={<AddIcon />}
                    >
                      {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                  </Grid>
                </Grid>
              </Card>
              
              {/* Display Photos */}
              {formData.photos && formData.photos.length > 0 ? (
                <Grid container spacing={2}>
                  {formData.photos.map((photo, index) => (
                    <Grid item xs={12} sm={6} md={4} key={photo._id || index}>
                      <Card>
                        <Box
                          component="img"
                          src={`http://localhost:5001${photo.url}`}
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
    </Container>
  );
};

export default EditProfile;