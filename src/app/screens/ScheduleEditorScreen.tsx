import type { ReactNode } from 'react';
import clsx from 'clsx';
import { ArrowLeft, CalendarRange, Clock3, MonitorSmartphone, Trash2, UserRound } from 'lucide-react';
import { MONTHS_RU, MONTHS_RU_GENITIVE } from '../constants';
import type { StaffItem } from '../types';

type ScheduleEditorScreenProps = {
  staff: StaffItem | null;
  selectedDate: Date;
  selectedDays: number[];
  start: string;
  end: string;
  bookingStart: string;
  bookingEnd: string;
  loading: boolean;
  onBack: () => void;
  onToggleDay: (day: number) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onBookingStartChange: (value: string) => void;
  onBookingEndChange: (value: string) => void;
  onPresetSelect: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
};

const ISO_DAY_OPTIONS = [
  { day: 1, short: 'Пн', full: 'Понедельник' },
  { day: 2, short: 'Вт', full: 'Вторник' },
  { day: 3, short: 'Ср', full: 'Среда' },
  { day: 4, short: 'Чт', full: 'Четверг' },
  { day: 5, short: 'Пт', full: 'Пятница' },
  { day: 6, short: 'Сб', full: 'Суббота' },
  { day: 7, short: 'Вс', full: 'Воскресенье' },
] as const;

const PRESETS = ['09:00-18:00', '10:00-19:00', '10:00-20:00', '12:00-21:00'] as const;

