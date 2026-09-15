/* eslint-disable no-restricted-globals */
/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

clientsClaim();
self.skipWaiting();
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

type WebPushPayload = {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
  appointmentId?: string;
  notificationId?: string;
};

self.addEventListener('push', event => {
  const payload = (() => {
    try {
      return event.data?.json() as WebPushPayload | undefined;
    } catch {
      return undefined;
    }
  })();

  const title = payload?.title?.trim() || 'Mari Staff';
  const body = payload?.body?.trim() || 'Новое уведомление';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: payload?.icon || '/logo192.png',
      badge: payload?.badge || '/logo192.png',
      data: {
        url: payload?.url || '/journal',
        appointmentId: payload?.appointmentId,
        notificationId: payload?.notificationId,
      },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/journal', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      const existing = windowClients.find(client => client.url.startsWith(self.location.origin));
      if (existing) {
        return existing.navigate(targetUrl).then(client => client?.focus());
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

export {};
