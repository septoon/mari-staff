import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Loader2, UserRound } from 'lucide-react';
import clsx from 'clsx';
import type { StaffItem } from '../types';

const DESKTOP_PANEL_CLASS =
  'rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]';

type ServiceProvidersEditorScreenProps = {
  serviceName: string;
  providers: StaffItem[];
  assignableStaff: StaffItem[];
  providersLoading: boolean;
  loading: boolean;
  onBack: () => void;
  onSave: (staffIds: string[]) => void;
};

export function ServiceProvidersEditorScreen({
  serviceName,
  providers,
  assignableStaff,
  providersLoading,
  loading,
  onBack,
  onSave,
}: ServiceProvidersEditorScreenProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds(providers.map((item) => item.id));
  }, [providers]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleStaff = (staffId: string) => {
    setSelectedIds((prev) =>
      prev.includes(staffId) ? prev.filter((item) => item !== staffId) : [...prev, staffId],
    );
  };

  return (
    <>
      <div className="pb-6 pt-4 md:hidden">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1 px-3 text-center">
            <h1 className="truncate text-[24px] font-extrabold text-ink">Исполнители</h1>
            <p className="truncate text-[14px] font-semibold text-muted">{serviceName}</p>
          </div>
          <div className="w-10" />
        </div>

        <div className="space-y-3">
          {assignableStaff.map((person) => {
            const selected = selectedSet.has(person.id);
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => toggleStaff(person.id)}
                className="flex w-full items-center gap-3 rounded-[24px] border border-line bg-screen px-4 py-3 text-left"
              >
                <span
                  className={clsx(
                    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    selected ? 'bg-accent text-[#1f2937]' : 'border border-[#c5ccd7] bg-white',
                  )}
                >
                  {selected ? <Check className="h-4 w-4" /> : null}
                </span>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e4e8ee]">
                  {person.avatarUrl ? (
                    <img src={person.avatarUrl} alt={person.name} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-5 w-5 text-[#68768a]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-semibold text-ink">{person.name}</p>
                  <p className="truncate text-[13px] font-medium text-muted">
                    {person.positionName || 'Мастер'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {!providersLoading && assignableStaff.length === 0 ? (
          <p className="mt-4 text-sm font-semibold text-muted">Нет доступных сотрудников</p>
        ) : null}

        <button
          type="button"
          onClick={() => onSave(selectedIds)}
          disabled={loading || providersLoading}
          className="mt-5 w-full rounded-3xl bg-accent py-4 text-[20px] font-extrabold text-[#222b33] disabled:opacity-50"
        >
          {loading ? 'Сохраняю...' : 'Сохранить назначения'}
        </button>
      </div>

      <div className="hidden pb-6 pt-6 md:block">
        <section className={DESKTOP_PANEL_CLASS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Услуги</p>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                Исполнители услуги
              </h1>
              <p className="mt-4 max-w-[760px] text-[15px] font-semibold leading-6 text-[#7c8491]">
                Назначь мастеров, которые могут оказывать услугу «{serviceName}». Это отдельный
                сценарий настройки команды, без редактирования цены, описания и длительности.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-semibold text-ink"
              >
                <ArrowLeft className="h-4 w-4 text-[#8892a2]" />
                Назад
              </button>
              <button
                type="button"
                onClick={() => onSave(selectedIds)}
                disabled={loading || providersLoading}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Сохранить назначения
              </button>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className={DESKTOP_PANEL_CLASS}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Услуга</p>
              <p className="mt-3 text-[28px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink">
                {serviceName}
              </p>
              <p className="mt-4 text-sm font-semibold leading-7 text-[#748091]">
                Здесь настраивается только список сотрудников. Для описания, цены и длительности
                используй основной редактор услуги.
              </p>
            </section>

            <section className={DESKTOP_PANEL_CLASS}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Сводка</p>
              <div className="mt-4 rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">Назначено</p>
                <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{selectedIds.length}</p>
              </div>
            </section>
          </aside>

          <section className={DESKTOP_PANEL_CLASS}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Команда</p>
                <p className="mt-3 text-[30px] font-extrabold leading-none tracking-[-0.03em] text-ink">
                  Мастера услуги
                </p>
              </div>
              {providersLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted" /> : null}
            </div>

            <div className="mt-6 grid gap-3">
              {assignableStaff.map((person) => {
                const selected = selectedSet.has(person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => toggleStaff(person.id)}
                    className={clsx(
                      'flex items-center gap-4 rounded-[24px] border px-5 py-4 text-left transition',
                      selected
                        ? 'border-[#f4c900] bg-[#fffbee]'
                        : 'border-[#e5e9f0] bg-white hover:border-[#d5dce6]',
                    )}
                  >
                    <span
                      className={clsx(
                        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                        selected ? 'bg-[#f4c900] text-[#222b33]' : 'border border-[#c5ccd7] bg-white',
                      )}
                    >
                      {selected ? <Check className="h-4 w-4" /> : null}
                    </span>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e4e8ee]">
                      {person.avatarUrl ? (
                        <img src={person.avatarUrl} alt={person.name} className="h-full w-full object-cover" />
                      ) : (
                        <UserRound className="h-5 w-5 text-[#68768a]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[18px] font-extrabold text-ink">{person.name}</p>
                      <p className="mt-1 truncate text-sm font-semibold text-[#7d8693]">
                        {person.positionName || 'Мастер'}
                      </p>
                    </div>
                  </button>
                );
              })}

              {!providersLoading && assignableStaff.length === 0 ? (
                <p className="text-sm font-semibold text-[#7d8693]">Нет доступных сотрудников</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
