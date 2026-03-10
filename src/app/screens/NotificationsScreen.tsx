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
    <>
      <div className="pb-7 pt-6 md:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-extrabold leading-none text-ink">Уведомления</h1>
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

      <div className="hidden pb-6 md:block">
        <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">События</p>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                Уведомления
              </h1>
            </div>
            <button
              type="button"
              onClick={onReload}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-semibold text-ink"
            >
              <ChevronsDown className="h-4 w-4 text-[#8892a2]" />
              Обновить
            </button>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.42fr)]">
          <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8d95a1]">Главное</p>
                <h2 className="mt-2 text-[30px] font-extrabold leading-none text-ink">Записи</h2>
              </div>
              <button type="button" onClick={onOpenAll} className="text-sm font-semibold text-[#7e8794]">
                Открыть журнал
              </button>
            </div>

            <div className="mt-5 space-y-2 rounded-[24px] bg-notice p-4">
              {main.length > 0 ? (
                main.map((item) => (
                  <NotificationRow key={item.id} label={item.label} time={item.time} mode={item.mode} />
                ))
              ) : (
                <p className="text-sm font-semibold text-muted">Нет уведомлений</p>
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8d95a1]">Остальные</p>
            {loading ? (
              <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загружаю события...
              </div>
            ) : null}
            {!loading && extra.length === 0 ? (
              <p className="mt-4 text-[16px] font-medium text-ink">Нет уведомлений</p>
            ) : null}
            {!loading && extra.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {extra.map((item) => (
                  <li key={item.id}>
                    <NotificationRow label={item.label} time={item.time} mode={item.mode} />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}
