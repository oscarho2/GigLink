import axios from 'axios';

class GoogleAuthService {
  constructor() {
    this.isScriptLoaded = false;
    this.loadPromise = null;
    this.isSigningIn = false;
    this.lastPromptTime = 0;
    this.promptCooldown = 2000; // 2 seconds cooldown between attempts
  }

  loadGisScript() {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Google sign-in is only available in the browser.'));
        return;
      }

      if (window.google?.accounts?.id) {
        this.isScriptLoaded = true;
        resolve();
        return;
      }

      const existingScript = document.getElementById('google-identity-services');

      if (existingScript) {
        if (existingScript.dataset.loaded === 'true') {
          this.isScriptLoaded = true;
          resolve();
          return;
        }

        existingScript.addEventListener('load', () => {
          existingScript.dataset.loaded = 'true';
          this.isScriptLoaded = true;
          resolve();
        });

        existingScript.addEventListener('error', () => {
          this.loadPromise = null;
          reject(new Error('Failed to load Google Identity Services'));
        });

        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.id = 'google-identity-services';
      script.onload = () => {
        script.dataset.loaded = 'true';
        this.isScriptLoaded = true;
        resolve();
      };
      script.onerror = () => {
        this.loadPromise = null;
        reject(new Error('Failed to load Google Identity Services'));
      };
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  async ensureGisLoaded() {
    await this.loadGisScript();
    if (!window.google?.accounts?.id) {
      throw new Error('Google Identity Services not available');
    }
  }

  clearGoogleOneTapState() {
    // Clear Google One Tap state to avoid cooldown issues
    try {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
        // Clear any stored state
        localStorage.removeItem('g_state');
        sessionStorage.removeItem('g_state');
      }
    } catch (error) {
      console.warn('Could not clear Google One Tap state:', error);
    }
    
    // Reset our internal state
    this.isSigningIn = false;
  }

  canAttemptSignIn() {
    const now = Date.now();
    const timeSinceLastPrompt = now - this.lastPromptTime;
    return !this.isSigningIn && timeSinceLastPrompt >= this.promptCooldown;
  }

  decodeIdToken(idToken) {
    if (!idToken) {
      return null;
    }

    try {
      const payload = idToken.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(base64);
      const jsonPayload = decodeURIComponent(
        decoded
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.warn('Failed to decode Google ID token', error);
      return null;
    }
  }

  getErrorMessage(error) {
    if (!error) {
      return 'An error occurred during sign-in. Please try again.';
    }

    if (typeof axios.isAxiosError === 'function' && axios.isAxiosError(error)) {
      const serverMessage = error.response?.data?.message || error.response?.data?.error;
      if (serverMessage) {
        return serverMessage;
      }
    }

    const message = error.message || error;
    if (typeof message === 'string') {
      const lower = message.toLowerCase();
      if (lower.includes('popup_closed_by_user') || lower.includes('user_cancel')) {
        return 'Sign-in was cancelled. Please click the button again to try.';
      }
      if (lower.includes('credential_unavailable')) {
        return 'Unable to retrieve Google credentials. Please try again.';
      }
      if (lower.includes('prompt_not_displayed') || lower.includes('origin_mismatch')) {
        return 'Google sign-in could not be displayed. Please check your browser settings.';
      }
      if (lower.includes('prompt_skipped') || lower.includes('no_session')) {
        return 'Sign-in was skipped. Please try again.';
      }
      if (lower.includes('missing_client_id')) {
        return 'Google sign-in is not configured properly.';
      }
      if (lower.includes('already in progress') || lower.includes('too soon')) {
        return 'Please wait a moment before trying again.';
      }
    }

    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    return 'An error occurred during sign-in. Please try again.';
  }

  async getIdToken() {
    await this.ensureGisLoaded();

    if (!this.canAttemptSignIn()) {
      throw new Error('Sign-in already in progress or too soon after last attempt');
    }

    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('missing_client_id');
    }

    this.isSigningIn = true;
    this.lastPromptTime = Date.now();

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.isSigningIn = false;
      };

      const resolveWithCleanup = (result) => {
        cleanup();
        resolve(result);
      };

      const rejectWithCleanup = (error) => {
        cleanup();
        reject(error);
      };

      try {
        // Initialize Google Sign-In fresh each time
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) {
              resolveWithCleanup(response.credential);
            } else if (response?.error) {
              rejectWithCleanup(new Error(response.error));
            } else {
              rejectWithCleanup(new Error('No credential received'));
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });

        // Try the prompt first
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            console.log('Prompt not displayed:', notification.getNotDisplayedReason());
            // Instead of rejecting, try alternative method
            this.triggerSignInButton(resolveWithCleanup, rejectWithCleanup);
          } else if (notification.isSkippedMoment()) {
            console.log('Prompt skipped');
            this.triggerSignInButton(resolveWithCleanup, rejectWithCleanup);
          } else if (notification.isDismissedMoment()) {
            console.log('Prompt dismissed');
            this.triggerSignInButton(resolveWithCleanup, rejectWithCleanup);
          }
        });

      } catch (error) {
        console.error('Google sign-in initialization error:', error);
        rejectWithCleanup(error);
      }
    });
  }

  triggerSignInButton(resolve, reject) {
    // Create a temporary invisible button to trigger sign-in
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.opacity = '0';
    tempDiv.style.pointerEvents = 'none';
    tempDiv.id = 'temp-google-signin-' + Date.now(); // Unique ID each time
    document.body.appendChild(tempDiv);

    let buttonClicked = false;
    const cleanup = () => {
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv);
      }
    };

    try {
      window.google.accounts.id.renderButton(tempDiv, {
        type: 'standard',
        size: 'large',
        theme: 'outline',
        text: 'sign_in_with',
        shape: 'rectangular'
      });

      // Programmatically click the button
      setTimeout(() => {
        if (buttonClicked) return; // Prevent double click
        
        const googleButton = tempDiv.querySelector('[role="button"]');
        if (googleButton) {
          buttonClicked = true;
          googleButton.click();
          
          // Clean up after a reasonable delay
          setTimeout(cleanup, 5000);
        } else {
          cleanup();
          reject(new Error('Unable to create sign-in button'));
        }
      }, 100);

    } catch (error) {
      cleanup();
      reject(error);
    }
  }

  async signInWithGoogle() {
    try {
      console.log('Starting Google sign-in process...');
      
      // Clear any previous One Tap state to avoid cooldown issues
      this.clearGoogleOneTapState();
      
      const idToken = await this.getIdToken();
      console.log('Received ID token from Google');
      
      const decoded = this.decodeIdToken(idToken) || {};
      const fullName = decoded.name || [decoded.given_name, decoded.family_name].filter(Boolean).join(' ').trim() || undefined;

      const payload = {
        idToken,
        email: decoded.email,
        name: fullName,
        imageUrl: decoded.picture
      };

      console.log('Sending payload to backend:', { ...payload, idToken: '***' });
      const res = await axios.post('/api/auth/google', payload);
      console.log('Backend response received');

      return {
        success: true,
        token: res.data?.token,
        user: res.data?.user
      };
    } catch (error) {
      console.error('Google OAuth failed:', error);
      console.error('Error response:', error.response?.data);
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }
}

const googleAuthService = new GoogleAuthService();
export default googleAuthService;
