import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  ArrowLeft,
  BellRing,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  Mail,
} from 'lucide-react';
import { PrimeSwitch } from '../components/shared/PrimeSwitch';
import type { SettingsNotificationSection } from '../types';

type SettingsNotificationsScreenProps = {
  sections: SettingsNotificationSection[];
  minNoticeMinutes: number | null;
  canEdit: boolean;
  loading: boolean;
  onBack: () => void;
  onSaveMinNotice: (value: number) => Promise<boolean>;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
};

export function SettingsNotificationsScreen({
  sections,
  minNoticeMinutes,
  canEdit,
  loading,
  onBack,
  onSaveMinNotice,
  onToggle,
}: SettingsNotificationsScreenProps) {
  const [draftMinNotice, setDraftMinNotice] = useState(String(minNoticeMinutes ?? 120));
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);

  useEffect(() => {
    setDraftMinNotice(String(minNoticeMinutes ?? 120));
  }, [minNoticeMinutes]);

  useEffect(() => {
    if (sections.length === 0) {
      setExpandedSectionIds([]);
      return;
    }
    setExpandedSectionIds((current) => {
      if (current.length > 0) {
        return current;
      }
      return sections.map((section) => section.id);
    });
  }, [sections]);

  const totalItems = useMemo(
    () =>
      sections.reduce(
        (count, section) =>
          count + section.groups.reduce((groupCount, group) => groupCount + group.items.length, 0),
        0,
      ),
    [sections],
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    );
  };

  const handleSave = async () => {
    const parsed = Number(draftMinNotice);
    await onSaveMinNotice(parsed);
  };

  return (
    <>
      <div className="pb-8 pt-6 md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d9dfe8] bg-white text-ink"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Настройки</p>
            <h1 className="mt-1 text-[26px] font-extrabold leading-none text-ink">Уведомления</h1>
          </div>
        </div>

        <section className="mt-5 rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-5 shadow-[0_16px_34px_rgba(42,49,56,0.08)]">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#fff6cf] text-[#9b7a06]">
              <Clock3 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Напоминание перед визитом</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#707a88]">
                За сколько минут до записи отправлять клиенту письмо-напоминание.
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <input
              type="number"
              min={1}
              step={1}
              value={draftMinNotice}
              onChange={(event) => setDraftMinNotice(event.target.value)}
              disabled={!canEdit || loading}
              className="h-12 min-w-0 flex-1 rounded-2xl border border-[#d9dfe8] bg-white px-4 text-base font-bold text-ink outline-none transition focus:border-[#f4c900] disabled:bg-[#f3f5f8] disabled:text-[#98a1ae]"
            />
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canEdit || loading}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#f4c900] px-4 text-sm font-extrabold text-[#202733] shadow-[0_14px_28px_rgba(244,201,0,0.28)] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить'}
            </button>
          </div>
        </section>

        {!canEdit ? (
          <p className="mt-3 text-sm font-semibold text-[#707a88]">
            Изменение настроек доступно только владельцу.
          </p>
        ) : null}

        <div className="mt-5 space-y-3">
          {sections.map((section) => {
            const expanded = expandedSectionIds.includes(section.id);
            return (
              <section
                key={section.id}
                className="rounded-[24px] border border-[#e2e6ed] bg-[#fcfcfd] shadow-[0_16px_34px_rgba(42,49,56,0.08)]"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-[22px] font-extrabold leading-none text-ink">{section.title}</span>
                  {expanded ? (
                    <ChevronUp className="h-5 w-5 text-[#7b8795]" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-[#7b8795]" />
                  )}
                </button>

                {expanded ? (
                  <div className="border-t border-[#edf1f5] px-4 py-2">
                    {section.groups.map((group) => (
                      <div key={group.id}>
                        {group.title ? (
                          <p className="px-2 pb-2 pt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">
                            {group.title}
                          </p>
                        ) : null}
                        <div className="space-y-1">
                          {group.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-3 rounded-[20px] px-2 py-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-[15px] font-semibold leading-6 text-ink">{item.title}</p>
                                <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#eff3f7] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#5e6776]">
                                  <Mail className="h-3.5 w-3.5" />
                                  {item.channelLabel}
                                </span>
                              </div>
                              <PrimeSwitch
                                checked={item.enabled}
                                disabled={!canEdit || loading}
                                onChange={(enabled) => void onToggle(item.id, enabled)}
                                size="sm"
                                ariaLabel={item.title}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>

      <div className="hidden pb-6 md:block">
        <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] px-6 py-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Настройки</p>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                Уведомления
              </h1>
              <p className="mt-3 max-w-[720px] text-[16px] font-semibold leading-7 text-[#748091]">
                Управление всеми письмами салона. Напоминание клиенту отправляется за заданное
                число минут до визита, остальные письма уходят сразу после соответствующего
                события.
              </p>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#d9dfe8] bg-white px-5 text-sm font-bold text-ink transition hover:border-[#c7d0dc] hover:bg-[#f7f9fc]"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </button>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#fff6cf] text-[#9b7a06]">
                  <BellRing className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Сценарии</p>
                  <p className="mt-3 text-[30px] font-extrabold leading-[0.98] tracking-[-0.03em] text-ink">
                    {totalItems}
                  </p>
                  <p className="mt-3 text-sm font-semibold leading-7 text-[#748091]">
                    Сценарии отправки писем для клиентов, администраторов и сотрудников.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#eff3f7] text-[#5f6a78]">
                  <Clock3 className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Напоминание перед визитом</p>
                  <p className="mt-3 text-sm font-semibold leading-7 text-[#748091]">
                    Значение используется только для письма-напоминания перед визитом.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={draftMinNotice}
                  onChange={(event) => setDraftMinNotice(event.target.value)}
                  disabled={!canEdit || loading}
                  className="h-[52px] min-w-0 flex-1 rounded-[20px] border border-[#d9dfe8] bg-white px-4 text-[18px] font-bold text-ink outline-none transition focus:border-[#f4c900] disabled:bg-[#f3f5f8] disabled:text-[#98a1ae]"
                />
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!canEdit || loading}
                  className="inline-flex h-[52px] items-center justify-center rounded-[20px] bg-[#f4c900] px-5 text-sm font-extrabold text-[#202733] shadow-[0_14px_28px_rgba(244,201,0,0.28)] disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить'}
                </button>
              </div>

              {!canEdit ? (
                <p className="mt-4 text-sm font-semibold leading-7 text-[#748091]">
                  Просмотр доступен всем сотрудникам, изменение только владельцу.
                </p>
              ) : (
                <p className="mt-4 text-sm font-semibold leading-7 text-[#748091]">
                  Переключатели ниже сохраняются сразу после изменения.
                </p>
              )}
            </section>
          </aside>

          <div className="space-y-4">
            {sections.map((section) => {
              const expanded = expandedSectionIds.includes(section.id);
              return (
                <section
                  key={section.id}
                  className="overflow-hidden rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] shadow-[0_18px_40px_rgba(42,49,56,0.08)]"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="text-[28px] font-extrabold leading-none tracking-[-0.03em] text-ink">
                      {section.title}
                    </span>
                    {expanded ? (
                      <ChevronUp className="h-5 w-5 text-[#7b8795]" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-[#7b8795]" />
                    )}
                  </button>

                  {expanded ? (
                    <div className="border-t border-[#edf1f5] px-6 pb-4 pt-2">
                      {section.groups.map((group) => (
                        <div key={group.id}>
                          {group.title ? (
                            <p className="pb-2 pt-4 text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">
                              {group.title}
                            </p>
                          ) : null}
                          <div className="overflow-hidden rounded-[24px] border border-[#edf1f5] bg-white">
                            {group.items.map((item, index) => (
                              <div
                                key={item.id}
                                className={clsx(
                                  'flex items-center justify-between gap-4 px-5 py-4',
                                  index > 0 ? 'border-t border-[#edf1f5]' : undefined,
                                )}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-[17px] font-semibold leading-7 text-ink">{item.title}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-4">
                                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#eff3f7] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#5e6776]">
                                    <Mail className="h-3.5 w-3.5" />
                                    {item.channelLabel}
                                  </span>
                                  <PrimeSwitch
                                    checked={item.enabled}
                                    disabled={!canEdit || loading}
                                    onChange={(enabled) => void onToggle(item.id, enabled)}
                                    size="sm"
                                    ariaLabel={item.title}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
