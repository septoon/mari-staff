import { useEffect, useState } from 'react';

import {
  getWebPushDeviceState,
  subscribeCurrentBrowserToWebPush,
  unsubscribeCurrentBrowserFromWebPush,
  type WebPushDeviceState,
} from '../webPush';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Не удалось изменить push-подписку.';

export function useWebPushSubscription(enabled: boolean) {
  const [state, setState] = useState<WebPushDeviceState>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setState('unsupported');
      return () => {
        cancelled = true;
      };
    }

    void getWebPushDeviceState()
      .then((nextState) => {
        if (!cancelled) {
          setState(nextState);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setState('unavailable');
          setError(errorMessage(loadError));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const activate = async () => {
    setBusy(true);
    setError(null);
    try {
      await subscribeCurrentBrowserToWebPush();
      setState('subscribed');
      return true;
    } catch (activateError) {
      const nextState = await getWebPushDeviceState().catch(
        (): WebPushDeviceState => 'unavailable',
      );
      setState(nextState);
      setError(errorMessage(activateError));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    setBusy(true);
    setError(null);
    try {
      await unsubscribeCurrentBrowserFromWebPush();
      setState('unsubscribed');
    } catch (deactivateError) {
      setError(errorMessage(deactivateError));
    } finally {
      setBusy(false);
    }
  };

  return { state, busy, error, activate, deactivate };
}
