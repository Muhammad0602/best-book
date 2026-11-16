// Registers the service worker that makes the app installable and lets it
// open without a connection. Only used in the production build.
export default function registerServiceWorker() {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${process.env.PUBLIC_URL}/service-worker.js`).catch(() => {
      // The app works without it, just not offline.
    });
  });
}
