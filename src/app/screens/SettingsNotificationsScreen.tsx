import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BellOff, BellRing, CheckCircle2, ChevronDown, ChevronUp, Clock3, Loader2, Mail } from 'lucide-react';
import { InputSwitch } from 'primereact/inputswitch';
import type { NotificationChannel, SettingsNotificationItem, SettingsNotificationSection } from '../types';
import { useWebPushSubscription } from '../useWebPushSubscription';

type SettingsNotificationsScreenProps = {
  sections: SettingsNotificationSection[];
  minNoticeMinutes: number | null;
  canEdit: boolean;
  canEditChannels: boolean;
  isPersonalOnly: boolean;
  loading: boolean;
  onBack: () => void;
  onSaveMinNotice: (value: number) => Promise<boolean>;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  onToggleChannel: (id: string, channel: NotificationChannel, enabled: boolean) => Promise<void>;
};

const channelLabel = (channel: NotificationChannel) => (channel === 'email' ? 'Эл. почта' : 'Push');

const channelEnabled = (item: SettingsNotificationItem, channel: NotificationChannel) =>
  channel === 'email' ? item.emailEnabled : item.pushEnabled;

function ChannelBadge({ channel }: { channel: NotificationChannel }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#eff3f7] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#5e6776]">
      {channel === 'email' ? <Mail className="h-3.5 w-3.5" /> : null}
      {channelLabel(channel)}
    </span>
  );
}

