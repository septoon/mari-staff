import { ChevronsDown, Loader2 } from 'lucide-react';
import { NotificationRow } from '../components/shared/NotificationRow';
import type { NotificationItem } from '../types';

type NotificationsScreenProps = {
  notifications: NotificationItem[];
  loading: boolean;
  onReload: () => void;
  onOpenAll: () => void;
};

export function NotificationsScreen({
  notifications,
  loading,
  onReload,
  onOpenAll,
}: NotificationsScreenProps) {
  const main = notifications.slice(0, 6);
  const extra = notifications.slice(6);

  return (
    <div className="pb-7 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[30px] font-extrabold leading-none text-ink">Уведомления</h1>
        <button type="button" onClick={onReload} className="rounded-lg p-2">
          <ChevronsDown className="h-7 w-7 text-muted" />
        </button>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <h2 className="text-[24px] font-extrabold leading-none text-ink">Записи</h2>
        <button type="button" className="text-[16px] font-medium text-muted" onClick={onOpenAll}>
          Посмотреть все
        </button>
      </div>

      <div className="mt-4 space-y-2 rounded-3xl bg-notice p-4">
        {main.length > 0 ? (
          main.map((item) => (
            <NotificationRow key={item.id} label={item.label} time={item.time} mode={item.mode} />
          ))
        ) : (
          <p className="text-sm font-semibold text-muted">Нет уведомлений</p>
        )}
      </div>

      <h2 className="mt-8 text-[24px] font-extrabold leading-none text-ink">Остальные</h2>
      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загружаю события...
        </div>
      ) : null}
      {!loading && extra.length === 0 ? (
        <p className="mt-4 text-[16px] font-medium text-ink">Нет уведомлений</p>
      ) : null}
      {!loading && extra.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {extra.map((item) => (
            <li key={item.id}>
              <NotificationRow label={item.label} time={item.time} mode={item.mode} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
