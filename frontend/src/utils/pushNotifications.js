// Push notification utility for frontend

class PushNotificationService {
  constructor() {
    this.mode = this.detectMode();
    this.isSupported = this.mode !== 'unsupported';
    this.registration = null;
    this.vapidPublicKey = null;
    this.nativeListenersAttached = false;
    this.nativeDeviceToken = null;
    this.nativeSubscriptionKey = 'giglink-native-apns-token';
  }

  detectMode() {
    const hasWindow = typeof window !== 'undefined';
    const hasNavigator = typeof navigator !== 'undefined';

    const hasNativeBridge = hasWindow && Boolean(
      window._nativePush ||
      window.webkit?.messageHandlers?.['push-permission-request']
    );

    if (hasNativeBridge) {
      return 'native';
    }

    const webSupported = hasNavigator && 'serviceWorker' in navigator && hasWindow && 'PushManager' in window;
    return webSupported ? 'web' : 'unsupported';
  }

  isNativeMode() {
    return this.mode === 'native';
  }

  isWebMode() {
    return this.mode === 'web';
  }

  setMode(mode) {
    this.mode = mode;
    this.isSupported = mode !== 'unsupported';
  }

  attachNativeListeners() {
    if (this.nativeListenersAttached || typeof window === 'undefined') {
      return;
    }

    const tokenHandler = (event) => {
      const token = this.normalizeToken(event?.detail);
      if (token) {
        this.nativeDeviceToken = token;
        if (!this.getPersistedNativeToken()) {
          this.persistNativeToken(token);
        }
      }
    };

    const permissionHandler = (event) => {
      const permission = event?.detail;
      if (permission && typeof Notification !== 'undefined') {
        Notification.permission = permission;
      }
    };

    window.addEventListener('apns-token', tokenHandler);
    window.addEventListener('push-token', tokenHandler);
    window.addEventListener('push-permission-state', permissionHandler);

    // Ask native bridge to report current permission state if available
    try {
      window.webkit?.messageHandlers?.['push-permission-state']?.postMessage(null);
    } catch (err) {
      // ignore bridge failures
    }

    // Mark supported if the native shim emits push-supported
    const supportedHandler = () => {
      this.setMode('native');
    };
    window.addEventListener('push-supported', supportedHandler);

    this.nativeListenersAttached = true;
  }

