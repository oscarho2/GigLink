import React from 'react';
import { Container, Typography, Box, Paper, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const CookiePolicy = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          GigLink Cookie Policy
        </Typography>
      </Box>
      
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Last updated: {new Date().toLocaleDateString()}
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          1. What Are Cookies
        </Typography>
        <Typography paragraph>
          Cookies are small text files that are placed on your computer or mobile device when you visit a website. 
          They are widely used to make websites work more efficiently and to provide information to website owners.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          2. How We Use Cookies
        </Typography>
        <Typography paragraph>
          GigLink uses cookies to:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" paragraph>
            Keep you signed in to your account
          </Typography>
          <Typography component="li" paragraph>
            Remember your preferences and settings
          </Typography>
          <Typography component="li" paragraph>
            Provide personalized content and recommendations
          </Typography>
          <Typography component="li" paragraph>
            Analyze how our website is used and improve our services
          </Typography>
          <Typography component="li" paragraph>
            Prevent fraud and enhance security
          </Typography>
        </Box>
        
        <Typography variant="h6" gutterBottom>
          3. Types of Cookies We Use
        </Typography>
        
        <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
          Essential Cookies
        </Typography>
        <Typography paragraph>
          These cookies are necessary for the website to function properly. They enable core functionality such as 
          security, network management, and accessibility. You cannot opt-out of these cookies.
        </Typography>
        
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Performance Cookies
        </Typography>
        <Typography paragraph>
          These cookies collect information about how visitors use our website, such as which pages are visited most often. 
          This data helps us improve how our website works.
        </Typography>
        
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Functionality Cookies
        </Typography>
        <Typography paragraph>
          These cookies allow our website to remember choices you make and provide enhanced, more personal features. 
          They may be set by us or by third-party providers whose services we have added to our pages.
        </Typography>
        
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Targeting/Advertising Cookies
        </Typography>
        <Typography paragraph>
          These cookies are used to deliver advertisements more relevant to you and your interests. 
          They are also used to limit the number of times you see an advertisement and help measure the effectiveness of advertising campaigns.
        </Typography>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          4. Third-Party Cookies
        </Typography>
        <Typography paragraph>
          We may use third-party services that place cookies on your device. These include:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" paragraph>
            Google Analytics for website analytics
          </Typography>
          <Typography component="li" paragraph>
            Social media platforms for sharing content
          </Typography>
          <Typography component="li" paragraph>
            Payment processors for secure transactions
          </Typography>
          <Typography component="li" paragraph>
            Content delivery networks for improved performance
          </Typography>
        </Box>
        
        <Typography variant="h6" gutterBottom>
          5. Managing Cookies
        </Typography>
        <Typography paragraph>
          You can control and manage cookies in various ways:
        </Typography>
        
        <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
          Browser Settings
        </Typography>
        <Typography paragraph>
          Most web browsers allow you to control cookies through their settings. You can set your browser to refuse cookies 
          or to alert you when cookies are being sent. However, if you disable cookies, some features of our website may not function properly.
        </Typography>
        
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Cookie Preferences
        </Typography>
        <Typography paragraph>
          You can manage your cookie preferences through our cookie consent banner that appears when you first visit our website. 
          You can also update your preferences at any time through your account settings.
        </Typography>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          6. Cookie Retention
        </Typography>
        <Typography paragraph>
          Different cookies have different lifespans:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" paragraph>
            <strong>Session cookies:</strong> Deleted when you close your browser
          </Typography>
          <Typography component="li" paragraph>
            <strong>Persistent cookies:</strong> Remain on your device for a set period or until you delete them
          </Typography>
        </Box>
        
        <Typography variant="h6" gutterBottom>
          7. Updates to This Cookie Policy
        </Typography>
        <Typography paragraph>
          We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, 
          legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy on our website.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          8. Contact Us
        </Typography>
        <Typography paragraph>
          If you have any questions about our use of cookies or this Cookie Policy, please visit our <Link component={RouterLink} to="/contact">Contact Page</Link>.
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          9. More Information
        </Typography>
        <Typography paragraph>
          For more information about cookies and how to manage them, visit:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Typography component="li" paragraph>
            <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer">
              www.allaboutcookies.org
            </a>
          </Typography>
          <Typography component="li" paragraph>
            <a href="https://www.youronlinechoices.com" target="_blank" rel="noopener noreferrer">
              www.youronlinechoices.com
            </a>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default CookiePolicy;