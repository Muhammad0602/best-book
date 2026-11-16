/* eslint-disable no-restricted-globals, no-underscore-dangle */
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

// A new version of the app takes over on the next visit.
self.skipWaiting();
clientsClaim();

// The app itself (HTML, scripts, styles, fonts): available offline.
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Quran text: answer from the saved copy straight away and refresh it in the
// background, so surahs that were opened before can be read offline.
registerRoute(
  ({ url }) => url.origin === 'https://api.alquran.cloud',
  new StaleWhileRevalidate({
    cacheName: 'quran-text',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 200 }),
    ],
  }),
);
