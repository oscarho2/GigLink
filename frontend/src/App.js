import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { SocketProvider } from './context/SocketContext';
import { LoadingProvider } from './context/LoadingContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import BottomNavigation from './components/layout/BottomNavigation';
import LoadingSpinner from './components/LoadingSpinner';
import PrivateRoute from './components/PrivateRoute';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const LinksPage = lazy(() => import('./pages/Links'));
const UserLinks = lazy(() => import('./pages/UserLinks'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'));
const Settings = lazy(() => import('./pages/Settings'));
const Discover = lazy(() => import('./pages/Discover'));
const Gigs = lazy(() => import('./pages/Gigs'));
const GigDetail = lazy(() => import('./pages/GigDetail'));
const CreateGig = lazy(() => import('./pages/CreateGig'));
const EditGig = lazy(() => import('./pages/EditGig'));
const MyGigs = lazy(() => import('./pages/MyGigs'));
const Messages = lazy(() => import('./pages/Messages'));
const Community = lazy(() => import('./pages/Community'));
const MyPosts = lazy(() => import('./pages/MyPosts'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const Notifications = lazy(() => import('./pages/Notifications'));
const UserAgreement = lazy(() => import('./pages/UserAgreement'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Route protection


const theme = createTheme({
  palette: {
    primary: {
      main: '#475569',
    },
    secondary: {
      main: '#64748b',
    },
    error: {
      main: '#e53e3e', // Red accent color
    },
    accent: {
      main: '#e53e3e', // Red accent color for the Join Now button
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
  },
});

// Styled components for better performance
const AppContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh'
}));

const MainContent = styled(Box)(({ theme }) => ({
  flex: 1,
  paddingBottom: '70px', // Add padding for bottom navigation on mobile
  [theme.breakpoints.up('md')]: {
    paddingBottom: 0 // No padding on desktop
  }
}));

// Component to handle conditional footer rendering
const AppContent = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <AppContainer>
      <Navbar />
      <MainContent>
        <Suspense fallback={
          <LoadingSpinner 
            type="spinner" 
            size="large" 
            text="Loading page..." 
          />
        }>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/profile/:id" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/edit-profile" element={<PrivateRoute><EditProfile /></PrivateRoute>} />
            <Route path="/profile-setup" element={<PrivateRoute><ProfileSetup /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/gigs" element={<Gigs />} />
            <Route path="/gigs/:id" element={<GigDetail />} />
            <Route path="/gigs/:id/edit" element={<PrivateRoute><EditGig /></PrivateRoute>} />
            <Route path="/create-gig" element={<PrivateRoute><CreateGig /></PrivateRoute>} />
            <Route path="/my-gigs" element={<PrivateRoute><MyGigs /></PrivateRoute>} />
            <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
            <Route path="/messages/:userId" element={<PrivateRoute><Messages /></PrivateRoute>} />
            <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
            <Route path="/links" element={<PrivateRoute><LinksPage /></PrivateRoute>} />
            <Route path="/user/:userId/links" element={<PrivateRoute><UserLinks /></PrivateRoute>} />
            <Route path="/community" element={<PrivateRoute><Community /></PrivateRoute>} />
            <Route path="/my-posts" element={<PrivateRoute><MyPosts /></PrivateRoute>} />
            <Route path="/posts/:postId" element={<PrivateRoute><PostDetail /></PrivateRoute>} />
            <Route path="/terms-of-service" element={<UserAgreement />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </MainContent>
      {isHomePage && <Footer />}
      <BottomNavigation />
    </AppContainer>
  );
};

function App() {
  // Disable browser's automatic scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  return (
    <LoadingProvider>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
              <AppContent />
            </Router>
            </ThemeProvider>
          </NotificationProvider>
        </SocketProvider>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </AuthProvider>
    </LoadingProvider>
  );
}

export default App;
