/* eslint-disable no-restricted-globals */
/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);

const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');

registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') {
      return false;
    }

    if (url.pathname.startsWith('/_')) {
      return false;
    }

    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }

    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin && request.destination === 'image',
  new CacheFirst({
    cacheName: 'mari-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);

registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    (request.destination === 'style' || request.destination === 'script'),
  new StaleWhileRevalidate({
    cacheName: 'mari-static-resources',
  })
);

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

export {};
