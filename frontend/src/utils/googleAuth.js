import axios from 'axios';
import { isIosInAppBrowser } from './environment';

const GOOGLE_STATE_KEY = 'googleAuthState';
const GOOGLE_NONCE_KEY = 'googleAuthNonce';
const GOOGLE_RETURN_PATH_KEY = 'googleAuthReturnPath';

class GoogleAuthService {
  constructor() {
    this.isScriptLoaded = false;
    this.loadPromise = null;
    this.isSigningIn = false;
    this.lastPromptTime = 0;
    this.promptCooldown = 2000; // 2 seconds cooldown between attempts
    const isInApp = isIosInAppBrowser();
    this.cachedClientId = isInApp ? null : (process.env.REACT_APP_GOOGLE_CLIENT_ID || null);
    this.cachedRedirectURI = isInApp ? null : (process.env.REACT_APP_GOOGLE_REDIRECT_URI || null);
    this.clientIdSource = this.cachedClientId ? 'env' : null;
    this.redirectUriSource = this.cachedRedirectURI ? 'env' : null;
    this.clientIdPromise = null;
  }

  generateRandomString(size = 32) {
    if (typeof window === 'undefined' || !window.crypto?.getRandomValues) {
      return [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    }
    const randomBytes = new Uint8Array(size);
    window.crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  getRedirectURI() {
    if (this.cachedRedirectURI) {
      return this.cachedRedirectURI;
    }
    if (process.env.REACT_APP_GOOGLE_REDIRECT_URI) {
      return process.env.REACT_APP_GOOGLE_REDIRECT_URI;
    }
    if (typeof window === 'undefined') {
      return '';
    }
    return `${window.location.origin}/google/callback`;
  }

  storeRedirectState(state, nonce) {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      sessionStorage.setItem(GOOGLE_STATE_KEY, state);
      sessionStorage.setItem(GOOGLE_NONCE_KEY, nonce);
      const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      sessionStorage.setItem(GOOGLE_RETURN_PATH_KEY, returnPath);
    } catch (error) {
      console.warn('Unable to persist Google redirect state', error);
    }
  }

  getStoredState() {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return sessionStorage.getItem(GOOGLE_STATE_KEY);
    } catch {
      return null;
    }
  }