function formatEditorMonthLabel(date: Date) {
  return `${date.getDate()} ${MONTHS_RU_GENITIVE[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTemplateRangeLabel(date: Date) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return `${from.getDate()} ${MONTHS_RU[from.getMonth()]} - ${to.getDate()} ${
    MONTHS_RU[to.getMonth()]
  } ${to.getFullYear()}`;
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-[28px] border border-[#e1e6ee] bg-white px-5 py-5">
      <span className="block text-[13px] font-semibold uppercase tracking-[0.18em] text-[#98a0ac]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="numeric"
        className="mt-4 w-full bg-transparent text-[44px] font-light tracking-[-0.05em] text-[#2d3640] outline-none"
      />
    </label>
  );
}

function ScheduleRangeCard({
  title,
  description,
  icon,
  start,
  end,
  startLabel,
  endLabel,
  onStartChange,
  onEndChange,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  start: string;
  end: string;
  startLabel: string;
  endLabel: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}) {
  return (
    <section className="rounded-[32px] border border-[#e1e6ee] bg-white p-5 shadow-[0_16px_36px_rgba(41,49,58,0.06)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8f3d1] text-[#946d00]">
          {icon}
        </div>
        <div>
          <h2 className="text-[24px] font-extrabold tracking-[-0.03em] text-[#2d3640]">{title}</h2>
          <p className="mt-2 max-w-[520px] text-[15px] leading-6 text-[#66707d]">{description}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <TimeField label={startLabel} value={start} onChange={onStartChange} />
        <TimeField label={endLabel} value={end} onChange={onEndChange} />
      </div>
    </section>
  );
}

export function ScheduleEditorScreen({
  staff,
  selectedDate,
  selectedDays,
  start,
  end,
  bookingStart,
  bookingEnd,
  loading,
  onBack,
  onToggleDay,
  onStartChange,
  onEndChange,
  onBookingStartChange,
  onBookingEndChange,
  onPresetSelect,
  onSave,
  onClear,
}: ScheduleEditorScreenProps) {
  const selectedDaysSet = new Set(selectedDays);
  const selectedDayLabels = ISO_DAY_OPTIONS.filter((item) => selectedDaysSet.has(item.day)).map(
    (item) => item.full,
  );

  return (
    <>
      <div className="hidden pb-8 pt-5 md:block">
        <section className="overflow-hidden rounded-[36px] border border-[#e0e5ed] bg-[#fbfcfe] shadow-[0_22px_54px_rgba(41,49,58,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ebeff5] px-7 py-7">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#98a0ac]">
                Шаблон графика
              </p>
              <h1 className="mt-3 text-[52px] font-light tracking-[-0.06em] text-[#2d3640]">
                {staff?.name || 'Сотрудник'}
              </h1>
              <p className="mt-3 text-[16px] text-[#66707d]">{formatTemplateRangeLabel(selectedDate)}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dce2ea] bg-white px-5 text-sm font-semibold text-[#39424d]"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </button>
              <button
                type="button"
                onClick={onClear}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#f0d3cf] bg-white px-5 text-sm font-semibold text-[#a24f45]"
              >
                <Trash2 className="h-4 w-4" />
                Очистить
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={loading}
                className="inline-flex h-12 items-center rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#2c3540] shadow-[0_14px_30px_rgba(244,201,0,0.28)] disabled:opacity-60"
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>

          <div className="grid gap-6 px-7 py-7 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-5">
              <section className="rounded-[32px] border border-[#e1e6ee] bg-white p-5 shadow-[0_16px_36px_rgba(41,49,58,0.06)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[24px] bg-[#eef1f7] text-[#6d7785]">
                    {staff?.avatarUrl ? (
                      <img src={staff.avatarUrl} alt={staff.name} className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-7 w-7" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[26px] font-extrabold tracking-[-0.04em] text-[#2d3640]">
                      {staff?.name || 'Сотрудник'}
                    </p>
                    <p className="mt-1 text-[14px] text-[#66707d]">
                      {staff?.positionName || 'Мастер'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] bg-[#f7f9fc] px-4 py-4">
                  <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#98a0ac]">
                    Активные дни
                  </p>
                  <p className="mt-3 text-[18px] font-semibold text-[#2d3640]">
                    {selectedDayLabels.length > 0 ? selectedDayLabels.join(', ') : 'Дни не выбраны'}
                  </p>
                </div>
              </section>

              <section className="rounded-[32px] border border-[#e1e6ee] bg-white p-5 shadow-[0_16px_36px_rgba(41,49,58,0.06)]">
                <div className="flex items-center gap-2 text-[#2d3640]">
                  <CalendarRange className="h-5 w-5 text-[#946d00]" />
                  <h2 className="text-[18px] font-extrabold tracking-[-0.03em]">Дни недели</h2>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {ISO_DAY_OPTIONS.map((item) => {
                    const active = selectedDaysSet.has(item.day);
                    return (
                      <button
                        key={item.day}
                        type="button"
                        onClick={() => onToggleDay(item.day)}
                        className={clsx(
                          'rounded-2xl border px-4 py-4 text-left transition',
                          active
                            ? 'border-[#f4c900] bg-[#fff4bf] text-[#2d3640]'
                            : 'border-[#dce2ea] bg-white text-[#707a87] hover:bg-[#f7f9fc]',
                        )}
                      >
                        <div className="text-[13px] font-bold uppercase tracking-[0.16em]">{item.short}</div>
                        <div className="mt-2 text-[16px] font-semibold">{item.full}</div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </aside>

            <div className="space-y-5">
              <section className="rounded-[32px] border border-[#e1e6ee] bg-white p-5 shadow-[0_16px_36px_rgba(41,49,58,0.06)]">
                <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#98a0ac]">
                  Быстрые шаблоны смены
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onPresetSelect(preset)}
                      className="rounded-2xl border border-[#dce2ea] bg-[#f7f9fc] px-4 py-3 text-sm font-semibold text-[#39424d] hover:bg-white"
                    >
                      {preset.replace('-', ' - ')}
                    </button>
                  ))}
                </div>
              </section>

              <ScheduleRangeCard
                title="Рабочая смена"
                description="Этот интервал определяет, когда сотрудник находится в графике и может принимать ручные записи."
                icon={<Clock3 className="h-5 w-5" />}
                start={start}
                end={end}
                startLabel="Начало смены"
                endLabel="Конец смены"
                onStartChange={onStartChange}
                onEndChange={onEndChange}
              />

              <ScheduleRangeCard
                title="Онлайн-запись"
                description="Этот интервал попадает в публичную запись в mari. Он должен находиться внутри рабочей смены."
                icon={<MonitorSmartphone className="h-5 w-5" />}
                start={bookingStart}
                end={bookingEnd}
                startLabel="Открыть онлайн с"
                endLabel="Закрыть онлайн в"
                onStartChange={onBookingStartChange}
                onEndChange={onBookingEndChange}
              />
            </div>
          </div>
        </section>
      </div>

      <div className="pb-8 pt-4 md:hidden">
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
            <ArrowLeft className="h-7 w-7" />
          </button>
          <div className="text-center">
            <p className="text-[23px] font-extrabold text-ink">Шаблон графика</p>
            <p className="text-[13px] font-medium text-muted">{formatEditorMonthLabel(selectedDate)}</p>
          </div>
          <button type="button" onClick={onClear} className="rounded-lg p-2 text-[#d16250]">
            <Trash2 className="h-7 w-7" />
          </button>
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border-[2px] border-line bg-white px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#eef1f7] text-[#6d7785]">
                {staff?.avatarUrl ? (
                  <img src={staff.avatarUrl} alt={staff.name} className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[22px] font-extrabold text-ink">{staff?.name || 'Сотрудник'}</p>
                <p className="text-[14px] font-medium text-muted">{staff?.positionName || 'Мастер'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border-[2px] border-line bg-white px-4 py-4">
            <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-muted">Дни недели</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {ISO_DAY_OPTIONS.map((item) => {
                const active = selectedDaysSet.has(item.day);
                return (
                  <button
                    key={item.day}
                    type="button"
                    onClick={() => onToggleDay(item.day)}
                    className={clsx(
                      'rounded-2xl border px-3 py-3 text-center text-[15px] font-semibold transition',
                      active
                        ? 'border-[#f4c900] bg-[#fff4bf] text-ink'
                        : 'border-line bg-screen text-muted',
                    )}
                  >
                    {item.short}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border-[2px] border-line bg-white px-4 py-4">
            <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-muted">Быстрые шаблоны</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onPresetSelect(preset)}
                  className="rounded-2xl border border-line bg-screen px-4 py-3 text-[14px] font-semibold text-ink"
                >
                  {preset}
                </button>
              ))}
            </div>
          </section>

          <ScheduleRangeCard
            title="Рабочая смена"
            description="Время, когда сотрудник в графике."
            icon={<Clock3 className="h-5 w-5" />}
            start={start}
            end={end}
            startLabel="Начало смены"
            endLabel="Конец смены"
            onStartChange={onStartChange}
            onEndChange={onEndChange}
          />

          <ScheduleRangeCard
            title="Онлайн-запись"
            description="Время, которое увидят клиенты в mari."
            icon={<MonitorSmartphone className="h-5 w-5" />}
            start={bookingStart}
            end={bookingEnd}
            startLabel="Открыть онлайн"
            endLabel="Закрыть онлайн"
            onStartChange={onBookingStartChange}
            onEndChange={onBookingEndChange}
          />

          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="w-full rounded-3xl bg-accent py-4 text-[22px] font-extrabold text-[#222b33] disabled:opacity-60"
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </>
  );
}
