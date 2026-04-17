import { useMemo } from 'react';
import clsx from 'clsx';
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  MonitorSmartphone,
  RefreshCw,
  Settings2,
  UserRound,
  X,
} from 'lucide-react';
import { MONTHS_RU_GENITIVE } from '../constants';
import {
  buildBookingSlotTimes,
  calculateScheduleIntervalHours,
  timeValueToMinutes,
} from '../controller/schedule';
import { toISODate, toISODay } from '../helpers';
import type { ScheduleInterval, StaffItem, WorkingHoursMap } from '../types';

type ScheduleScreenProps = {
  selectedDate: Date;
  staff: StaffItem[];
  hoursByStaff: WorkingHoursMap;
  editorStaff: StaffItem | null;
  editorSelectedDays: number[];
  editorStart: string;
  editorEnd: string;
  editorBookingStart: string;
  editorBookingEnd: string;
  onlineSlotsStaff: StaffItem | null;
  onlineSlotsDate: Date | null;
  onlineSlotsShiftStart: string;
  onlineSlotsShiftEnd: string;
  onlineSlotsBookingStart: string;
  onlineSlotsBookingEnd: string;
  onlineSlotsSelectedTimes: string[];
  loading: boolean;
  onReload: () => void;
  onEdit: () => void;
  onEditStaff: (item: StaffItem) => void;
  onOpenDesktopEditor: (item: StaffItem, date: Date) => void;
  onCloseDesktopEditor: () => void;
  onToggleEditorDay: (day: number) => void;
  onEditorStartChange: (value: string) => void;
  onEditorEndChange: (value: string) => void;
  onEditorBookingStartChange: (value: string) => void;
  onEditorBookingEndChange: (value: string) => void;
  onEditorPresetSelect: (value: string) => void;
  onSaveEditor: () => void;
  onClearEditor: () => void;
  onOpenOnlineSlots: (item: StaffItem, date: Date) => void;
  onCloseOnlineSlots: () => void;
  onOnlineSlotsBookingStartChange: (value: string) => void;
  onOnlineSlotsBookingEndChange: (value: string) => void;
  onToggleOnlineSlotTime: (value: string) => void;
  onToggleOnlineSlotGroup: (values: string[]) => void;
  onResetOnlineSlots: () => void;
  onSaveOnlineSlots: () => void;
  onSelectDate: (value: Date) => void;
};

type OnlineSlotGroup = {
  key: 'morning' | 'day' | 'evening';
  label: string;
  times: string[];
};

const PRESETS = ['09:00-18:00', '10:00-19:00', '10:00-20:00', '12:00-21:00'] as const;

const ISO_DAY_OPTIONS = [
  { day: 1, short: 'Пн' },
  { day: 2, short: 'Вт' },
  { day: 3, short: 'Ср' },
  { day: 4, short: 'Чт' },
  { day: 5, short: 'Пт' },
  { day: 6, short: 'Сб' },
  { day: 7, short: 'Вс' },
] as const;

function addDays(date: Date, amount: number) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfIsoWeek(date: Date) {
  return addDays(date, 1 - toISODay(date));
}

function formatWeekLabel(date: Date) {
  const start = startOfIsoWeek(date);
  const end = addDays(start, 6);
  return `${start.getDate()} ${MONTHS_RU_GENITIVE[start.getMonth()]} - ${end.getDate()} ${
    MONTHS_RU_GENITIVE[end.getMonth()]
  } ${end.getFullYear()}`;
}

function formatDayLabel(date: Date) {
  return `${date.getDate()} ${MONTHS_RU_GENITIVE[date.getMonth()]}`;
}

function formatRange(start: string, end: string) {
  return `${start} - ${end}`;
}

function formatIntervalLabel(intervals: ScheduleInterval[]) {
  const first = intervals[0];
  if (!first) {
    return 'Нет графика';
  }
  const suffix = intervals.length > 1 ? ` +${intervals.length - 1}` : '';
  return `${formatRange(first.start, first.end)}${suffix}`;
}

