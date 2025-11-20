import axios from 'axios';
import { isIosDevice, isStandalonePWA, isIosInAppBrowser } from './environment';

const APPLE_STATE_KEY = 'appleAuthState';
const APPLE_RETURN_PATH_KEY = 'appleAuthReturnPath';

class AppleAuthService {
  constructor() {
    this.scriptPromise = null;
  }

  loadScript() {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Apple Sign-In is not available in this environment'));
    }

    if (window.AppleID && window.AppleID.auth) {
      return Promise.resolve();
    }

    if (this.scriptPromise) {
      return this.scriptPromise;
    }

    this.scriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById('apple-signin-js');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Apple Sign-In script failed to load')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = 'apple-signin-js';
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Apple Sign-In script failed to load'));
      document.body.appendChild(script);
    });

    return this.scriptPromise;
  }

  generateState() {
    if (typeof window === 'undefined' || !window.crypto?.getRandomValues) {
      return Math.random().toString(36).slice(2);
    }
    const randomBytes = new Uint8Array(16);
    window.crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  shouldUseRedirectFlow() {
    if (!isIosDevice()) {
      return false;
    }

    // Installed PWAs and iOS webviews (App Store wrapper, in-app browsers, etc.)
    // cannot open the Apple popup reliably, so force the redirect-based flow.
    return isStandalonePWA() || isIosInAppBrowser();
  }

  buildAppleAuthorizeUrl({ clientId, redirectURI, state }) {
    const params = new URLSearchParams({
      response_type: 'code id_token',
      response_mode: 'query',
      client_id: clientId,
      redirect_uri: redirectURI,
      scope: 'name email',
      state
    });
    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  getRedirectURI() {
    if (process.env.REACT_APP_APPLE_REDIRECT_URI) {
      return process.env.REACT_APP_APPLE_REDIRECT_URI;
    }

    if (typeof window === 'undefined') {
      return '';
    }

    return `${window.location.origin}/apple/callback`;
  }

  storeRedirectState(state) {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      sessionStorage.setItem(APPLE_STATE_KEY, state);
      const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      sessionStorage.setItem(APPLE_RETURN_PATH_KEY, returnPath);
    } catch (err) {
      console.warn('Unable to persist Apple Sign-In state', err);
    }
  }

  getStoredState() {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return sessionStorage.getItem(APPLE_STATE_KEY);
    } catch {
      return null;
    }
  }

  getStoredReturnPath() {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return sessionStorage.getItem(APPLE_RETURN_PATH_KEY);
    } catch {
      return null;
    }
  }

  clearRedirectState() {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      sessionStorage.removeItem(APPLE_STATE_KEY);
      sessionStorage.removeItem(APPLE_RETURN_PATH_KEY);
    } catch {
      // Ignore storage cleanup errors
    }
  }

  extractFullName(user) {
    if (!user?.name) {
      return null;
    }

    const { firstName, lastName, middleName } = user.name;
    return [firstName, middleName, lastName].filter(Boolean).join(' ').trim() || null;
  }

  async sendAuthorizationToBackend({ authorizationCode, idToken, email, fullName, user }) {
    if (!authorizationCode && !idToken) {
      throw new Error('Missing Apple authorization data.');
    }

    const backendResponse = await axios.post('/api/auth/apple', {
      authorizationCode,
      idToken,
      email,
      fullName,
      user
    });

    return {
      success: true,
      token: backendResponse.data?.token,
      user: backendResponse.data?.user
    };
  }

  async signInWithApple() {
    try {
      const clientId = process.env.REACT_APP_APPLE_CLIENT_ID;
      if (!clientId) {
        throw new Error('Apple Sign-In is not configured. Missing REACT_APP_APPLE_CLIENT_ID.');
      }

      const redirectURI = this.getRedirectURI();
      const state = this.generateState();
      const useRedirectFlow = this.shouldUseRedirectFlow();
      const requiresManualRedirect = useRedirectFlow && isIosInAppBrowser();

      if (requiresManualRedirect) {
        this.storeRedirectState(state);
        const authorizeUrl = this.buildAppleAuthorizeUrl({ clientId, redirectURI, state });
        window.location.assign(authorizeUrl);
        return { success: false, redirecting: true };
      }

      await this.loadScript();

      if (!window.AppleID || !window.AppleID.auth) {
        throw new Error('Apple Sign-In could not be initialized');
      }

      window.AppleID.auth.init({
        clientId,
        scope: 'name email',
        redirectURI,
        state,
        usePopup: !useRedirectFlow
      });

      if (useRedirectFlow) {
        this.storeRedirectState(state);
        window.AppleID.auth.signIn();
        return { success: false, redirecting: true };
      }

      const response = await window.AppleID.auth.signIn();
      const authorization = response?.authorization || {};
      const user = response?.user || {};

      if (!authorization.code && !authorization.id_token) {
        throw new Error('Apple authorization failed.');
      }

      const email = user.email || null;
      const fullName = this.extractFullName(user);

      return await this.sendAuthorizationToBackend({
        authorizationCode: authorization.code,
        idToken: authorization.id_token,
        email,
        fullName,
        user
      });
    } catch (error) {
      if (error?.error === 'popup_closed_by_user') {
        return { success: false, cancelled: true };
      }

      if (error?.response?.data?.message) {
        return { success: false, error: error.response.data.message };
      }

      return { success: false, error: error.message || 'Apple sign-in failed' };
    }
  }

  async handleRedirectCallback(searchString = '') {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Apple Sign-In is not available.' };
    }

    const queryString = searchString || window.location.search || '';
    const params = new URLSearchParams(queryString);
    const storedReturnPath = this.getStoredReturnPath();

    try {
      const errorParam = params.get('error');
      if (errorParam) {
        const description = params.get('error_description');
        const isCancelled = errorParam === 'access_denied' || errorParam === 'user_cancelled_authorize';
        this.clearRedirectState();
        return {
          success: false,
          cancelled: isCancelled,
          error: description || errorParam,
          returnPath: storedReturnPath
        };
      }

      const code = params.get('code');
      const idToken = params.get('id_token');

      if (!code && !idToken) {
        this.clearRedirectState();
        return {
          success: false,
          error: 'Missing Apple authorization response.',
          returnPath: storedReturnPath
        };
      }

      const returnedState = params.get('state');
      const storedState = this.getStoredState();
      if (storedState && returnedState && storedState !== returnedState) {
        this.clearRedirectState();
        return {
          success: false,
          error: 'Apple sign-in validation failed. Please try again.',
          returnPath: storedReturnPath
        };
      }

      let parsedUser = null;
      const userParam = params.get('user');
      if (userParam) {
        try {
          parsedUser = JSON.parse(userParam);
        } catch (err) {
          console.warn('Unable to parse Apple user payload', err);
        }
      }

      const email = parsedUser?.email || null;
      const fullName = this.extractFullName(parsedUser);

      const result = await this.sendAuthorizationToBackend({
        authorizationCode: code,
        idToken,
        email,
        fullName,
        user: parsedUser || undefined
      });

      this.clearRedirectState();
      return {
        ...result,
        returnPath: storedReturnPath
      };
    } catch (error) {
      this.clearRedirectState();

      if (error?.response?.data?.message) {
        return {
          success: false,
          error: error.response.data.message,
          returnPath: storedReturnPath
        };
      }

      return {
        success: false,
        error: error.message || 'Apple sign-in failed',
        returnPath: storedReturnPath
      };
    }
  }
}

const appleAuthService = new AppleAuthService();
export default appleAuthService;
