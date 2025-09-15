import React, { useContext, useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Grid,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Work as WorkIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  LocationOn as LocationOnIcon,
  CalendarToday as CalendarTodayIcon,
  Payment as PaymentIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import AuthContext from '../context/AuthContext';
import ApplicantSelectionModal from '../components/ApplicantSelectionModal';
import axios from 'axios';
import { formatPayment } from '../utils/currency';
import UserAvatar from '../components/UserAvatar';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const MyGigs = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Tab state
  const [tabValue, setTabValue] = useState(() => {
    const queryParams = new URLSearchParams(location.search);
    const tab = queryParams.get('tab');
    return tab === 'applications' ? 1 : 0;
  });

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tab = queryParams.get('tab');
    const newTabValue = tab === 'applications' ? 1 : 0;
    setTabValue(newTabValue);
  }, [location]);
  
  // State for gigs and applications
  const [gigs, setGigs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  
  // Search and filter state
  const [gigSearchTerm, setGigSearchTerm] = useState('');
  const [applicationSearchTerm, setApplicationSearchTerm] = useState('');
  const [gigStatusFilter, setGigStatusFilter] = useState('all');
  const [applicationStatusFilter, setApplicationStatusFilter] = useState('all');
  
  // Applicant selection modal state
  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [selectedGig, setSelectedGig] = useState(null);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Update URL to reflect tab change
    const newTab = newValue === 1 ? 'applications' : 'gigs';
    navigate(`/my-gigs?tab=${newTab}`, { replace: true });
  };

  // Fetch user's gigs
  const fetchGigs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/gigs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Filter to only show gigs created by the current user
      const userGigs = (response.data || []).filter(gig => 
        gig.user && (gig.user._id === user?.id || gig.user._id === user?._id)
      );
      setGigs(userGigs);
    } catch (error) {
      console.error('Error fetching gigs:', error);
      setGigs([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's applications
  const fetchApplications = async () => {
    try {
      setApplicationsLoading(true);
      const response = await axios.get('/api/gigs/user/applications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setApplications(response.data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  };

  // Handle opening applicant modal
  const handleOpenApplicantModal = (gig) => {
    setSelectedGig(gig);
    setShowApplicantModal(true);
  };

  const handleSelectApplicant = async (applicant) => {
    if (!selectedGig) return;
    
    const applicantId = typeof applicant.user === 'string' ? applicant.user : applicant.user?._id;
    await handleAcceptApplicant(selectedGig._id, applicantId);
    setShowApplicantModal(false);
    setSelectedGig(null);
  };

  // Handle accepting applicant
  const handleAcceptApplicant = async (gigId, userId) => {
    try {
      await axios.post(`/api/gigs/${gigId}/accept`, 
        { userId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchGigs(); // Refresh gigs
    } catch (error) {
      console.error('Error accepting applicant:', error);
    }
  };

  // Handle editing gig
  const handleEditGig = (gigId) => {
    navigate(`/edit-gig/${gigId}`);
  };

  useEffect(() => {
    fetchGigs();
    fetchApplications();
  }, []);

  // Filter functions
  const filteredGigs = gigs.filter(gig => {
    const matchesSearch = gig.title.toLowerCase().includes(gigSearchTerm.toLowerCase()) ||
                         gig.venue.toLowerCase().includes(gigSearchTerm.toLowerCase()) ||
                         gig.location.toLowerCase().includes(gigSearchTerm.toLowerCase());
    
    const matchesStatus = gigStatusFilter === 'all' || 
                         (gigStatusFilter === 'open' && !gig.isFilled) ||
                         (gigStatusFilter === 'filled' && gig.isFilled);
    
    return matchesSearch && matchesStatus;
  });

  const filteredApplications = applications.filter(application => {
    const matchesSearch = application.title.toLowerCase().includes(applicationSearchTerm.toLowerCase()) ||
                         application.venue.toLowerCase().includes(applicationSearchTerm.toLowerCase()) ||
                         application.location.toLowerCase().includes(applicationSearchTerm.toLowerCase());
    
    const matchesStatus = applicationStatusFilter === 'all' ||
                         (applicationStatusFilter === 'pending' && application.applicationStatus === 'pending') ||
                         (applicationStatusFilter === 'accepted' && application.applicationStatus === 'accepted') ||
                         (applicationStatusFilter === 'rejected' && application.applicationStatus === 'rejected') ||
                         (applicationStatusFilter === 'filled' && application.acceptedByOther);
    
    return matchesSearch && matchesStatus;
  });

  // Status helper functions
  const getStatusColor = (status, acceptedByOther) => {
    if (acceptedByOther && status !== 'accepted') return 'error';
    switch (status) {
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      default: return 'warning';
    }
  };
  
  const getStatusText = (status, acceptedByOther) => {
    if (acceptedByOther && status !== 'accepted') return 'Position Filled';
    switch (status) {
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      default: return 'Pending';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        My Gigs
      </Typography>

      {/* Tabbed Gigs and Applications Section */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="gigs and applications tabs"
            variant="fullWidth"
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WorkIcon fontSize="small" />
                  My Gigs
                  <Chip
                    label={filteredGigs.length}
                    size="small"
                    sx={{ bgcolor: '#e3f2fd', color: '#1976d2', fontSize: '0.75rem', height: 20 }}
                  />
                </Box>
              }
              {...a11yProps(0)}
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon fontSize="small" />
                  Applications
                  <Chip
                    label={filteredApplications.length}
                    size="small"
                    sx={{ bgcolor: '#e8f5e8', color: '#388e3c', fontSize: '0.75rem', height: 20 }}
                  />
                </Box>
              }
              {...a11yProps(1)}
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
              <WorkIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Current Gigs
            </Typography>
            <Button
              component={RouterLink}
              to="/create-gig"
              variant="contained"
              startIcon={<AddIcon />}
            >
              Post New Gig
            </Button>
          </Box>
          
          {/* Search and Filter for Gigs */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search gigs..."
              value={gigSearchTerm}
              onChange={(e) => setGigSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250, flex: 1 }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={gigStatusFilter}
                label="Status"
                onChange={(e) => setGigStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="filled">Filled</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <Typography>Loading gigs...</Typography>
            </Box>
          ) : filteredGigs.length === 0 ? (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {gigSearchTerm || gigStatusFilter !== 'all' ? 'No gigs match your search criteria.' : 'No gigs posted yet. Create your first gig to get started!'}
            </Typography>
          ) : (
            <List>
              {filteredGigs.map(gig => (
                <ListItem
                  key={gig._id || gig.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 3,
                    backgroundColor: gig.isFilled ? 'action.disabledBackground' : 'inherit',
                    opacity: gig.isFilled ? 0.8 : 1,
                    '&:hover': {
                      backgroundColor: gig.isFilled ? 'action.disabledBackground' : 'action.hover',
                      transform: gig.isFilled ? 'none' : 'translateY(-2px)',
                      boxShadow: gig.isFilled ? 'none' : 3
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <Box 
                    component={RouterLink}
                    to={`/gigs/${gig._id}`}
                    sx={{ 
                      textDecoration: 'none', 
                      color: 'inherit',
                      flex: 1,
                      mr: 2,
                      minWidth: 0
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 600,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: gig.isFilled ? 'text.disabled' : 'inherit'
                          }}
                        >
                          {gig.isFilled ? 'FILLED: ' : ''}{gig.title}
                        </Typography>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Box component="div">
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 0.5 }}>
                            <LocationOnIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'text.secondary' }} />
                            <span style={{ fontSize: '0.875rem', color: '#1976d2' }}>
                              {gig.venue} - {gig.location}
                            </span>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <CalendarTodayIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'text.secondary' }} />
                            <span style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                              {new Date(gig.date).toLocaleDateString()} at {gig.time}
                            </span>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PaymentIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'text.secondary' }} />
                            <span style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                              {formatPayment(gig.payment, gig.currency || 'GBP')}
                            </span>
                          </Box>
                        </Box>
                      }
                    />
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    flexDirection: { xs: 'column', sm: 'row' },
                    minWidth: 'fit-content'
                  }}>
                    <Chip
                      label={gig.isFilled ? 'Filled' : 'Open'}
                      color={gig.isFilled ? 'default' : 'success'}
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {(() => { 
                          const count = (gig.applicantCount ?? (Array.isArray(gig.applicants) ? gig.applicants.length : 0)); 
                          return count; 
                        })()} applicants
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {(() => {
                        const hasApplicants = (gig.applicantCount ?? (Array.isArray(gig.applicants) ? gig.applicants.length : 0)) > 0;
                        const accepted = Array.isArray(gig.applicants) && gig.applicants.find(a => a.status === 'accepted');
                        const showBtn = hasApplicants && (!gig.isFilled || !!accepted);
                        return showBtn;
                      })() && (
                        <Button
                          size="small"
                          variant="contained"
                          color={(Array.isArray(gig.applicants) && gig.applicants.some(a => a.status === 'accepted')) ? 'secondary' : 'primary'}
                          startIcon={<CheckCircleIcon />}
                          onClick={(e) => {
                            e.preventDefault();
                            const accepted = Array.isArray(gig.applicants) && gig.applicants.find(a => a.status === 'accepted');
                            if (accepted) {
                              // If someone is already accepted, undo their acceptance
                              const targetId = typeof accepted.user === 'string' ? accepted.user : accepted.user?._id;
                              if (targetId) {
                                handleAcceptApplicant(gig._id, targetId);
                              }
                            } else {
                              // If no one is accepted, open modal to select applicant
                              handleOpenApplicantModal(gig);
                            }
                          }}
                        >
                          {(Array.isArray(gig.applicants) && gig.applicants.some(a => a.status === 'accepted')) ? 'Undo' : 'Accept'}
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={(e) => {
                          e.preventDefault();
                          handleEditGig(gig._id);
                        }}
                      >
                        Edit
                      </Button>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
              <WorkIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              My Gig Applications
            </Typography>
          </Box>
          
          {/* Search and Filter for Applications */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search applications..."
              value={applicationSearchTerm}
              onChange={(e) => setApplicationSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250, flex: 1 }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={applicationStatusFilter}
                label="Status"
                onChange={(e) => setApplicationStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="accepted">Accepted</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="filled">Position Filled</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          {applicationsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <Typography>Loading applications...</Typography>
            </Box>
          ) : filteredApplications.length === 0 ? (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {applicationSearchTerm || applicationStatusFilter !== 'all' ? 'No applications match your search criteria.' : 'No gig applications yet. Start applying to gigs to see them here!'}
            </Typography>
          ) : (
            <Grid container spacing={3}>
              {filteredApplications.map((application) => (
                <Grid item xs={12} md={6} lg={4} key={application._id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6
                      }
                    }}
                    onClick={() => navigate(`/gigs/${application._id}`)}
                  >
                    <CardContent sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', flex: 1, mr: 1 }}>
                          {application.title}
                        </Typography>
                        <Chip
                          label={getStatusText(application.applicationStatus, application.acceptedByOther)}
                          color={getStatusColor(application.applicationStatus, application.acceptedByOther)}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <LocationOnIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />
                        <span style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                          {application.venue} • {application.location}
                        </span>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CalendarTodayIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />
                        <span style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                          {application.date} {application.time && `• ${application.time}`}
                        </span>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PaymentIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />
                        <span style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                          {formatPayment(application.payment, application.currency || 'GBP')}
                        </span>
                      </Box>
                      
                      {application.instruments && application.instruments.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Instruments:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {application.instruments.slice(0, 3).map((instrument, index) => (
                              <Chip
                                key={index}
                                label={instrument}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            ))}
                            {application.instruments.length > 3 && (
                              <Chip
                                label={`+${application.instruments.length - 3} more`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Box>
                      )}
                      
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Applied: {new Date(application.applicationDate).toLocaleDateString()}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ mr: 1 }}
                        >
                          Posted by:
                        </Typography>
                        <UserAvatar
                           user={application.poster || { name: 'Unknown' }}
                           size={20}
                           sx={{ mr: 1, cursor: 'pointer' }}
                           onClick={(e) => {
                             e.stopPropagation();
                             if (application.poster?._id) {
                               navigate(`/profile/${application.poster._id}`);
                             }
                           }}
                         />
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': {
                              color: 'primary.dark'
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (application.poster?._id) {
                              navigate(`/profile/${application.poster._id}`);
                            }
                          }}
                        >
                          {application.poster?.name || 'Unknown'}
                        </Typography>
                      </Box>
                    </CardContent>
                    

                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
      </Card>

      {/* Applicant Selection Modal */}
      <ApplicantSelectionModal
        open={showApplicantModal}
        onClose={() => {
          setShowApplicantModal(false);
          setSelectedGig(null);
        }}
        applicants={selectedGig?.applicants || []}
        onSelectApplicant={handleSelectApplicant}
        gigTitle={selectedGig?.title || ''}
      />
    </Container>
  );
};

export default MyGigs;