function formatBookingLabel(intervals: ScheduleInterval[]) {
  const first = intervals[0];
  if (!first) {
    return 'Не доступно';
  }
  const label = formatRange(first.bookingStart, first.bookingEnd);
  if (first.bookingStart === first.start && first.bookingEnd === first.end && intervals.length === 1) {
    return 'Совпадает со сменой';
  }
  const explicitCount =
    intervals.length === 1 && first.bookingSlots && first.bookingSlots.length > 0
      ? ` · ${first.bookingSlots.length} слотов`
      : '';
  const suffix = intervals.length > 1 ? ` +${intervals.length - 1}` : '';
  return `${label}${explicitCount}${suffix}`;
}

function getIntervalsForDate(hoursByStaff: WorkingHoursMap, staffId: string, date: Date) {
  return hoursByStaff[staffId]?.[toISODate(date)] ?? [];
}

function getWeekSummary(hoursByStaff: WorkingHoursMap, staffId: string, weekDates: Date[]) {
  return weekDates.reduce(
    (acc, date) => {
      const intervals = getIntervalsForDate(hoursByStaff, staffId, date);
      if (intervals.length > 0) {
        acc.days += 1;
      }
      acc.intervals += intervals.length;
      acc.hours += intervals.reduce((sum, interval) => sum + calculateScheduleIntervalHours(interval), 0);
      return acc;
    },
    { days: 0, intervals: 0, hours: 0 },
  );
}

