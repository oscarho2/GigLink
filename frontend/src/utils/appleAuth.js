import axios from 'axios';

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

  async signInWithApple() {
    try {
      const clientId = process.env.REACT_APP_APPLE_CLIENT_ID;
      if (!clientId) {
        throw new Error('Apple Sign-In is not configured. Missing REACT_APP_APPLE_CLIENT_ID.');
      }

      await this.loadScript();

      if (!window.AppleID || !window.AppleID.auth) {
        throw new Error('Apple Sign-In could not be initialized');
      }

      const redirectURI = process.env.REACT_APP_APPLE_REDIRECT_URI || window.location.origin;

      window.AppleID.auth.init({
        clientId,
        scope: 'name email',
        redirectURI,
        state: this.generateState(),
        usePopup: true
      });

      const response = await window.AppleID.auth.signIn();
      const authorization = response?.authorization || {};
      const user = response?.user || {};

      if (!authorization.code && !authorization.id_token) {
        throw new Error('Apple authorization failed.');
      }

      const email = user.email || null;
      let fullName = null;
      if (user.name) {
        const { firstName, lastName, middleName } = user.name;
        fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim() || null;
      }

      const backendResponse = await axios.post('/api/auth/apple', {
        authorizationCode: authorization.code,
        idToken: authorization.id_token,
        email,
        fullName,
        user
      });

      return {
        success: true,
        token: backendResponse.data?.token,
        user: backendResponse.data?.user
      };
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
}

const appleAuthService = new AppleAuthService();
export default appleAuthService;
