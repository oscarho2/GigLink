import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import { Link as RouterLink } from 'react-router-dom';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        pt: 3,
        pb: { xs: 10, md: 3 },
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) => theme.palette.grey[900],
        color: 'white',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Link component={RouterLink} to="/about" color="inherit" sx={{ '&:hover': { textDecoration: 'underline' } }}>
              About
            </Link>
          </Grid>
          <Grid item>
            <Link component={RouterLink} to="/terms-of-service" color="inherit" sx={{ '&:hover': { textDecoration: 'underline' } }}>
              Terms of Service
            </Link>
          </Grid>
          <Grid item>
            <Link component={RouterLink} to="/privacy-policy" color="inherit" sx={{ '&:hover': { textDecoration: 'underline' } }}>
              Privacy Policy
            </Link>
          </Grid>
          <Grid item>
            <Link component={RouterLink} to="/cookie-policy" color="inherit" sx={{ '&:hover': { textDecoration: 'underline' } }}>
              Cookie Policy
            </Link>
          </Grid>
          <Grid item>
            <Link component={RouterLink} to="/contact" color="inherit" sx={{ '&:hover': { textDecoration: 'underline' } }}>
              Contact
            </Link>
          </Grid>
        </Grid>
        <Box mt={3}>
          <Typography variant="body2" align="center">
            {'Copyright © '}
            <Link component={RouterLink} to="/" color="inherit">
              GigLink
            </Link>{' '}
            {new Date().getFullYear()}
            {'.'}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
