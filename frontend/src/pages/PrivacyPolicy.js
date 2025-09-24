import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';

const PrivacyPolicy = () => {
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
          GigLink Privacy Policy
        </Typography>
      </Box>
      
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Last updated: {new Date().toLocaleDateString()}
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          1. Information We Collect
        </Typography>
        <Typography paragraph>
          We collect information you provide directly to us, such as when you create an account, update your profile, 
          post content, or communicate with us. This may include:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" paragraph>
            Personal information (name, email address, phone number)
          </Typography>
          <Typography component="li" paragraph>
            Profile information (bio, location, musical preferences, experience)
          </Typography>
          <Typography component="li" paragraph>
            Content you post (photos, videos, audio, text)
          </Typography>
          <Typography component="li" paragraph>
            Communication data (messages, comments, interactions)
          </Typography>
        </Box>
        
        <Typography variant="h6" gutterBottom>
          2. How We Use Your Information
        </Typography>
        <Typography paragraph>
          We use the information we collect to:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" paragraph>
            Provide, maintain, and improve our services
          </Typography>
          <Typography component="li" paragraph>
            Process transactions and send related information
          </Typography>
          <Typography component="li" paragraph>
            Send technical notices, updates, security alerts, and support messages
          </Typography>
          <Typography component="li" paragraph>
            Respond to your comments, questions, and customer service requests
          </Typography>
          <Typography component="li" paragraph>
            Communicate with you about products, services, offers, and events
          </Typography>
          <Typography component="li" paragraph>
            Monitor and analyze trends, usage, and activities in connection with our services
          </Typography>
        </Box>
        
        <Typography variant="h6" gutterBottom>
          3. Information Sharing and Disclosure
        </Typography>
        <Typography paragraph>
          We may share your information in the following circumstances:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" paragraph>
            With other users when you choose to share information publicly on your profile
          </Typography>
          <Typography component="li" paragraph>
            With service providers who perform services on our behalf
          </Typography>
          <Typography component="li" paragraph>
            If required by law or to protect our rights and safety
          </Typography>
          <Typography component="li" paragraph>
            In connection with a merger, acquisition, or sale of assets
          </Typography>
        </Box>
        
        <Typography variant="h6" gutterBottom>
          4. Data Security
        </Typography>
        <Typography paragraph>
          We implement appropriate technical and organizational measures to protect your personal information against 
          unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet 
          or electronic storage is 100% secure.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          5. Data Retention
        </Typography>
        <Typography paragraph>
          We retain your personal information for as long as necessary to provide our services, comply with legal obligations, 
          resolve disputes, and enforce our agreements. When you delete your account, we will delete your personal information, 
          though some information may remain in backup copies for a limited time.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          6. Your Rights and Choices
        </Typography>
        <Typography paragraph>
          You have the right to:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" paragraph>
            Access, update, or delete your personal information
          </Typography>
          <Typography component="li" paragraph>
            Opt out of certain communications from us
          </Typography>
          <Typography component="li" paragraph>
            Request a copy of your personal information
          </Typography>
          <Typography component="li" paragraph>
            Object to processing of your personal information
          </Typography>
        </Box>
        
        <Typography variant="h6" gutterBottom>
          7. Cookies and Tracking Technologies
        </Typography>
        <Typography paragraph>
          We use cookies and similar tracking technologies to collect and use personal information about you. 
          For more information about our use of cookies, please see our Cookie Policy.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          8. Third-Party Services
        </Typography>
        <Typography paragraph>
          Our service may contain links to third-party websites or services. We are not responsible for the privacy 
          practices of these third parties. We encourage you to read their privacy policies.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          9. Children's Privacy
        </Typography>
        <Typography paragraph>
          Our service is not intended for children under 13 years of age. We do not knowingly collect personal information 
          from children under 13. If you become aware that a child has provided us with personal information, 
          please contact us immediately.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          10. International Data Transfers
        </Typography>
        <Typography paragraph>
          Your information may be transferred to and processed in countries other than your own. 
          We will ensure appropriate safeguards are in place to protect your personal information.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          11. Changes to This Privacy Policy
        </Typography>
        <Typography paragraph>
          We may update this Privacy Policy from time to time. We will notify you of any material changes by posting 
          the new Privacy Policy on this page and updating the "Last updated" date.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          12. Contact Us
        </Typography>
        <Typography paragraph>
          If you have any questions about this Privacy Policy, please contact us at privacy@giglink.com.
        </Typography>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicy;