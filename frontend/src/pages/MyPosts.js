import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Avatar,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Autocomplete
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Comment as CommentIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import MentionInput from '../components/MentionInput';

const MyPosts = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentTexts, setCommentTexts] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);

  // Predefined options for instruments and genres
  const instrumentOptions = [
    'Guitar', 'Bass', 'Drums', 'Piano', 'Keyboard', 'Violin', 'Saxophone', 
    'Trumpet', 'Flute', 'Clarinet', 'Cello', 'Vocals', 'Harmonica', 
    'Banjo', 'Mandolin', 'Ukulele', 'Accordion', 'Harp', 'Trombone', 'Tuba'
  ];

  const genreOptions = [
    'Rock', 'Pop', 'Jazz', 'Blues', 'Country', 'Folk', 'Classical', 
    'Electronic', 'Hip Hop', 'R&B', 'Reggae', 'Punk', 'Metal', 
    'Alternative', 'Indie', 'Funk', 'Soul', 'Gospel', 'World', 'Experimental'
  ];

  useEffect(() => {
    fetchMyPosts();
  }, []);

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/posts', {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter to show only current user's posts
        const myPosts = data.filter(post => post.author._id === user?.id);
        setPosts(myPosts);
      } else {
        throw new Error('Failed to fetch posts');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load your posts');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitPost = async (e) => {
    if (e) e.preventDefault();
    
    if (!postContent.trim() && selectedFiles.length === 0) {
      toast.error('Please add some content or media to your post');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('content', postContent);
      formData.append('instruments', JSON.stringify(selectedInstruments));
      formData.append('genres', JSON.stringify(selectedGenres));
      
      selectedFiles.forEach(file => {
        formData.append('media', file);
      });

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'x-auth-token': token
        },
        body: formData
      });

      if (response.ok) {
        const newPost = await response.json();
        setPosts(prev => [newPost, ...prev]);
        setPostContent('');
        setSelectedFiles([]);
        setSelectedInstruments([]);
        setSelectedGenres([]);
        setCreatePostModalOpen(false);
        toast.success('Post created successfully!');
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId, isLiked) => {
    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/posts/${postId}/like`, {
        method,
        headers: {
          'x-auth-token': token
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(prev => prev.map(post => 
          post._id === postId ? updatedPost : post
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleComment = async (postId) => {
    const commentText = commentTexts[postId];
    if (!commentText?.trim()) return;

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ content: commentText })
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(prev => prev.map(post => 
          post._id === postId ? updatedPost : post
        ));
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;

    try {
      const response = await fetch(`/api/posts/${postToDelete}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token
        }
      });

      if (response.ok) {
        setPosts(prev => prev.filter(post => post._id !== postToDelete));
        toast.success('Post deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const renderMedia = (media) => {
    return (
      <Grid container spacing={1} sx={{ mt: 1 }}>
        {media.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            {item.type === 'image' ? (
              <img
                src={`http://localhost:5001${item.url}`}
                alt="Post media"
                style={{
                  width: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            ) : (
              <video
                controls
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  maxHeight: '400px'
                }}
              >
                <source src={`http://localhost:5001${item.url}`} />
                Your browser does not support the video tag.
              </video>
            )}
          </Grid>
        ))}
      </Grid>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/community')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          My Posts
        </Typography>
      </Box>

      {/* Create Post Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreatePostModalOpen(true)}
          size="large"
        >
          Create a Post
        </Button>
      </Box>

      {/* Create Post Modal */}
      <Dialog
        open={createPostModalOpen}
        onClose={() => setCreatePostModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create a Post</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmitPost} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="What's on your mind?"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              variant="outlined"
              sx={{ mb: 3 }}
            />
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  options={instrumentOptions}
                  value={selectedInstruments}
                  onChange={(event, newValue) => setSelectedInstruments(newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip key={index} variant="outlined" label={option} {...getTagProps({ index })} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Instruments"
                      placeholder="Select instruments"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  options={genreOptions}
                  value={selectedGenres}
                  onChange={(event, newValue) => setSelectedGenres(newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip key={index} variant="outlined" label={option} {...getTagProps({ index })} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Genres"
                      placeholder="Select genres"
                    />
                  )}
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mb: 3 }}>
              <input
                accept="image/*,video/*"
                style={{ display: 'none' }}
                id="media-upload"
                multiple
                type="file"
                onChange={handleFileSelect}
              />
              <label htmlFor="media-upload">
                <Button variant="outlined" component="span">
                  Add Photos/Videos
                </Button>
              </label>
              
              {selectedFiles.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {selectedFiles.map((file, index) => (
                    <Chip
                      key={index}
                      label={file.name}
                      onDelete={() => removeFile(index)}
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePostModalOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitPost}
            variant="contained"
            disabled={submitting || (!postContent.trim() && selectedFiles.length === 0)}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? 'Posting...' : 'Post'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <Alert severity="info">
          You haven't created any posts yet. Create your first post to share with the community!
        </Alert>
      ) : (
        posts.map((post) => (
          <Card key={post._id} sx={{ mb: 3 }}>
            <CardHeader
              avatar={
                <Avatar src={post.author.avatar} alt={post.author.name}>
                  {post.author.name?.charAt(0)}
                </Avatar>
              }
              title={post.author.name}
              subheader={formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              action={
                <IconButton
                  onClick={() => {
                    setPostToDelete(post._id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              }
            />
            
            <CardContent>
              <Typography variant="body1" component="p">
                {post.content}
              </Typography>
              
              {post.media && post.media.length > 0 && renderMedia(post.media)}
              
              {/* Display tags */}
              {(post.instruments?.length > 0 || post.genres?.length > 0) && (
                <Box sx={{ mt: 2 }}>
                  {post.instruments?.map((instrument, index) => (
                    <Chip
                      key={`instrument-${index}`}
                      label={instrument}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                  {post.genres?.map((genre, index) => (
                    <Chip
                      key={`genre-${index}`}
                      label={genre}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              )}
            </CardContent>

            <CardActions disableSpacing>
              <IconButton
                onClick={() => handleLike(post._id, post.isLikedByUser)}
                color={post.isLikedByUser ? "error" : "default"}
              >
                {post.isLikedByUser ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              </IconButton>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {post.likesCount}
              </Typography>
              
              <IconButton onClick={() => toggleComments(post._id)}>
                <CommentIcon />
              </IconButton>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {post.commentsCount}
              </Typography>
            </CardActions>

            <Collapse in={expandedComments[post._id]} timeout="auto" unmountOnExit>
              <CardContent>
                {/* Comment Input */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    src={user?.avatar}
                    alt={user?.name}
                    sx={{ mr: 1, width: 32, height: 32 }}
                  >
                    {user?.name?.charAt(0)}
                  </Avatar>
                  <MentionInput
                    fullWidth
                    size="small"
                    placeholder="Write a comment..."
                    value={commentTexts[post._id] || ''}
                    onChange={(e) => setCommentTexts(prev => ({
                      ...prev,
                      [post._id]: e.target.value
                    }))}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleComment(post._id);
                      }
                    }}
                  />
                  <IconButton
                    onClick={() => handleComment(post._id)}
                    disabled={!commentTexts[post._id]?.trim()}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>

                {/* Comments List */}
                {post.comments && post.comments.length > 0 && (
                  <List>
                    {post.comments.map((comment) => (
                      <ListItem key={comment._id} alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar
                            src={comment.user.avatar}
                            alt={comment.user.name}
                            sx={{ width: 32, height: 32 }}
                          >
                            {comment.user.name?.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2">
                                {comment.user.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </Typography>
                            </Box>
                          }
                          secondary={comment.content}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Collapse>
          </Card>
        ))
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Post</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this post? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeletePost} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyPosts;