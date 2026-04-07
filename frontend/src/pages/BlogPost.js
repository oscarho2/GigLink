import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Link,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink, Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBlogPostBySlug } from '../content/blogPosts';
import api from '../utils/api';

const renderContentBlock = (block) => {
  switch (block.type) {
    case 'heading':
      return (
        <Typography key={block.text} variant="h4" component="h2" sx={{ fontWeight: 700, mt: 2 }}>
          {block.text}
        </Typography>
      );
    case 'list':
      return (
        <Box key={block.title}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 700, mb: 1 }}>
            {block.title}
          </Typography>
          <Box component="ul" sx={{ pl: 3, m: 0 }}>
            {block.items.map((item) => (
              <Typography key={item} component="li" variant="body1" sx={{ lineHeight: 1.8, mb: 0.5 }}>
                {item}
              </Typography>
            ))}
          </Box>
        </Box>
      );
    case 'note':
      return (
        <Box
          key={block.text}
          sx={{
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            backgroundColor: 'rgba(71, 85, 105, 0.08)',
            px: 2,
            py: 1.5,
            borderRadius: 2,
          }}
        >
          <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
            {block.text}
          </Typography>
        </Box>
      );
    case 'callout':
      return (
        <Box key={block.title}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
            {block.title}
          </Typography>
          <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
            {block.text}
          </Typography>
        </Box>
      );
    case 'cta':
      return (
        <Box
          key={block.text}
          sx={{
            backgroundColor: 'rgba(71, 85, 105, 0.08)',
            borderRadius: 3,
            p: { xs: 2.5, md: 3 },
            mt: 2,
          }}
        >
          <Typography variant="h6" component="p" sx={{ fontWeight: 700, lineHeight: 1.6 }}>
            {block.text}
          </Typography>
        </Box>
      );
    case 'paragraph':
    default:
      return (
        <Typography key={block.text} variant="body1" sx={{ lineHeight: 1.8 }}>
          {block.text}
        </Typography>
      );
  }
};

const BlogPost = () => {
  const { slug } = useParams();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const post = getBlogPostBySlug(slug);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const articleSlug = post?.slug;

  useEffect(() => {
    if (!articleSlug) {
      return undefined;
    }

    let isActive = true;

    const fetchComments = async () => {
      try {
        setCommentsLoading(true);
        setCommentError('');
        const response = await api.get(`/blog-comments/${articleSlug}/comments`);

        if (isActive) {
          setComments(response.data || []);
        }
      } catch (error) {
        console.error('Error loading blog comments:', error);
        if (isActive) {
          setCommentError('Unable to load comments right now.');
        }
      } finally {
        if (isActive) {
          setCommentsLoading(false);
        }
      }
    };

    fetchComments();

    return () => {
      isActive = false;
    };
  }, [articleSlug]);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const handleCommentSubmit = async (event) => {
    event.preventDefault();

    const trimmedComment = commentText.trim();

    if (!trimmedComment || !isAuthenticated) {
      return;
    }

    try {
      setCommentSubmitting(true);
      setCommentError('');
      const response = await api.post(`/blog-comments/${post.slug}/comments`, {
        content: trimmedComment,
      });

      setComments((currentComments) => [response.data, ...currentComments]);
      setCommentText('');
    } catch (error) {
      console.error('Error posting blog comment:', error);
      setCommentError(error.response?.data?.message || 'Unable to post your comment right now.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const canDeleteComment = (comment) => {
    const currentUserId = user?.id || user?._id;
    const commentUserId = comment.user?._id || comment.user?.id;
    return Boolean(currentUserId && (currentUserId === commentUserId || user?.isAdmin));
  };

  const handleCommentDelete = async (commentId) => {
    try {
      setCommentError('');
      await api.delete(`/blog-comments/${post.slug}/comments/${commentId}`);
      setComments((currentComments) => currentComments.filter((comment) => comment._id !== commentId));
    } catch (error) {
      console.error('Error deleting blog comment:', error);
      setCommentError(error.response?.data?.message || 'Unable to delete that comment right now.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100%',
        background:
          'radial-gradient(circle at top left, rgba(71, 85, 105, 0.12), transparent 30%), linear-gradient(180deg, #edf2f7 0%, #f8fafc 100%)',
        pt: 0,
        pb: { xs: 5, md: 8 },
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={4} sx={{ pt: { xs: 4, md: 6 } }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              p: { xs: 3, md: 5 },
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
            }}
          >
            <Stack spacing={2.5}>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                alignItems="center"
                sx={{ color: 'text.secondary' }}
              >
                <Link
                  component={RouterLink}
                  to="/"
                  underline="hover"
                  color="inherit"
                  sx={{ fontWeight: 600 }}
                >
                  GigLink
                </Link>
                <Typography variant="body2">{'>>'}</Typography>
                <Link
                  component={RouterLink}
                  to="/blog"
                  underline="hover"
                  color="inherit"
                  sx={{ fontWeight: 600 }}
                >
                  Blog
                </Link>
                <Typography variant="body2">{'>>'}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {post.title}
                </Typography>
              </Stack>

              <Typography variant="h2" component="h1" sx={{ fontWeight: 700 }}>
                {post.title}
              </Typography>
            </Stack>
            <Box
              sx={{
                maxWidth: 840,
                borderRadius: 3,
              }}
            >
              <Stack spacing={2.5}>
                {post.content.map((block) => renderContentBlock(block))}
              </Stack>
            </Box>

            <Divider sx={{ my: { xs: 4, md: 5 } }} />

            <Stack spacing={3}>
              <Box>
                <Typography variant="h4" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
                  Comments
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Share your opinion.
                </Typography>
              </Box>

              {commentError && (
                <Alert severity="error">
                  {commentError}
                </Alert>
              )}

              {authLoading ? (
                <Typography variant="body2" color="text.secondary">
                  Checking your login status...
                </Typography>
              ) : isAuthenticated ? (
                <Box component="form" onSubmit={handleCommentSubmit}>
                  <Stack spacing={2}>
                    <TextField
                      label="Comment"
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      fullWidth
                      multiline
                      minRows={4}
                      helperText={`Posting as ${user?.name || 'your account'}`}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
                      disabled={!commentText.trim() || commentSubmitting}
                    >
                      {commentSubmitting ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    backgroundColor: 'rgba(248, 250, 252, 0.9)',
                  }}
                >
                  <Stack spacing={2} alignItems="flex-start">
                    <Typography variant="body2" color="text.secondary">
                      Log in to add a comment. Comments are tied to your GigLink account.
                    </Typography>
                    <Button
                      component={RouterLink}
                      to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
                      variant="contained"
                    >
                      Log In to Comment
                    </Button>
                  </Stack>
                </Paper>
              )}

              <Stack spacing={2}>
                {commentsLoading ? (
                  <Typography variant="body2" color="text.secondary">
                    Loading comments...
                  </Typography>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <Paper
                      key={comment._id}
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        backgroundColor: 'rgba(248, 250, 252, 0.9)',
                      }}
                    >
                      <Stack spacing={1}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          spacing={1}
                        >
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {comment.user?.name || 'GigLink user'}
                            </Typography>
                            {comment.createdAt && (
                              <Typography variant="caption" color="text.secondary">
                                {new Date(comment.createdAt).toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                          {canDeleteComment(comment) && (
                            <Button
                              size="small"
                              color="error"
                              onClick={() => handleCommentDelete(comment._id)}
                            >
                              Delete
                            </Button>
                          )}
                        </Stack>
                        <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                          {comment.content}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No comments yet. Be the first to add your advice.
                  </Typography>
                )}
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};

export default BlogPost;