function formatHours(hours: number) {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} ч` : `${rounded.toFixed(1).replace('.', ',')} ч`;
}

function isTimeInsideRange(value: string, start: string, end: string) {
  const minutes = timeValueToMinutes(value);
  const startMinutes = timeValueToMinutes(start);
  const endMinutes = timeValueToMinutes(end);
  return minutes >= startMinutes && minutes < endMinutes;
}

function buildOnlineSlotGroups(shiftStart: string, shiftEnd: string): OnlineSlotGroup[] {
  const groups: Record<OnlineSlotGroup['key'], string[]> = {
    morning: [],
    day: [],
    evening: [],
  };

  buildBookingSlotTimes(shiftStart, shiftEnd).forEach((time) => {
    const minutes = timeValueToMinutes(time);
    if (minutes < 12 * 60) {
      groups.morning.push(time);
      return;
    }
    if (minutes < 18 * 60) {
      groups.day.push(time);
      return;
    }
    groups.evening.push(time);
  });

  const orderedGroups: OnlineSlotGroup[] = [
    { key: 'morning', label: 'Утро', times: groups.morning },
    { key: 'day', label: 'День', times: groups.day },
    { key: 'evening', label: 'Вечер', times: groups.evening },
  ];

  return orderedGroups.filter((group) => group.times.length > 0);
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
    <label className="rounded-2xl border border-[#dce2ea] bg-white px-4 py-3">
      <span className="block text-[12px] font-bold uppercase tracking-[0.12em] text-[#8e97a4]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="numeric"
        className="mt-3 w-full bg-transparent text-[28px] font-extrabold tracking-[-0.04em] text-[#28313b] outline-none"
      />
    </label>
  );
}

function DayEditorPanel({
  staff,
  date,
  start,
  end,
  bookingStart,
  bookingEnd,
  loading,
  onClose,
  onStartChange,
  onEndChange,
  onBookingStartChange,
  onBookingEndChange,
  onPresetSelect,
  onSave,
  onClear,
  mobile = false,
}: {
  staff: StaffItem;
  date: Date;
  start: string;
  end: string;
  bookingStart: string;
  bookingEnd: string;
  loading: boolean;
  onClose: () => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onBookingStartChange: (value: string) => void;
  onBookingEndChange: (value: string) => void;
  onPresetSelect: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
  mobile?: boolean;
}) {
  return (
    <section
      className={clsx(
        'rounded-[32px] border border-[#e0e5ed] bg-[#fbfcfe] shadow-[0_20px_48px_rgba(41,49,58,0.12)]',
        mobile ? 'p-4' : 'sticky top-24 p-5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#8e97a4]">Изменение дня</p>
          <h2 className="mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-[#28313b]">{staff.name}</h2>
          <p className="mt-2 text-[15px] text-[#66707d]">{formatDayLabel(date)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 items-center rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-[#39424d]"
        >
          Закрыть
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onPresetSelect(preset)}
            className="rounded-2xl border border-[#dce2ea] bg-white px-4 py-2 text-sm font-semibold text-[#39424d]"
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-[28px] border border-[#e1e6ee] bg-white p-4">
          <div className="flex items-center gap-2 text-[#28313b]">
            <Clock3 className="h-4 w-4 text-[#946d00]" />
            <h3 className="text-[18px] font-extrabold tracking-[-0.03em]">Рабочая смена</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <TimeField label="Начало" value={start} onChange={onStartChange} />
            <TimeField label="Конец" value={end} onChange={onEndChange} />
          </div>
        </div>

        <div className="rounded-[28px] border border-[#e1e6ee] bg-white p-4">
          <div className="flex items-center gap-2 text-[#28313b]">
            <MonitorSmartphone className="h-4 w-4 text-[#946d00]" />
            <h3 className="text-[18px] font-extrabold tracking-[-0.03em]">Онлайн-запись</h3>
          </div>
          <p className="mt-2 text-[14px] leading-6 text-[#66707d]">
            Это окно попадет в публичную запись в mari и ограничит доступные слоты для клиентов.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <TimeField label="Открыть онлайн" value={bookingStart} onChange={onBookingStartChange} />
            <TimeField label="Закрыть онлайн" value={bookingEnd} onChange={onBookingEndChange} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="inline-flex h-12 items-center rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#2c3540] shadow-[0_14px_30px_rgba(244,201,0,0.28)] disabled:opacity-60"
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-12 items-center rounded-2xl border border-[#f0d3cf] bg-white px-5 text-sm font-semibold text-[#a24f45]"
        >
          Очистить день
        </button>
      </div>
    </section>
  );
}

function OnlineSlotsModal({
  staff,
  date,
  shiftStart,
  shiftEnd,
  bookingStart,
  bookingEnd,
  selectedTimes,
  loading,
  onClose,
  onBookingStartChange,
  onBookingEndChange,
  onToggleTime,
  onToggleGroup,
  onReset,
  onSave,
}: {
  staff: StaffItem;
  date: Date;
  shiftStart: string;
  shiftEnd: string;
  bookingStart: string;
  bookingEnd: string;
  selectedTimes: string[];
  loading: boolean;
  onClose: () => void;
  onBookingStartChange: (value: string) => void;
  onBookingEndChange: (value: string) => void;
  onToggleTime: (value: string) => void;
  onToggleGroup: (values: string[]) => void;
  onReset: () => void;
  onSave: () => void;
}) {
  const slotGroups = useMemo(
    () => buildOnlineSlotGroups(shiftStart, shiftEnd),
    [shiftEnd, shiftStart],
  );
  const selectedSet = useMemo(() => new Set(selectedTimes), [selectedTimes]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(34,43,51,0.48)] px-3 py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-full w-full max-w-[980px] overflow-hidden rounded-[32px] bg-[#fbfcfe] shadow-[0_32px_72px_rgba(34,43,51,0.26)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e5eaf1] px-5 py-5 sm:px-6">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#8e97a4]">
              Слоты онлайн-записи
            </p>
            <h2 className="mt-2 text-[30px] font-extrabold tracking-[-0.05em] text-[#28313b]">
              Время для онлайн записи
            </h2>
            <p className="mt-2 text-[15px] text-[#66707d]">
              {staff.name} · {formatDayLabel(date)} · смена {formatRange(shiftStart, shiftEnd)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dce2ea] bg-white text-[#39424d]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-[28px] border border-[#e1e6ee] bg-white p-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#8e97a4]">
                  Рабочее время
                </p>
                <p className="mt-3 text-[28px] font-extrabold tracking-[-0.04em] text-[#28313b]">
                  {formatRange(shiftStart, shiftEnd)}
                </p>
                <p className="mt-2 text-[14px] leading-6 text-[#66707d]">
                  Ниже можно сузить окно онлайн-записи и выбрать конкретные старты слотов для `mari`.
                </p>
              </div>

              <div className="rounded-[28px] border border-[#e1e6ee] bg-white p-4">
                <div className="flex items-center gap-2 text-[#28313b]">
                  <MonitorSmartphone className="h-4 w-4 text-[#946d00]" />
                  <h3 className="text-[18px] font-extrabold tracking-[-0.03em]">Окно онлайн-записи</h3>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <TimeField label="Начало" value={bookingStart} onChange={onBookingStartChange} />
                  <TimeField label="Конец" value={bookingEnd} onChange={onBookingEndChange} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {slotGroups.map((group) => {
                const availableTimes = group.times.filter((time) =>
                  isTimeInsideRange(time, bookingStart, bookingEnd),
                );
                const selectedCount = availableTimes.filter((time) => selectedSet.has(time)).length;
                const allSelected = availableTimes.length > 0 && selectedCount === availableTimes.length;

                return (
                  <section
                    key={group.key}
                    className="rounded-[28px] border border-[#e1e6ee] bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[18px] font-extrabold tracking-[-0.03em] text-[#28313b]">
                          {group.label}
                        </p>
                        <p className="mt-1 text-[14px] text-[#66707d]">
                          {selectedCount} из {availableTimes.length} доступны онлайн
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={availableTimes.length === 0}
                        onClick={() => onToggleGroup(availableTimes)}
                        className="inline-flex h-10 items-center rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-[#39424d] disabled:opacity-50"
                      >
                        {allSelected ? 'Снять группу' : 'Выбрать группу'}
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {group.times.map((time) => {
                        const available = isTimeInsideRange(time, bookingStart, bookingEnd);
                        const selected = selectedSet.has(time);
                        return (
                          <button
                            key={time}
                            type="button"
                            disabled={!available}
                            onClick={() => onToggleTime(time)}
                            className={clsx(
                              'inline-flex min-w-[84px] items-center justify-center rounded-2xl px-3 py-2 text-sm font-bold transition',
                              selected && available
                                ? 'bg-[#f4c900] text-[#2c3540] shadow-[0_10px_24px_rgba(244,201,0,0.22)]'
                                : available
                                  ? 'border border-[#dce2ea] bg-white text-[#39424d] hover:border-[#f4c900]'
                                  : 'border border-[#eef2f6] bg-[#f5f7fa] text-[#b0b7c1]',
                            )}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#e5eaf1] px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-12 items-center rounded-2xl border border-[#dce2ea] bg-white px-5 text-sm font-semibold text-[#39424d]"
          >
            Сбросить изменения
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
    </div>
  );
}

export function ScheduleScreen({
  selectedDate,
  staff,
  hoursByStaff,
  editorStaff,
  editorSelectedDays,
  editorStart,
  editorEnd,
  editorBookingStart,
  editorBookingEnd,
  onlineSlotsStaff,
  onlineSlotsDate,
  onlineSlotsShiftStart,
  onlineSlotsShiftEnd,
  onlineSlotsBookingStart,
  onlineSlotsBookingEnd,
  onlineSlotsSelectedTimes,
  loading,
  onReload,
  onEdit,
  onEditStaff,
  onOpenDesktopEditor,
  onCloseDesktopEditor,
  onToggleEditorDay,
  onEditorStartChange,
  onEditorEndChange,
  onEditorBookingStartChange,
  onEditorBookingEndChange,
  onEditorPresetSelect,
  onSaveEditor,
  onClearEditor,
  onOpenOnlineSlots,
  onCloseOnlineSlots,
  onOnlineSlotsBookingStartChange,
  onOnlineSlotsBookingEndChange,
  onToggleOnlineSlotTime,
  onToggleOnlineSlotGroup,
  onResetOnlineSlots,
  onSaveOnlineSlots,
  onSelectDate,
}: ScheduleScreenProps) {
  const weekDates = useMemo(() => {
    const start = startOfIsoWeek(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selectedDate]);

  const selectedDateIso = toISODate(selectedDate);
  const selectedDayStats = useMemo(() => {
    const totalStaff = staff.length;
    const withShift = staff.filter((person) => getIntervalsForDate(hoursByStaff, person.id, selectedDate).length > 0).length;
    const withOnline = staff.filter((person) => {
      const intervals = getIntervalsForDate(hoursByStaff, person.id, selectedDate);
      return intervals.some((interval) => interval.bookingStart < interval.bookingEnd);
    }).length;
    return { totalStaff, withShift, withOnline };
  }, [hoursByStaff, selectedDate, staff]);

  const firstEditableStaff = staff.find((item) => item.role !== 'OWNER') ?? null;
  void editorSelectedDays;
  void onToggleEditorDay;

  return (
    <>
      <div className="hidden pb-8 pt-5 md:block">
        <div className={clsx('grid gap-6', editorStaff ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : 'grid-cols-1')}>
          <div className="space-y-5">
            <section className="rounded-[36px] border border-[#e0e5ed] bg-[#fbfcfe] px-6 py-6 shadow-[0_20px_48px_rgba(41,49,58,0.08)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#98a0ac]">
                    График сотрудников
                  </p>
                  <h1 className="mt-3 text-[52px] font-light tracking-[-0.06em] text-[#2d3640]">
                    {formatWeekLabel(selectedDate)}
                  </h1>
                  <p className="mt-3 text-[16px] leading-7 text-[#66707d]">
                    Рабочая смена и окно онлайн-записи редактируются раздельно. Клиентская запись в mari строится только по booking-window и сохраненным слотам.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectDate(addDays(selectedDate, -7))}
                    className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-[#39424d]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Неделя назад
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectDate(new Date())}
                    className="inline-flex h-12 items-center rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-[#39424d]"
                  >
                    Сегодня
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectDate(addDays(selectedDate, 7))}
                    className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-[#39424d]"
                  >
                    Неделя вперед
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onReload}
                    className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-[#39424d]"
                  >
                    <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
                    Обновить
                  </button>
                  {firstEditableStaff ? (
                    <button
                      type="button"
                      onClick={() => onEditStaff(firstEditableStaff)}
                      className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#2c3540] shadow-[0_14px_30px_rgba(244,201,0,0.28)]"
                    >
                      <Settings2 className="h-4 w-4" />
                      Редактировать шаблон
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                <div className="rounded-[28px] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(41,49,58,0.06)]">
                  <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#98a0ac]">Сотрудники</p>
                  <p className="mt-3 text-[36px] font-extrabold tracking-[-0.05em] text-[#2d3640]">
                    {selectedDayStats.totalStaff}
                  </p>
                </div>
                <div className="rounded-[28px] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(41,49,58,0.06)]">
                  <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#98a0ac]">В смене</p>
                  <p className="mt-3 text-[36px] font-extrabold tracking-[-0.05em] text-[#2d3640]">
                    {selectedDayStats.withShift}
                  </p>
                </div>
                <div className="rounded-[28px] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(41,49,58,0.06)]">
                  <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#98a0ac]">
                    Доступны онлайн
                  </p>
                  <p className="mt-3 text-[36px] font-extrabold tracking-[-0.05em] text-[#2d3640]">
                    {selectedDayStats.withOnline}
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[36px] border border-[#e0e5ed] bg-[#fbfcfe] shadow-[0_20px_48px_rgba(41,49,58,0.08)]">
              <div className="overflow-x-auto">
                <div className="min-w-[1080px]">
                  <div className="grid grid-cols-[320px_repeat(7,minmax(110px,1fr))] gap-3 border-b border-[#ebeff5] px-5 py-5">
                    <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#98a0ac]">
                      Сотрудник
                    </div>
                    {weekDates.map((date) => {
                      const active = toISODate(date) === selectedDateIso;
                      return (
                        <button
                          key={toISODate(date)}
                          type="button"
                          onClick={() => onSelectDate(date)}
                          className={clsx(
                            'rounded-2xl px-3 py-3 text-left transition',
                            active ? 'bg-[#fff4bf]' : 'bg-white hover:bg-[#f6f8fb]',
                          )}
                        >
                          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#98a0ac]">
                            {ISO_DAY_OPTIONS[toISODay(date) - 1]?.short}
                          </p>
                          <p className="mt-2 text-[22px] font-extrabold tracking-[-0.04em] text-[#2d3640]">
                            {date.getDate()}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-3 px-5 py-5">
                    {staff.map((person) => {
                      const weekSummary = getWeekSummary(hoursByStaff, person.id, weekDates);
                      return (
                        <div
                          key={person.id}
                          className="grid grid-cols-[320px_repeat(7,minmax(110px,1fr))] gap-3 rounded-[30px] bg-white p-4 shadow-[0_12px_28px_rgba(41,49,58,0.06)]"
                        >
                          <div className="rounded-[24px] border border-[#edf1f6] bg-[#fbfcfe] p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#eef1f7] text-[#6d7785]">
                                {person.avatarUrl ? (
                                  <img src={person.avatarUrl} alt={person.name} className="h-full w-full object-cover" />
                                ) : (
                                  <UserRound className="h-5 w-5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[20px] font-extrabold tracking-[-0.04em] text-[#2d3640]">
                                  {person.name}
                                </p>
                                <p className="text-[13px] text-[#66707d]">
                                  {person.positionName || 'Мастер'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 text-[13px] font-semibold text-[#66707d]">
                              <span className="rounded-full bg-[#f3f6fa] px-3 py-2">{weekSummary.days} дн.</span>
                              <span className="rounded-full bg-[#f3f6fa] px-3 py-2">{weekSummary.intervals} интервала</span>
                              <span className="rounded-full bg-[#f3f6fa] px-3 py-2">{formatHours(weekSummary.hours)}</span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => onEditStaff(person)}
                                className="inline-flex h-11 items-center rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-[#39424d]"
                              >
                                Шаблон
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenDesktopEditor(person, selectedDate)}
                                className="inline-flex h-11 items-center rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-[#39424d]"
                              >
                                Изменить день
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenOnlineSlots(person, selectedDate)}
                                className="inline-flex h-11 items-center rounded-2xl bg-[#f4c900] px-4 text-sm font-extrabold text-[#2c3540]"
                              >
                                Слоты онлайн
                              </button>
                            </div>
                          </div>

                          {weekDates.map((date) => {
                            const intervals = getIntervalsForDate(hoursByStaff, person.id, date);
                            const active = toISODate(date) === selectedDateIso;
                            return (
                              <button
                                key={`${person.id}:${toISODate(date)}`}
                                type="button"
                                onClick={() => onOpenDesktopEditor(person, date)}
                                className={clsx(
                                  'rounded-[24px] border p-3 text-left transition',
                                  active
                                    ? 'border-[#f4c900] bg-[#fff8dd]'
                                    : intervals.length > 0
                                      ? 'border-[#e1e6ee] bg-[#fbfcfe] hover:bg-white'
                                      : 'border-[#eef2f6] bg-[#f7f9fc] hover:bg-white',
                                )}
                              >
                                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#98a0ac]">
                                  Смена
                                </p>
                                <p className="mt-2 text-[15px] font-extrabold text-[#2d3640]">
                                  {formatIntervalLabel(intervals)}
                                </p>
                                <p className="mt-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[#98a0ac]">
                                  Онлайн
                                </p>
                                <p className="mt-2 text-[14px] font-semibold text-[#66707d]">
                                  {formatBookingLabel(intervals)}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}

                    {staff.length === 0 ? (
                      <div className="rounded-[30px] border border-dashed border-[#dce2ea] bg-white px-6 py-10 text-center text-[16px] font-medium text-[#66707d]">
                        Нет сотрудников для отображения графика.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {editorStaff ? (
            <DayEditorPanel
              staff={editorStaff}
              date={selectedDate}
              start={editorStart}
              end={editorEnd}
              bookingStart={editorBookingStart}
              bookingEnd={editorBookingEnd}
              loading={loading}
              onClose={onCloseDesktopEditor}
              onStartChange={onEditorStartChange}
              onEndChange={onEditorEndChange}
              onBookingStartChange={onEditorBookingStartChange}
              onBookingEndChange={onEditorBookingEndChange}
              onPresetSelect={onEditorPresetSelect}
              onSave={onSaveEditor}
              onClear={onClearEditor}
            />
          ) : null}
        </div>
      </div>

      <div className="pb-28 pt-4 md:hidden">
        <section className="rounded-3xl border-[2px] border-line bg-white px-4 py-4 shadow-[0_14px_32px_rgba(41,49,58,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => onSelectDate(addDays(selectedDate, -7))} className="rounded-2xl border border-line p-2 text-ink">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className="text-[24px] font-extrabold text-ink">График</p>
              <p className="text-[13px] font-medium text-muted">{formatWeekLabel(selectedDate)}</p>
            </div>
            <button type="button" onClick={() => onSelectDate(addDays(selectedDate, 7))} className="rounded-2xl border border-line p-2 text-ink">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-screen px-3 py-3 text-center">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">Сотрудники</p>
              <p className="mt-2 text-[24px] font-extrabold text-ink">{selectedDayStats.totalStaff}</p>
            </div>
            <div className="rounded-2xl bg-screen px-3 py-3 text-center">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">В смене</p>
              <p className="mt-2 text-[24px] font-extrabold text-ink">{selectedDayStats.withShift}</p>
            </div>
            <div className="rounded-2xl bg-screen px-3 py-3 text-center">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">Онлайн</p>
              <p className="mt-2 text-[24px] font-extrabold text-ink">{selectedDayStats.withOnline}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            {weekDates.map((date) => {
              const active = toISODate(date) === selectedDateIso;
              return (
                <button
                  key={toISODate(date)}
                  type="button"
                  onClick={() => onSelectDate(date)}
                  className={clsx(
                    'min-w-[72px] rounded-2xl px-3 py-3 text-center transition',
                    active ? 'bg-accent text-ink' : 'bg-screen text-muted',
                  )}
                >
                  <p className="text-[12px] font-bold uppercase tracking-[0.12em]">
                    {ISO_DAY_OPTIONS[toISODay(date) - 1]?.short}
                  </p>
                  <p className="mt-2 text-[20px] font-extrabold">{date.getDate()}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onReload}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-line bg-white text-sm font-semibold text-ink"
            >
              <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
              Обновить
            </button>
            <button
              type="button"
              onClick={firstEditableStaff ? () => onEditStaff(firstEditableStaff) : onEdit}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent text-sm font-extrabold text-[#222b33]"
            >
              <Settings2 className="h-4 w-4" />
              Шаблон
            </button>
          </div>
        </section>

        <div className="mt-4 space-y-3">
          {staff.map((person) => {
            const todayIntervals = getIntervalsForDate(hoursByStaff, person.id, selectedDate);
            const weekSummary = getWeekSummary(hoursByStaff, person.id, weekDates);
            return (
              <section
                key={person.id}
                className="rounded-3xl border-[2px] border-line bg-white px-4 py-4 shadow-[0_14px_32px_rgba(41,49,58,0.08)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#eef1f7] text-[#6d7785]">
                    {person.avatarUrl ? (
                      <img src={person.avatarUrl} alt={person.name} className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[22px] font-extrabold text-ink">{person.name}</p>
                    <p className="text-[14px] font-medium text-muted">{person.positionName || 'Мастер'}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-screen px-4 py-3">
                    <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">Смена сегодня</p>
                    <p className="mt-2 text-[18px] font-extrabold text-ink">{formatIntervalLabel(todayIntervals)}</p>
                  </div>
                  <div className="rounded-2xl bg-screen px-4 py-3">
                    <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">Онлайн сегодня</p>
                    <p className="mt-2 text-[18px] font-extrabold text-ink">{formatBookingLabel(todayIntervals)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[13px] font-semibold text-muted">
                  <span className="rounded-full bg-screen px-3 py-2">{weekSummary.days} дн. в неделю</span>
                  <span className="rounded-full bg-screen px-3 py-2">{formatHours(weekSummary.hours)}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onEditStaff(person)}
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-line bg-white text-sm font-semibold text-ink"
                  >
                    Шаблон
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenDesktopEditor(person, selectedDate)}
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-line bg-white text-sm font-semibold text-ink"
                  >
                    Изменить день
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenOnlineSlots(person, selectedDate)}
                    className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-accent text-sm font-extrabold text-[#222b33]"
                  >
                    Слоты онлайн
                  </button>
                </div>
              </section>
            );
          })}

          {staff.length === 0 ? (
            <div className="rounded-3xl border-[2px] border-dashed border-line bg-white px-4 py-8 text-center text-[15px] font-medium text-muted">
              Нет сотрудников для отображения графика.
            </div>
          ) : null}
        </div>

        {editorStaff ? (
          <div className="fixed inset-x-3 bottom-20 z-30 rounded-[34px] bg-white shadow-[0_28px_64px_rgba(41,49,58,0.2)]">
            <DayEditorPanel
              staff={editorStaff}
              date={selectedDate}
              start={editorStart}
              end={editorEnd}
              bookingStart={editorBookingStart}
              bookingEnd={editorBookingEnd}
              loading={loading}
              onClose={onCloseDesktopEditor}
              onStartChange={onEditorStartChange}
              onEndChange={onEditorEndChange}
              onBookingStartChange={onEditorBookingStartChange}
              onBookingEndChange={onEditorBookingEndChange}
              onPresetSelect={onEditorPresetSelect}
              onSave={onSaveEditor}
              onClear={onClearEditor}
              mobile
            />
          </div>
        ) : null}
      </div>

      {onlineSlotsStaff && onlineSlotsDate ? (
        <OnlineSlotsModal
          staff={onlineSlotsStaff}
          date={onlineSlotsDate}
          shiftStart={onlineSlotsShiftStart}
          shiftEnd={onlineSlotsShiftEnd}
          bookingStart={onlineSlotsBookingStart}
          bookingEnd={onlineSlotsBookingEnd}
          selectedTimes={onlineSlotsSelectedTimes}
          loading={loading}
          onClose={onCloseOnlineSlots}
          onBookingStartChange={onOnlineSlotsBookingStartChange}
          onBookingEndChange={onOnlineSlotsBookingEndChange}
          onToggleTime={onToggleOnlineSlotTime}
          onToggleGroup={onToggleOnlineSlotGroup}
          onReset={onResetOnlineSlots}
          onSave={onSaveOnlineSlots}
        />
      ) : null}
    </>
  );
}