  getStoredNonce() {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return sessionStorage.getItem(GOOGLE_NONCE_KEY);
    } catch {
      return null;
    }
  }

  getStoredReturnPath() {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return sessionStorage.getItem(GOOGLE_RETURN_PATH_KEY);
    } catch {
      return null;
    }
  }

  clearRedirectState() {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      sessionStorage.removeItem(GOOGLE_STATE_KEY);
      sessionStorage.removeItem(GOOGLE_NONCE_KEY);
      sessionStorage.removeItem(GOOGLE_RETURN_PATH_KEY);
    } catch {
      // Ignore errors
    }
  }

  shouldUseRedirectFallback() {
    return isIosInAppBrowser();
  }

  buildAuthorizeUrl({ clientId, redirectURI, state, nonce }) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectURI,
      response_type: 'id_token',
      scope: 'openid email profile',
      prompt: 'select_account',
      state,
      nonce
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
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

  clearAllAuthState() {
    // Comprehensive state clearing for troubleshooting
    try {
      // Clear all authentication related localStorage items
      localStorage.removeItem('token');
      localStorage.removeItem('hasLoggedOut');
      localStorage.removeItem('redirectPath');
      localStorage.removeItem('g_state');
      
      // Clear all authentication related sessionStorage items
      sessionStorage.removeItem('g_state');
      sessionStorage.removeItem('token');
      
      // Clear Google One Tap state
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
      }
      
      // Clear axios headers
      delete window.axios?.defaults?.headers?.common['x-auth-token'];
      
      // Reset internal state
      this.isSigningIn = false;
      this.lastPromptTime = 0;
      
      console.log('All authentication state cleared');
    } catch (error) {
      console.warn('Error clearing auth state:', error);
    }
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
    console.log('🔄 Getting ID token - ensuring GIS loaded...');
    await this.ensureGisLoaded();

    if (!this.canAttemptSignIn()) {
      console.log('⏰ Cannot attempt sign-in - too soon or already in progress');
      throw new Error('Sign-in already in progress or too soon after last attempt');
    }

    let clientId = null;
    try {
      clientId = await this.getClientId();
    } catch (error) {
      console.error('Failed to resolve Google client ID:', error?.message || error);
      clientId = null;
    }
    if (!clientId) {
      console.log('❌ Missing Google Client ID');
      throw new Error('missing_client_id');
    }

    console.log('🔑 Client ID found, starting sign-in process...');
    this.isSigningIn = true;
    this.lastPromptTime = Date.now();

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.isSigningIn = false;
      };

      const resolveWithCleanup = (result) => {
        console.log('✅ Sign-in successful, cleaning up...');
        cleanup();
        resolve(result);
      };

      const rejectWithCleanup = (error) => {
        console.log('❌ Sign-in failed, cleaning up...', error.message);
        cleanup();
        reject(error);
      };

      try {
        console.log('🔧 Initializing Google Sign-In...');
        // Initialize Google Sign-In fresh each time
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            console.log('📞 Google callback received');
            if (response?.credential) {
              console.log('🎫 Credential received from Google');
              resolveWithCleanup(response.credential);
            } else if (response?.error) {
              console.log('❌ Error in Google callback:', response.error);
              rejectWithCleanup(new Error(response.error));
            } else {
              console.log('❌ No credential in Google callback');
              rejectWithCleanup(new Error('No credential received'));
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });

        console.log('🎯 Triggering Google prompt...');
        // Try the prompt first
        window.google.accounts.id.prompt((notification) => {
          console.log('📢 Google prompt notification:', notification);
          if (notification.isNotDisplayed()) {
            console.log('⚠️ Prompt not displayed, reason:', notification.getNotDisplayedReason());
            // Instead of rejecting, try alternative method
            this.triggerSignInButton(resolveWithCleanup, rejectWithCleanup);
          } else if (notification.isSkippedMoment()) {
            console.log('⏭️ Prompt skipped, trying button method');
            this.triggerSignInButton(resolveWithCleanup, rejectWithCleanup);
          } else if (notification.isDismissedMoment()) {
            console.log('🚫 Prompt dismissed, trying button method');
            this.triggerSignInButton(resolveWithCleanup, rejectWithCleanup);
          }
        });

      } catch (error) {
        console.error('💥 Google sign-in initialization error:', error);
        rejectWithCleanup(error);
      }
    });
  }

  async getClientId() {
    if (this.cachedClientId) {
      if (!isIosInAppBrowser() || this.clientIdSource === 'backend') {
        return this.cachedClientId;
      }
    }

    if (this.clientIdPromise) {
      return this.clientIdPromise;
    }

    const fallbackEnvClientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
    const fallbackEnvRedirectURI = (process.env.REACT_APP_GOOGLE_REDIRECT_URI || '').trim();

    this.clientIdPromise = axios
      .get('/api/auth/google/client')
      .then((res) => {
        const clientId = (res.data?.clientId || '').trim();
        const redirectURI = (res.data?.redirectURI || res.data?.redirectUri || '').trim();
        if (redirectURI) {
          this.cachedRedirectURI = redirectURI;
          this.redirectUriSource = 'backend';
        }
        if (clientId) {
          this.cachedClientId = clientId;
          this.clientIdSource = 'backend';
          console.log('ℹ️ Google client ID resolved from backend configuration');
          return clientId;
        }
        this.clientIdPromise = null;
        return null;
      })
      .catch((error) => {
        console.error('Failed to fetch Google client ID from backend:', error?.message || error);
        if (fallbackEnvClientId) {
          this.cachedClientId = fallbackEnvClientId;
          this.clientIdSource = 'env';
          if (fallbackEnvRedirectURI) {
            this.cachedRedirectURI = fallbackEnvRedirectURI;
            this.redirectUriSource = 'env';
          }
          this.clientIdPromise = null;
          return this.cachedClientId;
        }
        this.clientIdPromise = null;
        throw error;
      });

    return this.clientIdPromise;
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
      console.log('🚀 Starting Google sign-in process...');

      if (this.shouldUseRedirectFallback()) {
        console.log('📲 Using redirect-based Google flow for iOS webview');
        const clientId = await this.getClientId();
        if (!clientId) {
          throw new Error('missing_client_id');
        }
        const redirectURI = this.getRedirectURI();
        const state = this.generateRandomString(16);
        const nonce = this.generateRandomString(16);
        this.storeRedirectState(state, nonce);
        const authorizeUrl = this.buildAuthorizeUrl({ clientId, redirectURI, state, nonce });
        window.location.assign(authorizeUrl);
        return { success: false, redirecting: true };
      }
      
      // Clear any previous One Tap state to avoid cooldown issues
      this.clearGoogleOneTapState();
      console.log('🧹 Cleared Google One Tap state');
      
      console.log('🔑 Attempting to get ID token from Google...');
      const idToken = await this.getIdToken();
      console.log('✅ Received ID token from Google');
      
      const decoded = this.decodeIdToken(idToken) || {};
      const fullName = decoded.name || [decoded.given_name, decoded.family_name].filter(Boolean).join(' ').trim() || undefined;

      const payload = {
        idToken,
        email: decoded.email,
        name: fullName,
        imageUrl: decoded.picture
      };

      console.log('📤 Sending payload to backend:', { 
        ...payload, 
        idToken: 'ID_TOKEN_PRESENT',
        hasToken: !!idToken,
        email: payload.email,
        name: payload.name 
      });
      
      const res = await axios.post('/api/auth/google', payload);
      console.log('📨 Backend response received:', res.status);

      return {
        success: true,
        token: res.data?.token,
        user: res.data?.user
      };
    } catch (error) {
      console.error('❌ Google OAuth failed at stage:', error.message);
      console.error('📍 Full error:', error);
      console.error('🔍 Error response data:', error.response?.data);
      
      const isCaptchaError = error.response?.data?.captchaRequired === true;
      
      let errorMessage = this.getErrorMessage(error);

      return {
        success: false,
        error: errorMessage,
        captchaRequired: isCaptchaError,
        type: error.response?.data?.type,
        email: error.response?.data?.email,
        linkToken: error.response?.data?.linkToken
      };
    }
  }

  async handleRedirectCallback(fragmentString = '', searchString = '') {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Google sign-in is not available in this environment.' };
    }

    const storedReturnPath = this.getStoredReturnPath();
    const rawFragment = fragmentString || window.location.hash || '';
    const rawSearch = searchString || window.location.search || '';
    const fragmentParams = new URLSearchParams(rawFragment.startsWith('#') ? rawFragment.slice(1) : rawFragment);
    const searchParams = new URLSearchParams(rawSearch);
    const params = fragmentParams.has('id_token') || fragmentParams.has('error') ? fragmentParams : searchParams;

    try {
      const errorParam = params.get('error');
      if (errorParam) {
        const description = params.get('error_description');
        this.clearRedirectState();
        return {
          success: false,
          error: description || errorParam,
          returnPath: storedReturnPath
        };
      }

      const idToken = params.get('id_token');
      if (!idToken) {
        this.clearRedirectState();
        return {
          success: false,
          error: 'Missing Google authorization response.',
          returnPath: storedReturnPath
        };
      }

      const returnedState = params.get('state');
      const storedState = this.getStoredState();
      if (storedState && returnedState && returnedState !== storedState) {
        this.clearRedirectState();
        return {
          success: false,
          error: 'Google sign-in validation failed. Please try again.',
          returnPath: storedReturnPath
        };
      }

      const decoded = this.decodeIdToken(idToken) || {};
      const storedNonce = this.getStoredNonce();
      if (storedNonce && decoded.nonce && decoded.nonce !== storedNonce) {
        this.clearRedirectState();
        return {
          success: false,
          error: 'Google sign-in validation failed. Please try again.',
          returnPath: storedReturnPath
        };
      }

      const payload = {
        idToken,
        email: decoded.email,
        name: decoded.name,
        imageUrl: decoded.picture
      };

      const res = await axios.post('/api/auth/google', payload);
      this.clearRedirectState();
      return {
        success: true,
        token: res.data?.token,
        user: res.data?.user,
        returnPath: storedReturnPath
      };
    } catch (error) {
      this.clearRedirectState();
      return {
        success: false,
        error: this.getErrorMessage(error),
        type: error.response?.data?.type,
        email: error.response?.data?.email,
        linkToken: error.response?.data?.linkToken,
        returnPath: storedReturnPath
      };
    }
  }
}

const googleAuthService = new GoogleAuthService();
export default googleAuthService;
