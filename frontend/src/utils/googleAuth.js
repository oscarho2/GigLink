import axios from 'axios';

class GoogleAuthService {
  constructor() {
    this.isScriptLoaded = false;
    this.loadPromise = null;
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
        return 'Sign-in was cancelled. Please try again.';
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
    }

    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    return 'An error occurred during sign-in. Please try again.';
  }

  async getIdToken() {
    await this.ensureGisLoaded();

    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('missing_client_id');
    }

    return new Promise((resolve, reject) => {
      let completed = false;

      const finalizeReject = (err) => {
        if (completed) {
          return;
        }
        completed = true;
        if (window.google?.accounts?.id?.cancel) {
          window.google.accounts.id.cancel();
        }
        reject(err);
      };

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (completed) {
            return;
          }

          if (response?.credential) {
            completed = true;
            resolve(response.credential);
          } else if (response?.error) {
            finalizeReject(new Error(response.error));
          } else {
            finalizeReject(new Error('credential_unavailable'));
          }
        },
        ux_mode: 'popup',
        auto_select: false,
        itp_support: true,
        cancel_on_tap_outside: true
      });

      window.google.accounts.id.prompt((notification) => {
        if (completed) {
          return;
        }

        if (notification.isDismissedMoment?.()) {
          const reason = notification.getDismissedReason?.() || 'popup_closed_by_user';
          finalizeReject(new Error(reason));
          return;
        }

        if (notification.isNotDisplayed?.()) {
          const reason = notification.getNotDisplayedReason?.() || 'prompt_not_displayed';
          finalizeReject(new Error(reason));
          return;
        }

        if (notification.isSkippedMoment?.()) {
          const reason = notification.getSkippedReason?.() || 'prompt_skipped';
          finalizeReject(new Error(reason));
        }
      });
    });
  }

  async signInWithGoogle() {
    try {
      const idToken = await this.getIdToken();
      const decoded = this.decodeIdToken(idToken) || {};
      const fullName = decoded.name || [decoded.given_name, decoded.family_name].filter(Boolean).join(' ').trim() || undefined;

      const payload = {
        idToken,
        email: decoded.email,
        name: fullName,
        imageUrl: decoded.picture
      };

      const res = await axios.post('/api/auth/google', payload);

      return {
        success: true,
        token: res.data?.token,
        user: res.data?.user
      };
    } catch (error) {
      console.error('Google OAuth failed:', error);
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }
}

export default new GoogleAuthService();
