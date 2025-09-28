import axios from 'axios';

// Google OAuth utility for handling authentication

class GoogleAuthService {
  constructor() {
    this.isInitialized = false;
    this.gapi = null;
  }

  // Initialize Google API
  async initialize() {
    return new Promise((resolve, reject) => {
      if (this.isInitialized) {
        resolve();
        return;
      }

      // Load Google API script
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('auth2', () => {
          window.gapi.auth2.init({
            client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
            scope: 'profile email'
          }).then(() => {
            this.gapi = window.gapi;
            this.isInitialized = true;
            resolve();
          }).catch(reject);
        });
      };
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(script);
    });
  }

  // Sign in with Google
  async signIn() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const authInstance = this.gapi.auth2.getAuthInstance();
      const googleUser = await authInstance.signIn();
      
      const profile = googleUser.getBasicProfile();
      const idToken = googleUser.getAuthResponse().id_token;

      return {
        success: true,
        user: {
          id: profile.getId(),
          name: profile.getName(),
          email: profile.getEmail(),
          imageUrl: profile.getImageUrl(),
          idToken: idToken
        }
      };
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  // Sign out
  async signOut() {
    try {
      if (!this.isInitialized) {
        return { success: true };
      }

      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      return { success: true };
    } catch (error) {
      console.error('Google Sign-Out Error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  // Get user-friendly error messages
  getErrorMessage(error) {
    if (error.error === 'popup_closed_by_user') {
      return 'Sign-in was cancelled. Please try again.';
    }
    if (error.error === 'access_denied') {
      return 'Access denied. Please grant permission to continue.';
    }
    if (error.error === 'popup_blocked') {
      return 'Popup was blocked. Please allow popups and try again.';
    }
    return 'An error occurred during sign-in. Please try again.';
  }

  // Check if user is signed in
  isSignedIn() {
    if (!this.isInitialized || !this.gapi) {
      return false;
    }
    const authInstance = this.gapi.auth2.getAuthInstance();
    return authInstance.isSignedIn.get();
  }

  // Complete Google sign-in: get Google ID token, then authenticate with backend
  async signInWithGoogle() {
    try {
      // Ensure Google SDK is initialized and get Google user + idToken
      const signInRes = await this.signIn();
      if (!signInRes.success) {
        return signInRes;
      }

      const { user } = signInRes;
      const payload = {
        idToken: user.idToken,
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl
      };

      // Exchange Google ID token for app JWT
      const res = await axios.post('/api/auth/google', payload);

      return {
        success: true,
        token: res.data?.token,
        user: res.data?.user
      };
    } catch (err) {
      console.error('Google OAuth server auth failed:', err);
      const msg = err?.response?.data?.message || 'Server error during Google authentication';
      return { success: false, error: msg };
    }
  }
}

// Export singleton instance
export default new GoogleAuthService();
