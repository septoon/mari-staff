import { api } from './api';

type WebPushConfig = {
  enabled: boolean;
  publicKey: string | null;
};

export type WebPushDeviceState =
  | 'checking'
  | 'unsupported'
  | 'unavailable'
  | 'denied'
  | 'unsubscribed'
  | 'subscribed';

const isSupported = () =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

const urlBase64ToUint8Array = (value: string) => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
};

const loadConfig = () => api.get<WebPushConfig>('/staff/push/web/config');

const loadRegistration = () => navigator.serviceWorker.ready;

export const getWebPushDeviceState = async (): Promise<WebPushDeviceState> => {
  if (!isSupported()) {
    return 'unsupported';
  }

  const config = await loadConfig();
  if (!config.enabled || !config.publicKey) {
    return 'unavailable';
  }
  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const registration = await loadRegistration();
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? 'subscribed' : 'unsubscribed';
};

export const subscribeCurrentBrowserToWebPush = async () => {
  if (!isSupported()) {
    throw new Error('Этот браузер не поддерживает Web Push. На iPhone добавьте Staff на экран «Домой».');
  }

  const config = await loadConfig();
  if (!config.enabled || !config.publicKey) {
    throw new Error('Web Push пока не настроен на сервере.');
  }

  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== 'granted') {
    throw new Error('Разрешение на push не выдано. Включите уведомления в настройках устройства.');
  }

  const registration = await loadRegistration();
  let subscription = await registration.pushManager.getSubscription();
  let created = false;

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    });
    created = true;
  }

  try {
    const serialized = subscription.toJSON();
    if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
      throw new Error('Браузер вернул неполную push-подписку.');
    }

    await api.post('/staff/push/web/subscriptions', {
      endpoint: serialized.endpoint,
      expirationTime: serialized.expirationTime ?? null,
      keys: {
        p256dh: serialized.keys.p256dh,
        auth: serialized.keys.auth,
      },
    });
  } catch (error) {
    if (created) {
      await subscription.unsubscribe().catch(() => false);
    }
    throw error;
  }
};

export const syncCurrentBrowserWebPushSubscription = async () => {
  if (!isSupported() || Notification.permission !== 'granted') {
    return;
  }

  const config = await loadConfig();
  if (!config.enabled || !config.publicKey) {
    return;
  }

  const registration = await loadRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return;
  }

  const serialized = subscription.toJSON();
  if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
    return;
  }

  await api.post('/staff/push/web/subscriptions', {
    endpoint: serialized.endpoint,
    expirationTime: serialized.expirationTime ?? null,
    keys: {
      p256dh: serialized.keys.p256dh,
      auth: serialized.keys.auth,
    },
  });
};

export const unsubscribeCurrentBrowserFromWebPush = async () => {
  if (!isSupported()) {
    return;
  }

  const registration = await loadRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return;
  }

  let apiError: unknown = null;
  try {
    await api.delete('/staff/push/web/subscriptions', {
      endpoint: subscription.endpoint,
    });
  } catch (error) {
    apiError = error;
  }

  await subscription.unsubscribe().catch(() => false);
  if (apiError) {
    throw apiError;
  }
};