  normalizeToken(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') {
      const trimmed = raw.trim().replace(/^['"]|['"]$/g, '');
      if (!trimmed || trimmed === 'ERROR GET TOKEN') return null;
      return trimmed;
    }
    if (typeof raw === 'object') {
      if (typeof raw.token === 'string') {
        return this.normalizeToken(raw.token);
      }
      if (typeof raw.detail === 'string') {
        return this.normalizeToken(raw.detail);
      }
    }
    return null;
  }

  persistNativeToken(token) {
    try {
      if (token) {
        localStorage.setItem(this.nativeSubscriptionKey, token);
      } else {
        localStorage.removeItem(this.nativeSubscriptionKey);
      }
    } catch (err) {
      // ignore storage failures
    }
  }

  getPersistedNativeToken() {
    try {
      return localStorage.getItem(this.nativeSubscriptionKey);
    } catch (err) {
      return null;
    }
  }

  waitForNativeToken(timeoutMs = 8000) {
    const existing = this.nativeDeviceToken || this.getPersistedNativeToken();
    if (existing) {
      return Promise.resolve(existing);
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const complete = (value, isError = false) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        window.removeEventListener('apns-token', onToken);
        window.removeEventListener('push-token', onToken);
        if (isError) {
          reject(value);
        } else {
          resolve(value);
        }
      };

      const onToken = (event) => {
        const token = this.normalizeToken(event?.detail);
        if (token) {
          this.nativeDeviceToken = token;
          this.persistNativeToken(token);
          complete(token);
        }
      };

      const timer = setTimeout(() => {
        complete(new Error('Timed out waiting for device token'), true);
      }, timeoutMs);

      window.addEventListener('apns-token', onToken);
      window.addEventListener('push-token', onToken);

      // Ask native bridge to push the token if possible
      try {
        window.webkit?.messageHandlers?.['push-token']?.postMessage(null);
      } catch (err) {
        // ignore bridge failures
      }
    });
  }

  // Initialize push notifications
  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    if (this.isNativeMode()) {
      this.attachNativeListeners();
      return true;
    }

    const ready = await this.ensureWebInitialized();
    return ready;
  }

  async ensureWebInitialized() {
    if (!this.isWebMode() || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      // Register service worker
      if (!this.registration) {
        // Reuse existing registration if present
        this.registration = await navigator.serviceWorker.getRegistration();
      }

      if (!this.registration) {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
      }

      if (this.registration) {
        this.setMode('web');
      }

      // Get VAPID public key from server
      if (!this.vapidPublicKey) {
        const response = await fetch('/api/notifications/vapid-public-key');
        if (!response.ok) {
          throw new Error(`Failed to fetch VAPID key: ${response.status}`);
        }
        const data = await response.json();
        this.vapidPublicKey = data.publicKey;
      }

      return true;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      try {
        // As a fallback, wait for any existing ready registration
        this.registration = await navigator.serviceWorker.ready;
      } catch (e) {
        // ignore
      }
      return false;
    }
  }

  // Request permission for notifications
  async requestPermission() {
    if (!this.isSupported) {
      return 'unsupported';
    }

    if (typeof Notification === 'undefined' || typeof Notification.requestPermission !== 'function') {
      return 'unsupported';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  // Subscribe to push notifications
  async subscribe(token) {
    if (this.isNativeMode()) {
      return this.subscribeNative(token);
    }

    await this.ensureWebInitialized();

    if (!this.registration && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.ready;
      } catch (err) {
        console.warn('Service worker not ready for push subscription', err);
      }
    }

    if (!this.registration || !this.vapidPublicKey) {
      if (!this.registration) {
        throw new Error('Push notification service worker is not ready');
      }
      throw new Error('VAPID public key missing; cannot subscribe to push notifications');
    }

    try {
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);

      // If a subscription already exists, reuse it when keys match; otherwise reset it
      const existing = await this.registration.pushManager.getSubscription();
      if (existing) {
        const existingKey = this.getSubscriptionKey(existing);
        const desiredKey = this.normalizeVapidKey(this.vapidPublicKey);

        if (existingKey && existingKey === desiredKey) {
          await this.sendSubscriptionToServer(existing, token);
          console.log('Reusing existing push subscription');
          return existing;
        }

        try {
          await existing.unsubscribe();
          console.log('Removed stale push subscription with outdated VAPID key');
        } catch (unsubscribeError) {
          console.warn('Unable to remove existing push subscription before re-subscribing', unsubscribeError);
        }
      }

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      await this.sendSubscriptionToServer(subscription, token);
      console.log('Successfully subscribed to push notifications');
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  async subscribeNative(token) {
    try {
      const deviceToken = await this.waitForNativeToken();
      const environment = process.env.REACT_APP_APNS_ENV === 'sandbox' ? 'sandbox' : 'production';
      const response = await fetch('/api/notifications/apns/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          deviceToken,
          environment
        })
      });

      if (!response.ok) {
        throw new Error('Failed to register device for native push notifications');
      }

      this.persistNativeToken(deviceToken);
      console.log('Successfully registered native push token');
      return { deviceToken };
    } catch (error) {
      console.error('Error subscribing to native push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(token) {
    if (this.isNativeMode()) {
      return this.unsubscribeNative(token);
    }

    await this.ensureWebInitialized().catch(() => {});

    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    if (!this.registration) {
      try {
        this.registration = await navigator.serviceWorker.ready;
      } catch (err) {
        console.warn('Service worker not ready for push unsubscribe', err);
        return;
      }
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove subscription from server
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });

        console.log('Successfully unsubscribed from push notifications');
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  async unsubscribeNative(token) {
    try {
      const deviceToken = this.getPersistedNativeToken() || this.nativeDeviceToken || await this.waitForNativeToken(4000).catch(() => null);
      if (!deviceToken) {
        return;
      }

      await fetch('/api/notifications/apns/unregister', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ deviceToken })
      });

      this.persistNativeToken('');
      console.log('Successfully unregistered native push token');
    } catch (error) {
      console.error('Error unsubscribing from native push notifications:', error);
      throw error;
    }
  }

  // Check if user is currently subscribed
  async isSubscribed() {
    if (this.isNativeMode()) {
      return Boolean(this.getPersistedNativeToken());
    }

    await this.ensureWebInitialized().catch(() => {});

    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    if (!this.registration) {
      try {
        this.registration = await navigator.serviceWorker.ready;
      } catch (err) {
        console.warn('Service worker not ready for push subscription check', err);
        return false;
      }
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription && this.vapidPublicKey) {
        const existingKey = this.getSubscriptionKey(subscription);
        const desiredKey = this.normalizeVapidKey(this.vapidPublicKey);
        if (existingKey && desiredKey && existingKey !== desiredKey) {
          await subscription.unsubscribe().catch(() => {});
          return false;
        }
      }
      return !!subscription;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  // Get current subscription
  async getSubscription() {
    if (this.isNativeMode()) {
      const deviceToken = this.getPersistedNativeToken() || this.nativeDeviceToken;
      return deviceToken ? { deviceToken } : null;
    }

    if (!this.registration) {
      return null;
    }

    try {
      return await this.registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }

  // Helper function to convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  normalizeVapidKey(key) {
    return (key || '').replace(/=+$/, '');
  }

  getSubscriptionKey(subscription) {
    try {
      const keyArrayBuffer = subscription?.options?.applicationServerKey;
      if (!keyArrayBuffer) return '';
      const keyArray = new Uint8Array(keyArrayBuffer);
      let binary = '';
      keyArray.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      const base64 = btoa(binary);
      return this.normalizeVapidKey(base64.replace(/\+/g, '-').replace(/\//g, '_'));
    } catch (err) {
      console.warn('Failed to read subscription key', err);
      return '';
    }
  }

  async sendSubscriptionToServer(subscription, token) {
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({ subscription })
    });

    if (!response.ok) {
      throw new Error('Failed to subscribe to push notifications');
    }
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
