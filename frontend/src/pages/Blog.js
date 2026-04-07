import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { blogPosts } from '../content/blogPosts';

const latestPosts = blogPosts.slice(0, 3);

const Blog = () => {
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
      <Box
        sx={{
          width: '100%',
          minHeight: { xs: 280, md: 440 },
          overflow: 'hidden',
          position: 'relative',
          background:
            'linear-gradient(135deg, rgba(148, 163, 184, 0.22), rgba(226, 232, 240, 0.9))',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            minHeight: { xs: 280, md: 440 },
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': {
              height: 8,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(100, 116, 139, 0.45)',
              borderRadius: 999,
            },
          }}
        >
          {blogPosts.length > 0 ? (
            blogPosts.map((post) => (
              <Box
                key={`hero-${post.id}`}
                component={RouterLink}
                to={`/blog/${post.slug}`}
                sx={{
                  textDecoration: 'none',
                  width: '100%',
                  minWidth: '100%',
                  minHeight: { xs: 280, md: 440 },
                  scrollSnapAlign: 'start',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'flex-end',
                  background: post.image
                    ? `linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.55)), url(${post.image}) center/cover no-repeat`
                    : 'linear-gradient(135deg, rgba(148, 163, 184, 0.22), rgba(226, 232, 240, 0.9))',
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    p: { xs: 3, md: 4 },
                    background: 'linear-gradient(180deg, transparent, rgba(15, 23, 42, 0.72))',
                    color: post.image ? 'common.white' : 'text.primary',
                  }}
                >
                  <Stack spacing={0}>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {post.title}
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            ))
          ) : (
            <Box
              sx={{
                width: '100%',
                minWidth: '100%',
                minHeight: { xs: 280, md: 440 },
                scrollSnapAlign: 'start',
                background:
                  'linear-gradient(135deg, rgba(148, 163, 184, 0.22), rgba(226, 232, 240, 0.9))',
                display: 'flex',
                alignItems: 'flex-end',
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  p: { xs: 3, md: 4 },
                  background: 'linear-gradient(180deg, transparent, rgba(15, 23, 42, 0.72))',
                  color: 'text.primary',
                }}
              >
                <Stack spacing={1}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    Blog
                  </Typography>
                </Stack>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <Container maxWidth="xl">
        <Stack spacing={4} sx={{ pt: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
              Latest Posts
            </Typography>

            {latestPosts.length > 0 ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, minmax(0, 1fr))',
                    xl: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 2,
                }}
              >
                {latestPosts.map((post) => (
                  <Card
                    key={`latest-${post.id}`}
                    elevation={0}
                    component={RouterLink}
                    to={`/blog/${post.slug}`}
                    sx={{
                      textDecoration: 'none',
                      color: 'inherit',
                      borderRadius: 4,
                      border: '1px solid rgba(148, 163, 184, 0.28)',
                      backgroundColor: 'rgba(255, 255, 255, 0.86)',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Stack spacing={2}>
                        <Box
                          sx={{
                            width: '100%',
                            height: 180,
                            borderRadius: 3,
                            background: post.image
                              ? `url(${post.image}) center/cover no-repeat`
                              : 'linear-gradient(135deg, rgba(148, 163, 184, 0.22), rgba(226, 232, 240, 0.9))',
                          }}
                        />
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          {post.title}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Card
                elevation={0}
                sx={{
                  borderRadius: 4,
                  border: '1px dashed rgba(100, 116, 139, 0.45)',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Typography variant="body2" color="text.secondary">
                    Latest posts will appear here once blog content is added.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default Blog;
