import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';

const UserAgreement = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <IconButton 
          component={RouterLink} 
          to="/" 
          sx={{ mr: 2 }}
          aria-label="Go back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          GigLink Terms of Service
        </Typography>
      </Box>
      
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Last updated: {new Date().toLocaleDateString()}
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          1. Acceptance of Terms
        </Typography>
        <Typography paragraph>
          By accessing and using GigLink, you accept and agree to be bound by the terms and provision of this agreement. 
          If you do not agree to abide by the above, please do not use this service.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          2. Description of Service
        </Typography>
        <Typography paragraph>
          GigLink is a platform that connects musicians, music professionals, and industry stakeholders. 
          Our service allows users to create profiles, share content, find gigs, collaborate, and network within the music community.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          3. User Accounts and Registration
        </Typography>
        <Typography paragraph>
          To access certain features of GigLink, you must register for an account. You agree to provide accurate, 
          current, and complete information during the registration process and to update such information to keep it accurate, 
          current, and complete.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          4. User Conduct
        </Typography>
        <Typography paragraph>
          You agree not to use GigLink to:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" paragraph>
            Upload, post, or transmit any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable
          </Typography>
          <Typography component="li" paragraph>
            Impersonate any person or entity or falsely state or misrepresent your affiliation with a person or entity
          </Typography>
          <Typography component="li" paragraph>
            Upload, post, or transmit any content that infringes any patent, trademark, trade secret, copyright, or other proprietary rights
          </Typography>
          <Typography component="li" paragraph>
            Upload, post, or transmit any unsolicited or unauthorized advertising, promotional materials, spam, or any other form of solicitation
          </Typography>
        </Box>
        
        <Typography variant="h6" gutterBottom>
          5. Content and Intellectual Property
        </Typography>
        <Typography paragraph>
          Users retain ownership of content they post on GigLink. By posting content, you grant GigLink a non-exclusive, 
          royalty-free, worldwide license to use, display, and distribute your content on the platform. 
          You represent that you have all necessary rights to grant this license.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          6. Privacy
        </Typography>
        <Typography paragraph>
          Your privacy is important to us. Please review our Privacy Policy, which also governs your use of GigLink, 
          to understand our practices.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          7. Termination
        </Typography>
        <Typography paragraph>
          GigLink may terminate your access to the service at any time, with or without cause, with or without notice. 
          Upon termination, your right to use GigLink will cease immediately.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          8. Disclaimer of Warranties
        </Typography>
        <Typography paragraph>
          GigLink is provided "as is" without any representations or warranties, express or implied. 
          GigLink makes no representations or warranties in relation to this website or the information and materials provided.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          9. Limitation of Liability
        </Typography>
        <Typography paragraph>
          In no event shall GigLink be liable for any indirect, incidental, special, consequential, or punitive damages, 
          including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          10. Changes to Terms
        </Typography>
        <Typography paragraph>
          GigLink reserves the right to modify these terms at any time. We will notify users of any material changes 
          via email or through the platform. Continued use of GigLink after such modifications constitutes acceptance of the updated terms.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          11. Contact Information
        </Typography>
        <Typography paragraph>
          If you have any questions about this User Agreement, please contact us at legal@giglink.com.
        </Typography>
      </Paper>
    </Container>
  );
};

export default UserAgreement;