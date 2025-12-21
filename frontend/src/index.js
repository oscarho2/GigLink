import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);

        const refreshOnUpdate = (() => {
          let isRefreshing = false;
          return () => {
            if (isRefreshing) {
              return;
            }
            isRefreshing = true;
            window.location.reload();
          };
        })();

        const activateWaitingWorker = () => {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        };

        const checkForUpdates = () => {
          if (typeof registration.update === 'function') {
            registration.update().catch(() => {});
          }
        };

        navigator.serviceWorker.addEventListener('controllerchange', refreshOnUpdate);

        if (registration.waiting) {
          activateWaitingWorker();
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) {
            return;
          }
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              activateWaitingWorker();
            }
          });
        });

        const handleResume = () => {
          checkForUpdates();
          activateWaitingWorker();
        };

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            handleResume();
          }
        });

        window.addEventListener('focus', handleResume);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}
