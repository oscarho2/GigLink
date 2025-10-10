import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  IconButton,
  Avatar,
  Chip,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Button,
  Collapse,
  Menu,
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Comment as CommentIcon,
  Send as SendIcon,
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import AuthContext from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import MentionRenderer from '../components/MentionRenderer';
import MentionInput from '../components/MentionInput';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // Added
import ExpandLessIcon from '@mui/icons-material/ExpandLess'; // Added

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [replyTexts, setReplyTexts] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  const [replyMenuAnchor, setReplyMenuAnchor] = useState(null);
  const [selectedReply, setSelectedReply] = useState(null);
  const [selectedCommentForReply, setSelectedCommentForReply] = useState(null);

  const [expandedTags, setExpandedTags] = useState(false); // Added

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/posts/${postId}`, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const postData = await response.json();
        setPost(postData);
      } else if (response.status === 404) {
        setError('Post not found');
      } else {
        setError('Failed to load post');
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const toggleTags = () => { // Added
    setExpandedTags(prev => !prev); // Added
  }; // Added

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('Failed to update like');
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;

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
        setPost(updatedPost);
        setCommentText('');
        toast.success('Comment added successfully!');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleCommentLike = async (commentId) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}/like`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('Failed to update comment like');
    }
  };

  const handleReply = async (commentId) => {
    const replyText = replyTexts[commentId];
    if (!replyText?.trim()) return;

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ content: replyText })
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
        setReplyingTo(null);
        toast.success('Reply added successfully!');
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  const handleReplyLike = async (commentId, replyId) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}/replies/${replyId}/like`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error liking reply:', error);
      toast.error('Failed to update reply like');
    }
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          variant="outlined"
        >
          Go Back
        </Button>
      </Container>
    );
  }

  if (!post) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="info">Post not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back
      </Button>

      <Card>
        <CardContent>
          {/* Post Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <UserAvatar
              user={post.author}
              size={40}
              sx={{ mr: 2 }}
            />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="div">
                {post.author.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </Typography>
            </Box>
          </Box>

          {/* Post Content */}
          {post.content && (
            <Typography variant="body1" component="div" sx={{ mb: 2 }}>
              <MentionRenderer 
                content={post.parsedContent || post.content}
                mentions={post.mentions || []}
                variant="link"
              />
            </Typography>
          )}

          {/* Post Media */}
          {post.media && post.media.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {post.media.map((mediaItem, index) => (
                <Box key={index} sx={{ mb: 1 }}>
                  {mediaItem.type === 'image' ? (
                    <img
                      src={mediaItem.url}
                      alt="Post media"
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '450px', // Increased by 50%
                        maxWidth: '600px', // Increased by 50%
                        objectFit: 'contain',
                        borderRadius: '8px',
                        display: 'block', // Centering
                        margin: '0 auto' // Centering
                      }}
                    />
                  ) : (
                    <video
                      src={mediaItem.url}
                      controls
                      style={{
                        width: '100%',
                        maxHeight: '400px',
                        borderRadius: '8px'
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          )}


        </CardContent>

        <CardActions disableSpacing>
          <IconButton
            onClick={handleLike}
            color={post.isLikedByUser ? "error" : "default"}
          >
            {post.isLikedByUser ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {post.likesCount}
          </Typography>
          
          <IconButton>
            <CommentIcon />
          </IconButton>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {post.commentsCount}
          </Typography>

          {(post.instruments?.length > 0 || post.genres?.length > 0) && (
            <IconButton
              onClick={toggleTags}
              aria-expanded={expandedTags}
              aria-label="show tags"
            >
              {expandedTags ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </CardActions>

        <Collapse in={expandedTags} timeout="auto" unmountOnExit>
          <CardContent>
            {post.instruments?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Instruments:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {post.instruments.map((instrument, index) => (
                    <Chip
                      key={`instrument-${index}`}
                      label={instrument}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {post.genres?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Genres:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {post.genres.map((genre, index) => (
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
              </Box>
            )}
          </CardContent>
        </Collapse>

        {/* Comments Section */}
        <CardContent>
          {/* Comment Input */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <UserAvatar
              user={user}
              size={32}
              sx={{ mr: 1 }}
            />
            <MentionInput
              fullWidth
              size="small"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleComment();
                }
              }}
            />
            <IconButton
              onClick={handleComment}
              disabled={!commentText.trim()}
            >
              <SendIcon />
            </IconButton>
          </Box>

          {/* Comments List */}
          {post.comments && post.comments.length > 0 && (
            <List>
              {post.comments
                .sort((a, b) => {
                  if (a.pinned && !b.pinned) return -1;
                  if (!a.pinned && b.pinned) return 1;
                  return new Date(a.createdAt) - new Date(b.createdAt);
                })
                .map((comment) => (
                  <ListItem key={comment._id} alignItems="flex-start" sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <UserAvatar
                        user={comment.user}
                        size={32}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">
                            {comment.user.name}
                          </Typography>
                          {comment.pinned && (
                            <Chip
                              label="Pinned"
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body1" component="div" sx={{ mt: 0.5 }}>
                            <MentionRenderer 
                              content={comment.parsedContent || comment.content}
                              mentions={comment.mentions || []}
                              variant="link"
                            />
                          </Typography>
                          
                          {/* Comment Actions */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleCommentLike(comment._id)}
                              color={comment.isLikedByUser ? "error" : "default"}
                            >
                              {comment.isLikedByUser ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                            </IconButton>
                            <Typography variant="caption">
                              {comment.likesCount}
                            </Typography>
                            
                            <IconButton
                              size="small"
                              onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                            >
                              <ReplyIcon fontSize="small" />
                            </IconButton>
                            <Typography variant="caption">
                              Reply
                            </Typography>
                            
                            {comment.replies?.length > 0 && (
                              <Button
                                size="small"
                                onClick={() => toggleReplies(comment._id)}
                                sx={{ ml: 1 }}
                              >
                                {expandedReplies[comment._id] ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                              </Button>
                            )}
                          </Box>

                          {/* Reply Input */}
                          <Collapse in={replyingTo === comment._id} timeout="auto" unmountOnExit>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, ml: 4 }}>
                              <UserAvatar
                                user={user}
                                size={24}
                                sx={{ mr: 1 }}
                              />
                              <MentionInput
                                fullWidth
                                size="small"
                                placeholder="Write a reply..."
                                value={replyTexts[comment._id] || ''}
                                onChange={(e) => setReplyTexts(prev => ({
                                  ...prev,
                                  [comment._id]: e.target.value
                                }))}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleReply(comment._id);
                                  }
                                }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleReply(comment._id)}
                                disabled={!replyTexts[comment._id]?.trim()}
                              >
                                <SendIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Collapse>

                          {/* Replies */}
                          <Collapse in={expandedReplies[comment._id]} timeout="auto" unmountOnExit>
                            <Box sx={{ ml: 4, mt: 2 }}>
                              {comment.replies?.map((reply) => (
                                <Box key={reply._id} sx={{ display: 'flex', mb: 2 }}>
                                  <UserAvatar
                                    user={reply.user}
                                    size={24}
                                    sx={{ mr: 1 }}
                                  />
                                  <Box sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="caption" fontWeight="bold">
                                        {reply.user.name}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                      </Typography>
                                    </Box>
                                    <Typography variant="body1">
                                      {reply.content}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleReplyLike(comment._id, reply._id)}
                                        color={reply.isLikedByUser ? "error" : "default"}
                                      >
                                        {reply.isLikedByUser ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                                      </IconButton>
                                      <Typography variant="caption">
                                        {reply.likesCount}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          </Collapse>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default PostDetail;