export function SettingsNotificationsScreen({
  sections,
  minNoticeMinutes,
  canEdit,
  canEditChannels,
  isPersonalOnly,
  loading,
  onBack,
  onSaveMinNotice,
  onToggle,
  onToggleChannel,
}: SettingsNotificationsScreenProps) {
  const [draftMinNotice, setDraftMinNotice] = useState(String(minNoticeMinutes ?? 120));
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);
  const webPush = useWebPushSubscription(canEditChannels);

  const visibleSections = useMemo(
    () => (isPersonalOnly ? sections.filter((section) => section.id === 'staff') : sections),
    [isPersonalOnly, sections],
  );

  const totalItems = useMemo(
    () => visibleSections.reduce(
      (count, section) => count + section.groups.reduce((groupCount, group) => groupCount + group.items.length, 0),
      0,
    ),
    [visibleSections],
  );

  useEffect(() => {
    setDraftMinNotice(String(minNoticeMinutes ?? 120));
  }, [minNoticeMinutes]);

  useEffect(() => {
    setExpandedSectionIds((current) => {
      const valid = current.filter((id) => visibleSections.some((section) => section.id === id));
      return valid.length > 0 ? valid : visibleSections.map((section) => section.id);
    });
  }, [visibleSections]);

  const toggleSection = (sectionId: string) => {
    setExpandedSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    );
  };

  const saveMinNotice = () => {
    void onSaveMinNotice(Number(draftMinNotice));
  };

  const toggleChannel = async (
    id: string,
    channel: NotificationChannel,
    enabled: boolean,
  ) => {
    if (channel === 'push' && enabled && webPush.state !== 'subscribed') {
      const activated = await webPush.activate();
      if (!activated) {
        return;
      }
    }
    await onToggleChannel(id, channel, enabled);
  };

  const webPushDescription = (() => {
    switch (webPush.state) {
      case 'subscribed':
        return 'Этот браузер зарегистрирован и может получать push.';
      case 'denied':
        return 'Уведомления запрещены в настройках браузера или устройства.';
      case 'unsupported':
        return 'На iPhone добавьте Staff на экран «Домой», затем откройте настройки из PWA.';
      case 'unavailable':
        return 'Web Push пока недоступен на сервере.';
      case 'checking':
        return 'Проверяем поддержку и подписку браузера…';
      default:
        return 'Включите push отдельно на каждом устройстве, где работаете со Staff.';
    }
  })();

  return (
    <div className="pb-8 pt-6">
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
          <h1 className="mt-1 text-[26px] font-extrabold leading-none text-ink">
            {isPersonalOnly ? 'Мои уведомления' : 'Уведомления'}
          </h1>
        </div>
      </div>

      {!isPersonalOnly ? (
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
              className="h-12 min-w-0 flex-1 rounded-2xl border border-[#d9dfe8] bg-white px-4 text-base font-bold text-ink outline-none disabled:bg-[#f3f5f8] disabled:text-[#98a1ae]"
            />
            <button
              type="button"
              onClick={saveMinNotice}
              disabled={!canEdit || loading}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#f4c900] px-4 text-sm font-extrabold text-[#202733] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить'}
            </button>
          </div>
        </section>
      ) : (
        <p className="mt-4 text-sm font-semibold leading-6 text-[#707a88]">
          Выберите каналы, через которые хотите получать уведомления о своих записях.
        </p>
      )}

      {canEditChannels ? (
        <section className="mt-5 rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-5 shadow-[0_16px_34px_rgba(42,49,56,0.08)]">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#fff6cf] text-[#9b7a06]">
              {webPush.state === 'subscribed' ? <CheckCircle2 className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Push на этом устройстве</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#707a88]">{webPushDescription}</p>
              {webPush.error ? <p className="mt-2 text-sm font-semibold text-[#b54747]">{webPush.error}</p> : null}
            </div>
          </div>
          {webPush.state === 'subscribed' ? (
            <button
              type="button"
              onClick={() => void webPush.deactivate()}
              disabled={webPush.busy}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl border border-[#d9dfe8] bg-white px-4 text-sm font-extrabold text-[#5e6776] disabled:opacity-60"
            >
              {webPush.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Отключить на устройстве'}
            </button>
          ) : webPush.state === 'unsubscribed' || webPush.state === 'denied' ? (
            <button
              type="button"
              onClick={() => void webPush.activate()}
              disabled={webPush.busy || webPush.state === 'denied'}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-[#f4c900] px-4 text-sm font-extrabold text-[#202733] disabled:opacity-60"
            >
              {webPush.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Включить push'}
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="mt-5 rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-5 shadow-[0_16px_34px_rgba(42,49,56,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#fff6cf] text-[#9b7a06]">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Сценарии</p>
            <p className="mt-1 text-2xl font-extrabold leading-none text-ink">{totalItems}</p>
          </div>
        </div>
        {!isPersonalOnly && !canEdit ? (
          <p className="mt-4 text-sm font-semibold leading-6 text-[#707a88]">
            Глобальные сценарии изменяет только владелец. Каналы можно настроить для своей учётной записи.
          </p>
        ) : null}
      </section>

      <div className="mt-5 space-y-3">
        {visibleSections.map((section) => {
          const expanded = expandedSectionIds.includes(section.id);
          const personalChannels = section.id !== 'clients';
          return (
            <section key={section.id} className="overflow-hidden rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] shadow-[0_16px_34px_rgba(42,49,56,0.08)]">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-[22px] font-extrabold leading-none text-ink">{section.title}</span>
                {expanded ? <ChevronUp className="h-5 w-5 text-[#7b8795]" /> : <ChevronDown className="h-5 w-5 text-[#7b8795]" />}
              </button>

              {expanded ? (
                <div className="border-t border-[#edf1f5] px-4 py-2">
                  {section.groups.map((group) => (
                    <div key={group.id}>
                      {group.title ? <p className="px-2 pb-2 pt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">{group.title}</p> : null}
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <div key={item.id} className="rounded-[20px] px-2 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-[15px] font-semibold leading-6 text-ink">{item.title}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {item.channels.map((channel) => <ChannelBadge key={channel} channel={channel} />)}
                                </div>
                              </div>
                              {!isPersonalOnly ? (
                                <InputSwitch
                                  checked={item.enabled}
                                  disabled={!canEdit || loading}
                                  onChange={(event) => void onToggle(item.id, Boolean(event.value))}
                                  className="journal-settings-switch shrink-0"
                                  aria-label={item.title}
                                />
                              ) : null}
                            </div>

                            {personalChannels ? (
                              <div className="mt-3 flex flex-wrap gap-4">
                                {item.channels.map((channel) => (
                                  <label key={channel} className="inline-flex items-center gap-2 text-xs font-bold text-[#5e6776]">
                                    <InputSwitch
                                      checked={channelEnabled(item, channel)}
                                      disabled={!canEditChannels || loading}
                                      onChange={(event) => void toggleChannel(item.id, channel, Boolean(event.value))}
                                      className="journal-settings-switch"
                                      aria-label={`${item.title}: ${channelLabel(channel)}`}
                                    />
                                    {channelLabel(channel)}
                                  </label>
                                ))}
                              </div>
                            ) : null}
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
  );
}
