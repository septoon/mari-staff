import clsx from 'clsx';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, CalendarDays, Clock3, Loader2, Plus, UserRound, X } from 'lucide-react';
import { formatRub, formatTime } from '../helpers';
import { JOURNAL_CREATE_STEP_MINUTES } from '../journalCreate';
import type { ClientItem, JournalCreateDraft, ServiceItem, StaffItem } from '../types';

type JournalCreateScreenProps = {
  draft: JournalCreateDraft;
  selectedDate: Date;
  clients: ClientItem[];
  staff: StaffItem[];
  services: ServiceItem[];
  loading: boolean;
  servicesLoading: boolean;
  onBack: () => void;
  onDraftChange: (patch: Partial<JournalCreateDraft>) => void;
  onSave: () => void;
};

function combineDateTime(dateValue: string, timeValue: string) {
  const dateMatch = dateValue.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = timeValue.trim().match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) {
    return null;
  }

  const [, year, month, day] = dateMatch;
  const [, hours, minutes] = timeMatch;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    0,
    0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMinutes(date: Date | null, durationMin: number) {
  if (!date) {
    return null;
  }
  return new Date(date.getTime() + Math.max(0, durationMin) * 60_000);
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-5 shadow-[0_16px_34px_rgba(42,49,56,0.08)]">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">{eyebrow}</p>
      <h2 className="mt-2 text-[24px] font-extrabold leading-none text-ink">{title}</h2>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#788292]">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
  type = 'text',
  step,
}: {
  label: string;
  value: string | number;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: 'text' | 'tel' | 'date' | 'time' | 'number';
  step?: number;
}) {
  return (
    <label className="block min-w-0">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">{label}</p>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        min={type === 'number' ? 15 : undefined}
        step={step ?? (type === 'number' ? 15 : undefined)}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 h-12 w-full min-w-0 max-w-full appearance-none rounded-2xl border border-[#d9dfe8] bg-white px-4 text-sm font-semibold text-ink outline-none transition placeholder:text-[#a0a7b3] focus:border-[#c2cad6]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 h-12 w-full min-w-0 max-w-full rounded-2xl border border-[#d9dfe8] bg-white px-4 text-sm font-semibold text-ink outline-none transition focus:border-[#c2cad6]"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Content({
  draft,
  selectedDate,
  clients,
  staff,
  services,
  loading,
  servicesLoading,
  onDraftChange,
  onSave,
}: Omit<JournalCreateScreenProps, 'onBack'>) {
  const [clientSuggestOpen, setClientSuggestOpen] = useState(false);
  const selectedStaff = staff.find((item) => item.id === draft.staffId) || null;
  const selectedServices = useMemo(
    () => services.filter((item) => draft.serviceIds.includes(item.id)),
    [draft.serviceIds, services],
  );
  const startAt = combineDateTime(draft.dateValue, draft.startTime);
  const endAt = addMinutes(startAt, draft.durationMin);
  const createDisabled = loading || servicesLoading || services.length === 0 || draft.serviceIds.length === 0;
  const createDisabledReason = servicesLoading
    ? 'Пока загружаются услуги выбранного сотрудника.'
    : services.length === 0
      ? 'Создание недоступно: у выбранного сотрудника нет назначенных услуг.'
      : draft.serviceIds.length === 0
        ? 'Выберите хотя бы одну услугу.'
      : null;
  const durationOptions = useMemo(() => {
    const presetValues = [30, 45, 60, 90, 120, 150, 180];
    const currentValue = Math.max(15, Math.round(draft.durationMin || 0));
    const values = presetValues.includes(currentValue)
      ? presetValues
      : [...presetValues, currentValue].sort((left, right) => left - right);

    return values.map((value) => ({
      value: String(value),
      label: `${value} мин`,
    }));
  }, [draft.durationMin]);
  const totalPriceMin = useMemo(
    () => selectedServices.reduce((sum, item) => sum + Math.max(item.priceMin, 0), 0),
    [selectedServices],
  );
  const totalPriceMax = useMemo(() => {
    if (selectedServices.length === 0) {
      return 0;
    }

    return selectedServices.reduce((sum, item) => sum + Math.max(item.priceMax || item.priceMin, 0), 0);
  }, [selectedServices]);
  const totalDurationMin = useMemo(
    () =>
      selectedServices.reduce(
        (sum, item) => sum + Math.max(15, Math.round(item.durationSec / 60)),
        0,
      ),
    [selectedServices],
  );
  const clientSuggestions = useMemo(() => {
    const query = draft.clientName.trim().toLowerCase();
    if (!query) {
      return [] as ClientItem[];
    }

    return clients
      .filter((item) => item.name.trim().toLowerCase().includes(query))
      .sort((left, right) => {
        const leftName = left.name.trim().toLowerCase();
        const rightName = right.name.trim().toLowerCase();
        const leftStarts = leftName.startsWith(query);
        const rightStarts = rightName.startsWith(query);
        if (leftStarts !== rightStarts) {
          return leftStarts ? -1 : 1;
        }
        return leftName.localeCompare(rightName, 'ru');
      })
      .slice(0, 6);
  }, [clients, draft.clientName]);
  const toggleService = (serviceId: string) => {
    const nextIds = draft.serviceIds.includes(serviceId)
      ? draft.serviceIds.filter((id) => id !== serviceId)
      : [...draft.serviceIds, serviceId];
    const nextServices = services.filter((item) => nextIds.includes(item.id));
    const nextDurationMin =
      nextServices.reduce((sum, item) => sum + Math.max(15, Math.round(item.durationSec / 60)), 0) ||
      draft.durationMin;

    onDraftChange({
      serviceIds: nextIds,
      durationMin: nextDurationMin,
    });
  };

  return (
    <div className="space-y-5">
      <Section
        eyebrow="Клиент"
        title="Контакт для записи"
        description="Минимальный набор для создания: имя и телефон. Остальное можно дополнить позже из карточки визита."
      >
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <label className="relative block">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Имя клиента</p>
            <input
              type="text"
              value={draft.clientName}
              placeholder="Например, Анжелика"
              onFocus={() => setClientSuggestOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setClientSuggestOpen(false), 120);
              }}
              onChange={(event) => {
                onDraftChange({ clientName: event.target.value });
                setClientSuggestOpen(true);
              }}
              className="mt-3 h-12 w-full rounded-2xl border border-[#d9dfe8] bg-white px-4 text-sm font-semibold text-ink outline-none transition placeholder:text-[#a0a7b3] focus:border-[#c2cad6]"
            />
            {clientSuggestOpen && clientSuggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-[20px] border border-[#d9dfe8] bg-white shadow-[0_20px_40px_rgba(34,43,51,0.12)]">
                {clientSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onDraftChange({
                        clientName: item.name,
                        clientPhone: item.phone,
                      });
                      setClientSuggestOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-4 border-b border-[#eef2f6] px-4 py-3 text-left last:border-b-0 hover:bg-[#f7f9fc]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{item.name}</span>
                      <span className="mt-1 block truncate text-sm font-semibold text-[#7d8795]">
                        {item.phone || 'Телефон не указан'}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </label>
          <TextField
            label="Телефон"
            value={draft.clientPhone}
            type="tel"
            placeholder="+7 978 000 00 00"
            onChange={(value) => onDraftChange({ clientPhone: value })}
          />
        </div>
        <label className="mt-4 block min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Комментарий</p>
          <textarea
            value={draft.comment}
            placeholder="Например, клиент просил напомнить о визите или уточнил детали услуги"
            onChange={(event) => onDraftChange({ comment: event.target.value })}
            className="mt-3 min-h-[128px] w-full min-w-0 max-w-full resize-y rounded-2xl border border-[#d9dfe8] bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition placeholder:text-[#a0a7b3] focus:border-[#c2cad6]"
          />
        </label>
      </Section>

      <Section
        eyebrow="Сеанс"
        title="Дата, время и исполнитель"
        description="Дата по умолчанию берётся из текущего дня журнала. При необходимости её можно поменять прямо здесь."
      >
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <TextField
            label="Дата записи"
            type="date"
            value={draft.dateValue}
            onChange={(value) => onDraftChange({ dateValue: value })}
          />
          <TextField
            label="Начало"
            type="time"
            value={draft.startTime}
            step={JOURNAL_CREATE_STEP_MINUTES * 60}
            onChange={(value) => onDraftChange({ startTime: value })}
          />
          <SelectField
            label="Сотрудник"
            value={draft.staffId}
            options={staff.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            onChange={(value) => onDraftChange({ staffId: value })}
          />
          <SelectField
            label="Длительность"
            value={String(draft.durationMin)}
            options={durationOptions}
            onChange={(value) => onDraftChange({ durationMin: Number(value) || 60 })}
          />
        </div>
      </Section>

      <Section
        eyebrow="Услуга"
        title="Что именно записываем"
        description="Список пока общий. Если понадобится, следующим этапом можно ограничить услуги выбранным мастером."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            {servicesLoading ? (
              <div className="rounded-[24px] border border-[#e7ebf0] bg-[#f8fafc] px-4 py-4 text-sm font-semibold text-[#788292]">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загружаю услуги сотрудника...
                </span>
              </div>
            ) : services.length > 0 ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Услуги</p>
                <div className="mt-3 grid gap-3">
                  {services.map((item) => {
                    const active = draft.serviceIds.includes(item.id);
                    const priceLabel =
                      item.priceMax && item.priceMax !== item.priceMin
                        ? `${formatRub(item.priceMin)}-${formatRub(item.priceMax)}`
                        : formatRub(item.priceMax || item.priceMin);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleService(item.id)}
                        className={clsx(
                          'rounded-[24px] border px-4 py-4 text-left transition',
                          active
                            ? 'border-[#222b33] bg-[#222b33] text-white shadow-[0_16px_34px_rgba(34,43,51,0.16)]'
                            : 'border-[#d9dfe8] bg-white text-ink hover:border-[#c2cad6] hover:bg-[#f7f9fc]',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold">{item.name}</p>
                            <p
                              className={clsx(
                                'mt-2 text-sm font-semibold',
                                active ? 'text-white/75' : 'text-[#788292]',
                              )}
                            >
                              {Math.max(15, Math.round(item.durationSec / 60))} мин
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-extrabold">{priceLabel}</p>
                            <p
                              className={clsx(
                                'mt-2 text-xs font-bold uppercase tracking-[0.18em]',
                                active ? 'text-white/70' : 'text-[#98a1ae]',
                              )}
                            >
                              {active ? 'Выбрано' : 'Добавить'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-[#e7ebf0] bg-[#f8fafc] px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Услуга</p>
                <p className="mt-3 text-sm font-bold text-ink">Для этого сотрудника услуги не назначены</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#788292]">
                  Назначьте услуги сотруднику в разделе управления услугами и персоналом.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-[#e7ebf0] bg-[#f8fafc] px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Предпросмотр</p>
            <div className="mt-4 grid gap-3">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4 text-[#7d8795]" />
                <div>
                  <p className="text-sm font-bold text-ink">
                    {startAt ? startAt.toLocaleDateString('ru-RU') : selectedDate.toLocaleDateString('ru-RU')}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#788292]">
                    {startAt && endAt ? `${formatTime(startAt)}-${formatTime(endAt)}` : 'Укажите дату и время'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 h-4 w-4 text-[#7d8795]" />
                <div>
                  <p className="text-sm font-bold text-ink">{selectedStaff?.name || 'Сотрудник не выбран'}</p>
                  <p className="mt-1 text-sm font-semibold text-[#788292]">
                    {selectedServices.length > 0
                      ? selectedServices.map((item) => item.name).join(', ')
                      : 'Услуги не выбраны'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-4 w-4 text-[#7d8795]" />
                <div>
                  <p className="text-sm font-bold text-ink">{draft.durationMin} мин</p>
                  <p className="mt-1 text-sm font-semibold text-[#788292]">
                    {selectedServices.length > 0
                      ? totalPriceMax > totalPriceMin
                        ? `${formatRub(totalPriceMin)}-${formatRub(totalPriceMax)}`
                        : formatRub(totalPriceMax || totalPriceMin)
                      : 'Стоимость можно уточнить позже'}
                  </p>
                  {selectedServices.length > 1 ? (
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">
                      {selectedServices.length} услуг · {totalDurationMin} мин
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-1 rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd]/95 px-5 py-4 shadow-[0_16px_34px_rgba(42,49,56,0.08)] backdrop-blur">
        <button
          type="button"
          disabled={createDisabled}
          onClick={onSave}
          className={clsx(
            'inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-extrabold transition',
            createDisabled
              ? 'cursor-not-allowed border border-[#d9dfe8] bg-[#edf1f6] text-[#98a1ae] shadow-none'
              : 'bg-[#f4c900] text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)]',
          )}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {loading ? 'Создаю запись...' : 'Создать запись'}
        </button>
        {createDisabledReason ? (
          <p className="mt-3 text-center text-sm font-semibold text-[#7f8896]">
            {createDisabledReason}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function JournalCreateScreen({
  draft,
  selectedDate,
  clients,
  staff,
  services,
  loading,
  servicesLoading,
  onBack,
  onDraftChange,
  onSave,
}: JournalCreateScreenProps) {
  const desktopTitle = useMemo(() => {
    if (!draft.dateValue) {
      return 'Новая запись';
    }
    return `Новая запись на ${new Date(draft.dateValue).toLocaleDateString('ru-RU')}`;
  }, [draft.dateValue]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(min-width: 768px)').matches) {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

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
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Журнал</p>
            <h1 className="mt-1 text-[26px] font-extrabold leading-none text-ink">Новая запись</h1>
          </div>
        </div>

        <div className="mt-5">
          <Content
            draft={draft}
            selectedDate={selectedDate}
            clients={clients}
            staff={staff}
            services={services}
            loading={loading}
            servicesLoading={servicesLoading}
            onDraftChange={onDraftChange}
            onSave={onSave}
          />
        </div>
      </div>

      <div
        className="fixed inset-0 z-[80] hidden bg-[rgba(34,43,51,0.38)] backdrop-blur-[2px] md:block"
        onClick={onBack}
      >
        <div
          className="absolute inset-y-0 right-0 flex w-full max-w-[620px] flex-col border-l border-[#dfe4ec] bg-[#f3f5f8] shadow-[-24px_0_60px_rgba(34,43,51,0.16)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-[#e0e5ed] bg-[#fcfcfd] px-6 py-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Журнал</p>
              <h1 className="mt-3 text-[36px] font-extrabold leading-[0.96] tracking-[-0.04em] text-ink">
                {desktopTitle}
              </h1>
              <p className="mt-3 max-w-[420px] text-sm font-semibold leading-6 text-[#788292]">
                Создание записи без системных prompt-диалогов. Все ключевые поля доступны сразу в одной панели.
              </p>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d9dfe8] bg-white text-ink transition hover:bg-[#f7f9fc]"
              aria-label="Закрыть создание записи"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <Content
              draft={draft}
              selectedDate={selectedDate}
              clients={clients}
              staff={staff}
              services={services}
              loading={loading}
              servicesLoading={servicesLoading}
              onDraftChange={onDraftChange}
              onSave={onSave}
            />
          </div>
        </div>
      </div>
    </>
  );
}
