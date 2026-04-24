import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Clock3,
  Copy,
  MonitorSmartphone,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react';
import { MONTHS_RU, MONTHS_RU_GENITIVE } from '../constants';
import {
  buildBookingSlotTimes,
  calculateScheduleIntervalHours,
  timeValueToMinutes,
} from '../controller/schedule';
import { toISODate } from '../helpers';
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
  onOnlineSlotsShiftStartChange: (value: string) => void;
  onOnlineSlotsShiftEndChange: (value: string) => void;
  onOnlineSlotsBookingStartChange: (value: string) => void;
  onOnlineSlotsBookingEndChange: (value: string) => void;
  onToggleOnlineSlotTime: (value: string) => void;
  onToggleOnlineSlotGroup: (values: string[]) => void;
  onResetOnlineSlots: () => void;
  onSaveOnlineSlots: () => void;
  onPasteScheduleDay: (item: StaffItem, date: Date, intervals: ScheduleInterval[]) => void;
  onPasteScheduleDate: (
    date: Date,
    entries: Array<{ staffId: string; staffName: string; intervals: ScheduleInterval[] }>,
  ) => void;
  onSelectDate: (value: Date) => void;
  onOpenTimetable: (value: Date) => void;
};

type OnlineSlotGroup = {
  key: 'morning' | 'day' | 'evening';
  label: string;
  times: string[];
};

type ScheduleRow = {
  staff: StaffItem;
  selectedDayIntervals: ScheduleInterval[];
  monthDays: number;
  monthHours: number;
  hasSchedule: boolean;
};

type PositionOption = {
  value: string;
  label: string;
};

type ScheduleFilterMode = 'all' | 'with' | 'without';

type ScheduleDayClipboard = {
  staffName: string;
  dateLabel: string;
  intervals: ScheduleInterval[];
};

type ScheduleDateClipboard = {
  dateLabel: string;
  entries: Array<{
    staffId: string;
    staffName: string;
    intervals: ScheduleInterval[];
  }>;
};

type ScheduleCellContextMenuState = {
  x: number;
  y: number;
  staff: StaffItem;
  date: Date;
  intervals: ScheduleInterval[];
};

type ScheduleDateContextMenuState = {
  x: number;
  y: number;
  date: Date;
  coverage: number;
};

const PRESETS = ['09:00-18:00', '10:00-19:00', '10:00-20:00', '12:00-21:00'] as const;
const STAFF_COLUMN_WIDTH = 344;
const TOTAL_COLUMN_WIDTH = 128;
const DAY_COLUMN_WIDTH = 56;
const MOBILE_DATE_STRIP_START_OFFSET = 20;

function getMonthDates(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1));
}

function getVisibleScheduleDates(date: Date) {
  const currentMonthDates = getMonthDates(date);
  const nextMonthDates = getMonthDates(new Date(date.getFullYear(), date.getMonth() + 1, 1));
  return [...currentMonthDates, ...nextMonthDates];
}

function formatWeekdayShort(date: Date) {
  return ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][date.getDay()] || '';
}

function formatLongDateLabel(date: Date) {
  return `${date.getDate()} ${MONTHS_RU_GENITIVE[date.getMonth()]} ${date.getFullYear()}`;
}

function formatShortMonthLabel(date: Date) {
  return MONTHS_RU[date.getMonth()].slice(0, 3);
}

function formatRange(start: string, end: string) {
  return `${start} - ${end}`;
}

function cloneScheduleIntervals(intervals: ScheduleInterval[]) {
  return intervals.map((interval) => ({
    ...interval,
    bookingSlots: interval.bookingSlots ? [...interval.bookingSlots] : interval.bookingSlots ?? null,
  }));
}

function getIntervalsForDate(hoursByStaff: WorkingHoursMap, staffId: string, date: Date) {
  return hoursByStaff[staffId]?.[toISODate(date)] ?? [];
}

function countMonthHours(hoursByStaff: WorkingHoursMap, staffId: string, monthDates: Date[]) {
  return monthDates.reduce((sum, date) => {
    return (
      sum +
      getIntervalsForDate(hoursByStaff, staffId, date).reduce(
        (intervalSum, interval) => intervalSum + calculateScheduleIntervalHours(interval),
        0,
      )
    );
  }, 0);
}

function countMonthDays(hoursByStaff: WorkingHoursMap, staffId: string, monthDates: Date[]) {
  return monthDates.filter((date) => getIntervalsForDate(hoursByStaff, staffId, date).length > 0).length;
}

function countStaffForDate(hoursByStaff: WorkingHoursMap, staff: StaffItem[], date: Date) {
  return staff.filter((item) => getIntervalsForDate(hoursByStaff, item.id, date).length > 0).length;
}

function formatHours(hours: number) {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} ч.` : `${rounded.toFixed(1).replace('.', ',')} ч.`;
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
      <span className="block text-[12px] font-bold uppercase tracking-[0.12em] text-[#8e97a4]">
        {label}
      </span>
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
  onCopy,
  onPaste,
  canPaste,
  hasDaySchedule,
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
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
  hasDaySchedule: boolean;
  mobile?: boolean;
}) {
  return (
    <section
      className={clsx(
        'rounded-[32px] border border-[#e0e5ed] bg-[#fbfcfe] shadow-[0_20px_48px_rgba(41,49,58,0.12)]',
        mobile ? 'p-4' : 'p-5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#8e97a4]">
            Настройка дня
          </p>
          <h2 className="mt-2 text-[28px] font-extrabold tracking-[-0.04em] text-[#28313b]">
            {staff.name}
          </h2>
          <p className="mt-2 text-[15px] text-[#66707d]">{formatLongDateLabel(date)}</p>
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
            {preset.replace('-', ' - ')}
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
            <h3 className="text-[18px] font-extrabold tracking-[-0.03em]">Окно онлайн-записи</h3>
          </div>
          <p className="mt-2 text-[14px] leading-6 text-[#66707d]">
            Это время попадет в клиентскую запись. Можно сделать окно уже смены и оставить только
            нужное время.
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
          {loading ? 'Сохранение...' : 'Сохранить день'}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-12 items-center rounded-2xl border border-[#f0d3cf] bg-white px-5 text-sm font-semibold text-[#a24f45]"
        >
          Очистить день
        </button>
        {hasDaySchedule ? (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dce2ea] bg-white px-5 text-sm font-semibold text-[#39424d]"
          >
            <Copy className="h-4 w-4" />
            Копировать день
          </button>
        ) : null}
        {!hasDaySchedule ? (
          <button
            type="button"
            onClick={onPaste}
            disabled={!canPaste || loading}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dce2ea] bg-white px-5 text-sm font-semibold text-[#39424d] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ClipboardPaste className="h-4 w-4" />
            Вставить день
          </button>
        ) : null}
      </div>
    </section>
  );
}

function DayEditorModal({
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
  onCopy,
  onPaste,
  canPaste,
  hasDaySchedule,
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
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
  hasDaySchedule: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] bg-[rgba(34,43,51,0.48)]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="hidden h-full items-center justify-center px-6 py-8 md:flex">
        <div className="w-full max-w-[560px]">
          <DayEditorPanel
            staff={staff}
            date={date}
            start={start}
            end={end}
            bookingStart={bookingStart}
            bookingEnd={bookingEnd}
            loading={loading}
            onClose={onClose}
            onStartChange={onStartChange}
            onEndChange={onEndChange}
            onBookingStartChange={onBookingStartChange}
            onBookingEndChange={onBookingEndChange}
            onPresetSelect={onPresetSelect}
            onSave={onSave}
            onClear={onClear}
            onCopy={onCopy}
            onPaste={onPaste}
            canPaste={canPaste}
            hasDaySchedule={hasDaySchedule}
          />
        </div>
      </div>

      <div className="flex h-full items-end md:hidden">
        <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[34px] bg-white shadow-[0_-24px_64px_rgba(41,49,58,0.24)]">
          <DayEditorPanel
            staff={staff}
            date={date}
            start={start}
            end={end}
            bookingStart={bookingStart}
            bookingEnd={bookingEnd}
            loading={loading}
            onClose={onClose}
            onStartChange={onStartChange}
            onEndChange={onEndChange}
            onBookingStartChange={onBookingStartChange}
            onBookingEndChange={onBookingEndChange}
            onPresetSelect={onPresetSelect}
            onSave={onSave}
            onClear={onClear}
            onCopy={onCopy}
            onPaste={onPaste}
            canPaste={canPaste}
            hasDaySchedule={hasDaySchedule}
            mobile
          />
        </div>
      </div>
    </div>
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
  onShiftStartChange,
  onShiftEndChange,
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
  onShiftStartChange: (value: string) => void;
  onShiftEndChange: (value: string) => void;
  onBookingStartChange: (value: string) => void;
  onBookingEndChange: (value: string) => void;
  onToggleTime: (value: string) => void;
  onToggleGroup: (values: string[]) => void;
  onReset: () => void;
  onSave: () => void;
}) {
  const slotGroups = useMemo(() => buildOnlineSlotGroups(shiftStart, shiftEnd), [shiftEnd, shiftStart]);
  const selectedSet = useMemo(() => new Set(selectedTimes), [selectedTimes]);
  const hasShift = timeValueToMinutes(shiftEnd) > timeValueToMinutes(shiftStart);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(34,43,51,0.48)] px-0 py-0 md:items-center md:px-3 md:py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full overflow-hidden rounded-t-[34px] bg-[#fbfcfe] shadow-[0_32px_72px_rgba(34,43,51,0.26)] md:max-h-full md:max-w-[980px] md:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e5eaf1] px-5 py-5 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#8e97a4]">
              Онлайн-запись
            </p>
            <h2 className="mt-2 text-[30px] font-extrabold tracking-[-0.05em] text-[#28313b]">
              Доступное время для клиентов
            </h2>
            <p className="mt-2 text-[15px] text-[#66707d]">
              {staff.name} · {formatLongDateLabel(date)} · смена {formatRange(shiftStart, shiftEnd)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dce2ea] bg-white text-[#39424d]"
            aria-label="Закрыть редактор онлайн-записи"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-84px)] overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="rounded-[28px] border border-[#e1e6ee] bg-white px-4 py-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#8e97a4]">День</p>
                <p className="mt-2 text-[22px] font-extrabold tracking-[-0.04em] text-[#28313b]">
                  {formatLongDateLabel(date)}
                </p>
              </div>
              <div className="rounded-[28px] border border-[#e1e6ee] bg-white p-4">
                <div className="flex items-center gap-2 text-[#28313b]">
                  <Clock3 className="h-4 w-4 text-[#946d00]" />
                  <h3 className="text-[18px] font-extrabold tracking-[-0.03em]">Рабочая смена</h3>
                </div>
                <div className="mt-4 grid gap-3">
                  <TimeField label="Начало смены" value={shiftStart} onChange={onShiftStartChange} />
                  <TimeField label="Конец смены" value={shiftEnd} onChange={onShiftEndChange} />
                </div>
              </div>
              <div className="rounded-[28px] border border-[#e1e6ee] bg-white p-4">
                <div className="flex items-center gap-2 text-[#28313b]">
                  <MonitorSmartphone className="h-4 w-4 text-[#946d00]" />
                  <h3 className="text-[18px] font-extrabold tracking-[-0.03em]">Окно записи</h3>
                </div>
                <p className="mt-2 text-[14px] leading-6 text-[#66707d]">
                  Если дня в графике еще нет, при сохранении он будет создан с этими границами смены.
                </p>
                <div className="mt-4 grid gap-3">
                  <TimeField label="Открыть онлайн" value={bookingStart} onChange={onBookingStartChange} />
                  <TimeField label="Закрыть онлайн" value={bookingEnd} onChange={onBookingEndChange} />
                </div>
              </div>
            </aside>

            <div className="space-y-4">
              <div className="rounded-[28px] border border-[#e1e6ee] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#8e97a4]">
                      Быстрый выбор
                    </p>
                    <h3 className="mt-1 text-[20px] font-extrabold tracking-[-0.03em] text-[#28313b]">
                      Отметьте доступное время
                    </h3>
                  </div>
                  <div className="rounded-2xl bg-[#f5f8fb] px-4 py-3 text-sm font-semibold text-[#607080]">
                    Выбрано: {selectedTimes.length}
                  </div>
                </div>

                {!hasShift ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-[#dce2ea] bg-[#fbfcfe] px-4 py-5 text-sm font-semibold text-[#7b8694]">
                    Сначала задайте рабочую смену для этого дня.
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {slotGroups.map((group) => {
                      const activeCount = group.times.filter((time) => selectedSet.has(time)).length;
                      const allSelected = activeCount === group.times.length;
                      return (
                        <div key={group.key} className="rounded-[24px] border border-[#edf1f6] bg-[#fbfcfe] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[16px] font-extrabold text-[#28313b]">{group.label}</p>
                              <p className="mt-1 text-sm font-semibold text-[#7a8593]">
                                {activeCount} из {group.times.length} значений времени
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onToggleGroup(group.times)}
                              className="inline-flex h-10 items-center rounded-2xl border border-[#dce2ea] bg-white px-4 text-xs font-bold uppercase tracking-[0.12em] text-[#39424d]"
                            >
                              {allSelected ? 'Снять' : 'Выбрать'}
                            </button>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {group.times.map((time) => {
                              const active = selectedSet.has(time);
                              const insideWindow = isTimeInsideRange(time, bookingStart, bookingEnd);
                              return (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => onToggleTime(time)}
                                  disabled={!insideWindow}
                                  className={clsx(
                                    'h-11 rounded-2xl border px-4 text-sm font-bold transition',
                                    active
                                      ? 'border-[#f4c900] bg-[#fff4bf] text-[#2c3540]'
                                      : insideWindow
                                        ? 'border-[#dce2ea] bg-white text-[#5f6875]'
                                        : 'border-[#edf1f6] bg-[#f5f7fa] text-[#b4bcc8]',
                                  )}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={loading}
                  className="inline-flex h-12 items-center rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#2c3540] shadow-[0_14px_30px_rgba(244,201,0,0.28)] disabled:opacity-60"
                >
                  {loading ? 'Сохранение...' : 'Сохранить время'}
                </button>
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex h-12 items-center rounded-2xl border border-[#dce2ea] bg-white px-5 text-sm font-semibold text-[#39424d]"
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterPanel({
  search,
  onSearchChange,
  positionOptions,
  positionValue,
  onPositionChange,
  scheduleMode,
  onScheduleModeChange,
  onReset,
  onClose,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  positionOptions: PositionOption[];
  positionValue: string;
  onPositionChange: (value: string) => void;
  scheduleMode: ScheduleFilterMode;
  onScheduleModeChange: (value: ScheduleFilterMode) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="w-full max-w-[360px] rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_24px_60px_rgba(31,39,50,0.16)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#8f98a6]">Фильтры</p>
          <p className="mt-1 text-[18px] font-extrabold tracking-[-0.03em] text-[#232c36]">
            Сотрудники и график
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d8e0ea] bg-white text-[#6f7b89]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <label className="mt-4 block">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8f98a6]">Поиск</span>
        <div className="mt-2 flex h-12 items-center gap-3 rounded-2xl border border-[#d8e0ea] bg-[#fbfcfe] px-4">
          <Search className="h-4 w-4 text-[#8f98a6]" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Имя или должность"
            className="w-full bg-transparent text-sm font-semibold text-[#2f3843] outline-none placeholder:text-[#a0a8b3]"
          />
        </div>
      </label>

      <label className="mt-4 block">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8f98a6]">Должность</span>
        <select
          value={positionValue}
          onChange={(event) => onPositionChange(event.target.value)}
          className="mt-2 h-12 w-full rounded-2xl border border-[#d8e0ea] bg-[#fbfcfe] px-4 text-sm font-semibold text-[#2f3843] outline-none"
        >
          {positionOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8f98a6]">График</span>
        <select
          value={scheduleMode}
          onChange={(event) => onScheduleModeChange(event.target.value as ScheduleFilterMode)}
          className="mt-2 h-12 w-full rounded-2xl border border-[#d8e0ea] bg-[#fbfcfe] px-4 text-sm font-semibold text-[#2f3843] outline-none"
        >
          <option value="all">Все</option>
          <option value="with">Есть график</option>
          <option value="without">Нет графика</option>
        </select>
      </label>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-11 items-center rounded-2xl border border-[#d8e0ea] bg-white px-4 text-sm font-semibold text-[#2f3843]"
        >
          Сбросить
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 items-center rounded-2xl bg-[#232427] px-4 text-sm font-semibold text-white"
        >
          Готово
        </button>
      </div>
    </div>
  );
}

function SettingsMenu({
  showEmployeeTotals,
  showDayTotals,
  onToggleEmployeeTotals,
  onToggleDayTotals,
  onClose,
}: {
  showEmployeeTotals: boolean;
  showDayTotals: boolean;
  onToggleEmployeeTotals: () => void;
  onToggleDayTotals: () => void;
  onClose: () => void;
}) {
  const items = [
    {
      label: 'Суммы смен и часов у сотрудников',
      active: showEmployeeTotals,
      onClick: onToggleEmployeeTotals,
    },
    {
      label: 'Количество сотрудников по дням',
      active: showDayTotals,
      onClick: onToggleDayTotals,
    },
  ];

  return (
    <div className="w-full max-w-[320px] rounded-[28px] border border-[#e2e8f0] bg-white p-3 shadow-[0_24px_60px_rgba(31,39,50,0.16)]">
      <div className="flex items-center justify-between gap-3 px-2 pb-2">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#8f98a6]">Настройки</p>
          <p className="mt-1 text-[18px] font-extrabold tracking-[-0.03em] text-[#232c36]">Отображение</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d8e0ea] bg-white text-[#6f7b89]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#f5f8fb]"
          >
            <span className="text-sm font-semibold text-[#2f3843]">{item.label}</span>
            <span
              className={clsx(
                'inline-flex h-6 w-6 items-center justify-center rounded-full border',
                item.active
                  ? 'border-[#232427] bg-[#232427] text-white'
                  : 'border-[#d8e0ea] bg-white text-transparent',
              )}
            >
              <Check className="h-3.5 w-3.5" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StaffMenu({
  staff,
  selectedDate,
  hasOnlineSlotEditor,
  onClose,
  onEditDay,
  onOpenOnlineSlots,
  onEditTemplate,
}: {
  staff: StaffItem;
  selectedDate: Date;
  hasOnlineSlotEditor: boolean;
  onClose: () => void;
  onEditDay: () => void;
  onOpenOnlineSlots: () => void;
  onEditTemplate: () => void;
}) {
  const actions = [
    {
      label: 'Изменить день',
      icon: CalendarDays,
      onClick: onEditDay,
      disabled: false,
    },
    {
      label: 'Онлайн-окно на день',
      icon: MonitorSmartphone,
      onClick: onOpenOnlineSlots,
      disabled: !hasOnlineSlotEditor,
    },
    {
      label: 'Настроить шаблон',
      icon: Settings2,
      onClick: onEditTemplate,
      disabled: false,
    },
  ];

  return (
    <div className="w-full max-w-[280px] rounded-[28px] border border-[#e2e8f0] bg-white p-3 shadow-[0_24px_60px_rgba(31,39,50,0.16)]">
      <div className="px-2 pb-2">
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#8f98a6]">{staff.name}</p>
        <p className="mt-1 text-sm font-semibold text-[#6f7b89]">{formatLongDateLabel(selectedDate)}</p>
      </div>
      <div className="space-y-1">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                if (action.disabled) {
                  return;
                }
                action.onClick();
                onClose();
              }}
              disabled={action.disabled}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#f5f8fb] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Icon className="h-4 w-4 text-[#7a8593]" />
              <span className="text-sm font-semibold text-[#2f3843]">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleCellContextMenu({
  state,
  canPaste,
  clipboard,
  onCopy,
  onPaste,
}: {
  state: ScheduleCellContextMenuState;
  canPaste: boolean;
  clipboard: ScheduleDayClipboard | null;
  onCopy: () => void;
  onPaste: () => void;
}) {
  const hasIntervals = state.intervals.length > 0;

  return (
    <div
      className="fixed z-[80] w-[240px] rounded-[22px] border border-[#e2e8f0] bg-white p-2 shadow-[0_24px_60px_rgba(31,39,50,0.18)]"
      style={{ left: state.x, top: state.y }}
    >
      <div className="px-3 py-2">
        <p className="truncate text-[12px] font-bold uppercase tracking-[0.14em] text-[#8f98a6]">
          {state.staff.name}
        </p>
        <p className="mt-1 text-sm font-semibold text-[#6f7b89]">{formatLongDateLabel(state.date)}</p>
      </div>
      <div className="space-y-1">
        <button
          type="button"
          onClick={onCopy}
          disabled={!hasIntervals}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#f5f8fb] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Copy className="h-4 w-4 text-[#7a8593]" />
          <span className="text-sm font-semibold text-[#2f3843]">Копировать</span>
        </button>
        <button
          type="button"
          onClick={onPaste}
          disabled={!canPaste}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#f5f8fb] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ClipboardPaste className="h-4 w-4 text-[#7a8593]" />
          <span className="text-sm font-semibold text-[#2f3843]">Вставить</span>
        </button>
      </div>
      {clipboard ? (
        <p className="px-3 pb-2 pt-1 text-[11px] font-semibold leading-4 text-[#8a94a1]">
          Скопировано: {clipboard.staffName}, {clipboard.dateLabel}
        </p>
      ) : null}
    </div>
  );
}

function ScheduleDateContextMenu({
  state,
  clipboard,
  onCopy,
  onPaste,
}: {
  state: ScheduleDateContextMenuState;
  clipboard: ScheduleDateClipboard | null;
  onCopy: () => void;
  onPaste: () => void;
}) {
  const canCopy = state.coverage > 0;
  const canPaste = Boolean(clipboard);

  return (
    <div
      className="fixed z-[80] w-[260px] rounded-[22px] border border-[#e2e8f0] bg-white p-2 shadow-[0_24px_60px_rgba(31,39,50,0.18)]"
      style={{ left: state.x, top: state.y }}
    >
      <div className="px-3 py-2">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8f98a6]">Графики дня</p>
        <p className="mt-1 text-sm font-semibold text-[#6f7b89]">{formatLongDateLabel(state.date)}</p>
      </div>
      <div className="space-y-1">
        <button
          type="button"
          onClick={onCopy}
          disabled={!canCopy}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#f5f8fb] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Copy className="h-4 w-4 text-[#7a8593]" />
          <span className="text-sm font-semibold text-[#2f3843]">Копировать графики</span>
        </button>
        <button
          type="button"
          onClick={onPaste}
          disabled={!canPaste}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#f5f8fb] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ClipboardPaste className="h-4 w-4 text-[#7a8593]" />
          <span className="text-sm font-semibold text-[#2f3843]">Вставить графики</span>
        </button>
      </div>
      {clipboard ? (
        <p className="px-3 pb-2 pt-1 text-[11px] font-semibold leading-4 text-[#8a94a1]">
          Скопировано: {clipboard.entries.length} граф., {clipboard.dateLabel}
        </p>
      ) : null}
    </div>
  );
}

function ScheduleCell({
  intervals,
  isSelected,
  onClick,
  onContextMenu,
}: {
  intervals: ScheduleInterval[];
  isSelected: boolean;
  onClick: () => void;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const first = intervals[0];
  const hasIntervals = Boolean(first);
  const timeLabel = first ? `${first.start}\n${first.end}` : '';

  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={clsx(
        'group relative flex min-h-[92px] w-full items-stretch border-r border-b border-[#e7edf4] bg-white p-[3px] text-left transition',
        isSelected ? 'bg-[#fff9e8]' : 'hover:bg-[#fbfcfe]',
      )}
    >
      {hasIntervals ? (
        <div className="flex min-h-[84px] w-full flex-col justify-start items-center rounded-[12px] bg-[#d8f5cd] px-6 py-5 text-[10px] font-extrabold leading-[1.35] text-[#57a057] whitespace-pre-line">
          {timeLabel}
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-[6px] flex items-center justify-center rounded-[12px] border-2 border-dashed border-[#22c33a] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <span className="text-[30px] font-light leading-none text-[#22c33a]">+</span>
        </div>
      )}
    </button>
  );
}

function MobileStaffCard({
  row,
  selectedDate,
  onOpenMenu,
  onOpenDay,
  onOpenOnlineSlots,
  onEditTemplate,
}: {
  row: ScheduleRow;
  selectedDate: Date;
  onOpenMenu: () => void;
  onOpenDay: () => void;
  onOpenOnlineSlots: () => void;
  onEditTemplate: () => void;
}) {
  const dayInterval = row.selectedDayIntervals[0];
  const hasOnlineSlotEditor = row.selectedDayIntervals.length <= 1;

  return (
    <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_12px_32px_rgba(31,39,50,0.06)]">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[20px] bg-[#eef2f6] text-[#65707d]">
          {row.staff.avatarUrl ? (
            <img src={row.staff.avatarUrl} alt={row.staff.name} className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[22px] font-extrabold tracking-[-0.04em] text-[#232c36]">
            {row.staff.name}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#728090]">
            {row.staff.positionName || 'Сотрудник'}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenMenu}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d8e0ea] bg-white text-[#7b8694]"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#f5f8fb] px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8f98a6]">На месяц</p>
          <p className="mt-2 text-base font-extrabold text-[#232c36]">
            {row.monthDays} дн. · {formatHours(row.monthHours)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f5f8fb] px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8f98a6]">
            {formatLongDateLabel(selectedDate)}
          </p>
          <p className="mt-2 text-base font-extrabold text-[#232c36]">
            {dayInterval ? `${dayInterval.start} - ${dayInterval.end}` : 'Пусто'}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onOpenDay}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#232427] px-3 text-sm font-bold text-white"
        >
          <CalendarDays className="h-4 w-4" />
          День
        </button>
        <button
          type="button"
          onClick={onEditTemplate}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#d8e0ea] bg-white px-3 text-sm font-bold text-[#2f3843]"
        >
          <Settings2 className="h-4 w-4" />
          Шаблон
        </button>
        <button
          type="button"
          onClick={onOpenOnlineSlots}
          disabled={!hasOnlineSlotEditor}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#d8e0ea] bg-white px-3 text-sm font-bold text-[#2f3843] disabled:opacity-45"
        >
          <MonitorSmartphone className="h-4 w-4" />
          Онлайн
        </button>
      </div>
    </section>
  );
}

export function ScheduleScreen({
  selectedDate,
  staff,
  hoursByStaff,
  editorStaff,
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
  onEditorStartChange,
  onEditorEndChange,
  onEditorBookingStartChange,
  onEditorBookingEndChange,
  onEditorPresetSelect,
  onSaveEditor,
  onClearEditor,
  onOpenOnlineSlots,
  onCloseOnlineSlots,
  onOnlineSlotsShiftStartChange,
  onOnlineSlotsShiftEndChange,
  onOnlineSlotsBookingStartChange,
  onOnlineSlotsBookingEndChange,
  onToggleOnlineSlotTime,
  onToggleOnlineSlotGroup,
  onResetOnlineSlots,
  onSaveOnlineSlots,
  onPasteScheduleDay,
  onPasteScheduleDate,
  onSelectDate,
  onOpenTimetable,
}: ScheduleScreenProps) {
  const desktopHeaderScrollRef = useRef<HTMLDivElement | null>(null);
  const desktopBodyScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileDateStripRef = useRef<HTMLDivElement | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [staffMenuId, setStaffMenuId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [positionValue, setPositionValue] = useState('');
  const [scheduleMode, setScheduleMode] = useState<ScheduleFilterMode>('all');
  const [showEmployeeTotals, setShowEmployeeTotals] = useState(true);
  const [showDayTotals, setShowDayTotals] = useState(true);
  const [dayClipboard, setDayClipboard] = useState<ScheduleDayClipboard | null>(null);
  const [dateClipboard, setDateClipboard] = useState<ScheduleDateClipboard | null>(null);
  const [cellContextMenu, setCellContextMenu] = useState<ScheduleCellContextMenuState | null>(null);
  const [dateContextMenu, setDateContextMenu] = useState<ScheduleDateContextMenuState | null>(null);

  const monthDates = useMemo(() => getMonthDates(selectedDate), [selectedDate]);
  const visibleDates = useMemo(() => getVisibleScheduleDates(selectedDate), [selectedDate]);
  const selectedIso = toISODate(selectedDate);

  const allRows = useMemo<ScheduleRow[]>(
    () =>
      staff.map((item) => {
        const selectedDayIntervals = getIntervalsForDate(hoursByStaff, item.id, selectedDate);
        const monthDays = countMonthDays(hoursByStaff, item.id, monthDates);
        const monthHours = countMonthHours(hoursByStaff, item.id, monthDates);
        return {
          staff: item,
          selectedDayIntervals,
          monthDays,
          monthHours,
          hasSchedule: monthDays > 0,
        };
      }),
    [hoursByStaff, monthDates, selectedDate, staff],
  );

  const positionOptions = useMemo<PositionOption[]>(() => {
    const values = Array.from(
      new Set(staff.map((item) => item.positionName?.trim() || '').filter(Boolean)),
    ).sort((left, right) => left.localeCompare(right, 'ru'));

    return [{ value: '', label: 'Все должности' }, ...values.map((value) => ({ value, label: value }))];
  }, [staff]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return allRows.filter((row) => {
      if (normalizedSearch) {
        const haystack = `${row.staff.name} ${row.staff.positionName || ''}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      if (positionValue && (row.staff.positionName || '') !== positionValue) {
        return false;
      }

      if (scheduleMode === 'with' && !row.hasSchedule) {
        return false;
      }

      if (scheduleMode === 'without' && row.hasSchedule) {
        return false;
      }

      return true;
    });
  }, [allRows, positionValue, scheduleMode, searchValue]);

  const dayCoverage = useMemo(
    () =>
      visibleDates.map((date) => ({
        iso: toISODate(date),
        count: countStaffForDate(
          hoursByStaff,
          filteredRows.map((row) => row.staff),
          date,
        ),
      })),
    [filteredRows, hoursByStaff, visibleDates],
  );

  const activeFilterCount =
    (searchValue.trim() ? 1 : 0) + (positionValue ? 1 : 0) + (scheduleMode !== 'all' ? 1 : 0);
  const monthLabel = `${MONTHS_RU_GENITIVE[selectedDate.getMonth()][0]?.toUpperCase() || ''}${MONTHS_RU_GENITIVE[
    selectedDate.getMonth()
  ].slice(1)} ${selectedDate.getFullYear()}`;
  const gridTemplateColumns = `${STAFF_COLUMN_WIDTH}px ${showEmployeeTotals ? `${TOTAL_COLUMN_WIDTH}px ` : ''}repeat(${visibleDates.length}, ${DAY_COLUMN_WIDTH}px)`;
  const gridMinWidth =
    STAFF_COLUMN_WIDTH + (showEmployeeTotals ? TOTAL_COLUMN_WIDTH : 0) + visibleDates.length * DAY_COLUMN_WIDTH;
  const openMenuRow = filteredRows.find((row) => row.staff.id === staffMenuId) ?? null;
  const selectedDayWorkingRows = filteredRows.filter((row) => row.selectedDayIntervals.length > 0);
  const editorDayIntervals = editorStaff ? getIntervalsForDate(hoursByStaff, editorStaff.id, selectedDate) : [];
  const hasEditorDaySchedule = editorDayIntervals.length > 0;
  const editorDraftInterval = {
    start: editorStart,
    end: editorEnd,
    bookingStart: editorBookingStart,
    bookingEnd: editorBookingEnd,
    bookingSlots: null,
  };

  const resetFilters = () => {
    setSearchValue('');
    setPositionValue('');
    setScheduleMode('all');
  };

  const copyScheduleDay = (input: {
    staff: StaffItem;
    date: Date;
    intervals: ScheduleInterval[];
    fallbackIntervals?: ScheduleInterval[];
  }) => {
    const intervalsToCopy = input.intervals.length > 0 ? input.intervals : input.fallbackIntervals ?? [];
    if (intervalsToCopy.length === 0) {
      return;
    }
    setDayClipboard({
      staffName: input.staff.name,
      dateLabel: formatLongDateLabel(input.date),
      intervals: cloneScheduleIntervals(intervalsToCopy),
    });
  };

  const pasteScheduleDay = (staffItem: StaffItem, date: Date) => {
    if (!dayClipboard) {
      return;
    }
    onPasteScheduleDay(staffItem, date, cloneScheduleIntervals(dayClipboard.intervals));
  };

  const copyScheduleDate = (date: Date) => {
    const entries = staff
      .map((item) => ({
        staffId: item.id,
        staffName: item.name,
        intervals: cloneScheduleIntervals(getIntervalsForDate(hoursByStaff, item.id, date)),
      }))
      .filter((entry) => entry.intervals.length > 0);

    if (entries.length === 0) {
      return;
    }
    setDateClipboard({
      dateLabel: formatLongDateLabel(date),
      entries,
    });
  };

  const pasteScheduleDate = (date: Date) => {
    if (!dateClipboard) {
      return;
    }
    onPasteScheduleDate(
      date,
      dateClipboard.entries.map((entry) => ({
        ...entry,
        intervals: cloneScheduleIntervals(entry.intervals),
      })),
    );
  };

  const closeFloatingMenus = () => {
    setFiltersOpen(false);
    setSettingsOpen(false);
    setStaffMenuId(null);
    setCellContextMenu(null);
    setDateContextMenu(null);
  };

  useEffect(() => {
    const header = desktopHeaderScrollRef.current;
    const body = desktopBodyScrollRef.current;
    if (!header || !body) {
      return;
    }

    let activeSource: 'header' | 'body' | null = null;

    const handleHeaderScroll = () => {
      if (activeSource === 'body') {
        return;
      }
      activeSource = 'header';
      body.scrollLeft = header.scrollLeft;
      window.requestAnimationFrame(() => {
        activeSource = null;
      });
    };

    const handleBodyScroll = () => {
      if (activeSource === 'header') {
        return;
      }
      activeSource = 'body';
      header.scrollLeft = body.scrollLeft;
      window.requestAnimationFrame(() => {
        activeSource = null;
      });
    };

    header.addEventListener('scroll', handleHeaderScroll, { passive: true });
    body.addEventListener('scroll', handleBodyScroll, { passive: true });
    header.scrollLeft = body.scrollLeft;

    return () => {
      header.removeEventListener('scroll', handleHeaderScroll);
      body.removeEventListener('scroll', handleBodyScroll);
    };
  }, [gridMinWidth]);

  useEffect(() => {
    const header = desktopHeaderScrollRef.current;
    const body = desktopBodyScrollRef.current;
    if (!header || !body) {
      return;
    }

    const todayIso = toISODate(new Date());
    const startIso = visibleDates.some((date) => toISODate(date) === todayIso) ? todayIso : selectedIso;
    const startIndex = visibleDates.findIndex((date) => toISODate(date) === startIso);
    if (startIndex < 0) {
      return;
    }

    const nextScrollLeft = startIndex * DAY_COLUMN_WIDTH;
    header.scrollLeft = nextScrollLeft;
    body.scrollLeft = nextScrollLeft;
  }, [selectedIso, visibleDates]);

  useEffect(() => {
    const strip = mobileDateStripRef.current;
    if (!strip) {
      return;
    }

    const selectedIndex = monthDates.findIndex((date) => toISODate(date) === selectedIso);
    if (selectedIndex < 0) {
      return;
    }

    const selectedNode = strip.querySelector<HTMLElement>(`[data-date="${selectedIso}"]`);
    if (!selectedNode) {
      return;
    }

    strip.scrollLeft = Math.max(0, selectedNode.offsetLeft - MOBILE_DATE_STRIP_START_OFFSET);
  }, [monthDates, selectedIso]);

  return (
    <>
      <div className="pb-6 pt-4 md:pt-6">
        <section className="overflow-x-hidden overflow-y-visible rounded-[34px] border border-[#dfe6ee] bg-white shadow-[0_24px_60px_rgba(31,39,50,0.08)]">
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur">
            <div className="border-b border-[#e7edf4] px-4 py-4 md:px-6 md:py-5">
              <div className="space-y-4 xl:hidden">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d8e0ea] bg-white text-[#2f3843]"
                    aria-label="Предыдущий месяц"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 text-center">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8f98a6]">График</p>
                    <h1 className="mt-1 truncate text-[24px] font-extrabold text-[#2f3843]">
                      {monthLabel}
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d8e0ea] bg-white text-[#2f3843]"
                    aria-label="Следующий месяц"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFiltersOpen((value) => !value);
                      setSettingsOpen(false);
                      setStaffMenuId(null);
                    }}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#f0c64d] bg-white px-3 text-sm font-bold text-[#2f3843]"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Фильтры
                    {activeFilterCount > 0 ? (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#232427] px-1 text-[10px] font-bold text-white">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenTimetable(selectedDate)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#d8e0ea] bg-white px-3 text-sm font-bold text-[#2f3843]"
                  >
                    <CalendarDays className="h-4 w-4" />
                    День
                  </button>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#232427] px-3 text-sm font-bold text-white"
                  >
                    <Settings2 className="h-4 w-4" />
                    Шаблон
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen((value) => !value);
                      setFiltersOpen(false);
                      setStaffMenuId(null);
                    }}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#d8e0ea] bg-white px-3 text-sm font-bold text-[#2f3843]"
                  >
                    <MonitorSmartphone className="h-4 w-4" />
                    Вид
                  </button>
                </div>

                <div className="rounded-[24px] bg-[#f5f8fb] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8f98a6]">
                        Выбранный день
                      </p>
                      <p className="mt-2 text-[20px] font-extrabold text-[#232c36]">
                        {formatLongDateLabel(selectedDate)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectDate(new Date())}
                      className="inline-flex h-10 items-center rounded-2xl border border-[#d8e0ea] bg-white px-3 text-sm font-bold text-[#2f3843]"
                    >
                      Сегодня
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8f98a6]">Работают</p>
                      <p className="mt-1 text-[20px] font-extrabold text-[#232c36]">{selectedDayWorkingRows.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8f98a6]">В списке</p>
                      <p className="mt-1 text-[20px] font-extrabold text-[#232c36]">{filteredRows.length}</p>
                    </div>
                    <button
                      type="button"
                      onClick={onReload}
                      className="inline-flex flex-col items-start justify-center rounded-2xl bg-white px-3 py-3 text-left text-[#2f3843]"
                    >
                      <RefreshCw className={clsx('h-4 w-4', loading ? 'animate-spin' : undefined)} />
                      <span className="mt-1 text-[12px] font-extrabold">Обновить</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="hidden flex-col gap-4 xl:flex xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFiltersOpen((value) => !value);
                      setSettingsOpen(false);
                      setStaffMenuId(null);
                    }}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#f0c64d] bg-white px-4 text-sm font-semibold text-[#2f3843]"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Фильтры
                    {activeFilterCount > 0 ? (
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#232427] px-1.5 text-[11px] font-bold text-white">
                        {activeFilterCount}
                      </span>
                    ) : null}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d8e0ea] bg-white text-[#2f3843]"
                    aria-label="Предыдущий месяц"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d8e0ea] bg-white text-[#2f3843]"
                    aria-label="Следующий месяц"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <h1 className="ml-1 text-[24px] font-extrabold tracking-[-0.04em] text-[#2f3843] md:text-[28px]">
                    {monthLabel}
                  </h1>
                  <button
                    type="button"
                    onClick={() => onSelectDate(new Date())}
                    className="inline-flex h-11 items-center rounded-2xl border border-[#d8e0ea] bg-white px-4 text-sm font-semibold text-[#2f3843]"
                  >
                    Сегодня
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenTimetable(selectedDate)}
                    className="inline-flex h-11 items-center rounded-2xl bg-[#f1f3f5] px-4 text-sm font-semibold text-[#5e6774]"
                  >
                    Неделя
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center rounded-2xl bg-[#232427] px-4 text-sm font-semibold text-white"
                  >
                    Месяц
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen((value) => !value);
                      setFiltersOpen(false);
                      setStaffMenuId(null);
                    }}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d8e0ea] bg-white text-[#7d8693]"
                    aria-label="Настройки отображения"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onReload}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d8e0ea] bg-white px-4 text-sm font-semibold text-[#2f3843]"
                  >
                    <RefreshCw className={clsx('h-4 w-4', loading ? 'animate-spin' : undefined)} />
                    Обновить
                  </button>
                </div>
              </div>
            </div>

            <div className="hidden xl:block">
              <div ref={desktopHeaderScrollRef} className="overflow-x-auto border-b border-[#e7edf4]">
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns,
                    minWidth: gridMinWidth,
                  }}
                >
                  <div className="sticky left-0 z-[26] flex items-center gap-3 border-r border-[#e7edf4] bg-white px-5 py-5">
                    <span className="text-[20px] font-semibold text-[#2f3843]">Сотрудники</span>
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#eef2f7] px-2 text-xs font-bold text-[#8a93a0]">
                      {filteredRows.length}
                    </span>
                  </div>

                  {showEmployeeTotals ? (
                    <div
                      className="sticky z-[25] border-r border-[#e7edf4] bg-white px-4 py-5 shadow-[8px_0_18px_rgba(31,39,50,0.04)]"
                      style={{ left: STAFF_COLUMN_WIDTH }}
                    >
                      <p className="text-[14px] font-semibold text-[#9aa2af]">Всего</p>
                      <p className="mt-1 text-[16px] font-semibold text-[#66707d]">
                        {`${MONTHS_RU[selectedDate.getMonth()][0]?.toUpperCase() || ''}${MONTHS_RU[
                          selectedDate.getMonth()
                        ].slice(1)}`}
                      </p>
                    </div>
                  ) : null}

                  {visibleDates.map((date, index) => {
                    const iso = toISODate(date);
                    const coverage = dayCoverage[index]?.count ?? 0;
                    const isSelected = iso === selectedIso;
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const isToday = iso === toISODate(new Date());
                    return (
                      <button
                        key={`head-${iso}`}
                        type="button"
                        onClick={() => onSelectDate(date)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setFiltersOpen(false);
                          setSettingsOpen(false);
                          setStaffMenuId(null);
                          setCellContextMenu(null);
                          setDateContextMenu({
                            x: Math.min(event.clientX, window.innerWidth - 280),
                            y: Math.min(event.clientY, window.innerHeight - 190),
                            date,
                            coverage,
                          });
                        }}
                        className={clsx(
                          'border-r border-[#e7edf4] px-2 py-4 text-center transition',
                          isSelected ? 'bg-[#fff5c9]' : 'bg-white hover:bg-[#fafbfc]',
                        )}
                      >
                        <div
                          className={clsx(
                            'mx-auto inline-flex min-w-[34px] flex-col items-center justify-center rounded-[10px] px-1 py-1',
                            isToday ? 'bg-[#ffd74d]' : undefined,
                          )}
                        >
                          <p
                            className={clsx(
                              'text-[14px] font-semibold leading-none',
                              isWeekend ? 'text-[#e07171]' : 'text-[#2f3843]',
                            )}
                          >
                            {date.getDate()}
                          </p>
                          <p
                            className={clsx(
                              'mt-1 text-[11px] font-medium uppercase',
                              isWeekend ? 'text-[#e07171]' : 'text-[#737d89]',
                            )}
                          >
                            {formatWeekdayShort(date)}
                          </p>
                        </div>
                        {showDayTotals ? (
                          <p className="mt-3 text-[11px] font-semibold text-[#98a2af]">
                            {coverage > 0 ? `👤 ${coverage}` : '–'}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            {filtersOpen || settingsOpen || openMenuRow || cellContextMenu || dateContextMenu ? (
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={closeFloatingMenus}
                onContextMenu={(event) => {
                  event.preventDefault();
                  closeFloatingMenus();
                }}
              />
            ) : null}

            {filtersOpen ? (
              <div className="absolute left-4 top-4 z-50 md:left-6">
                <FilterPanel
                  search={searchValue}
                  onSearchChange={setSearchValue}
                  positionOptions={positionOptions}
                  positionValue={positionValue}
                  onPositionChange={setPositionValue}
                  scheduleMode={scheduleMode}
                  onScheduleModeChange={setScheduleMode}
                  onReset={resetFilters}
                  onClose={() => setFiltersOpen(false)}
                />
              </div>
            ) : null}

            {settingsOpen ? (
              <div className="absolute right-4 top-4 z-50 md:right-6">
                <SettingsMenu
                  showEmployeeTotals={showEmployeeTotals}
                  showDayTotals={showDayTotals}
                  onToggleEmployeeTotals={() => setShowEmployeeTotals((value) => !value)}
                  onToggleDayTotals={() => setShowDayTotals((value) => !value)}
                  onClose={() => setSettingsOpen(false)}
                />
              </div>
            ) : null}

            {cellContextMenu ? (
              <ScheduleCellContextMenu
                state={cellContextMenu}
                clipboard={dayClipboard}
                canPaste={Boolean(dayClipboard) && cellContextMenu.intervals.length === 0}
                onCopy={() => {
                  copyScheduleDay({
                    staff: cellContextMenu.staff,
                    date: cellContextMenu.date,
                    intervals: cellContextMenu.intervals,
                  });
                  setCellContextMenu(null);
                }}
                onPaste={() => {
                  pasteScheduleDay(cellContextMenu.staff, cellContextMenu.date);
                  setCellContextMenu(null);
                }}
              />
            ) : null}

            {dateContextMenu ? (
              <ScheduleDateContextMenu
                state={dateContextMenu}
                clipboard={dateClipboard}
                onCopy={() => {
                  copyScheduleDate(dateContextMenu.date);
                  setDateContextMenu(null);
                }}
                onPaste={() => {
                  pasteScheduleDate(dateContextMenu.date);
                  setDateContextMenu(null);
                }}
              />
            ) : null}

            <div className="xl:hidden px-4 py-4">
              <div ref={mobileDateStripRef} className="scrollbar-hidden overflow-x-auto pb-2">
                <div className="flex w-max gap-2">
                  {monthDates.map((date) => {
                    const active = toISODate(date) === selectedIso;
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const coverage = dayCoverage.find((item) => item.iso === toISODate(date))?.count ?? 0;
                    return (
                      <button
                        key={toISODate(date)}
                        data-date={toISODate(date)}
                        type="button"
                        onClick={() => onSelectDate(date)}
                        className={clsx(
                          'min-w-[92px] rounded-[22px] border px-4 py-3 text-left transition',
                          active
                            ? 'border-[#f4c900] bg-[#fff4bf] text-[#232c36]'
                            : 'border-[#d8e0ea] bg-white text-[#4c5664]',
                        )}
                      >
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em]">
                          {formatWeekdayShort(date)}
                        </p>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8f98a6]">
                          {formatShortMonthLabel(date)}
                        </p>
                        <p
                          className={clsx(
                            'mt-1 text-[26px] font-extrabold',
                            isWeekend ? 'text-[#c95555]' : undefined,
                          )}
                        >
                          {String(date.getDate()).padStart(2, '0')}
                        </p>
                        {showDayTotals ? (
                          <p className="mt-2 text-[12px] font-semibold text-[#85909d]">
                            {coverage > 0 ? `${coverage} раб.` : 'Пусто'}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {filteredRows.map((row) => (
                  <MobileStaffCard
                    key={row.staff.id}
                    row={row}
                    selectedDate={selectedDate}
                    onOpenMenu={() => {
                      setStaffMenuId(row.staff.id);
                      setFiltersOpen(false);
                      setSettingsOpen(false);
                    }}
                    onOpenDay={() => onOpenDesktopEditor(row.staff, selectedDate)}
                    onOpenOnlineSlots={() => onOpenOnlineSlots(row.staff, selectedDate)}
                    onEditTemplate={() => onEditStaff(row.staff)}
                  />
                ))}
              </div>
            </div>

            <div className="hidden xl:block">
              <div ref={desktopBodyScrollRef} className="overflow-x-auto overflow-y-visible">
                <div className="relative" style={{ minWidth: gridMinWidth }}>
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns,
                      minWidth: gridMinWidth,
                    }}
                  >
                    {filteredRows.flatMap((row) => {
                      return [
                        <div
                          key={`${row.staff.id}-meta`}
                          className={clsx(
                            'sticky left-0 flex items-center gap-3 border-r border-b border-[#e7edf4] bg-white px-5 py-4',
                            staffMenuId === row.staff.id ? 'z-[60]' : 'z-10',
                          )}
                        >
                          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#f1f4f8] text-[#8b94a1]">
                            {row.staff.avatarUrl ? (
                              <img src={row.staff.avatarUrl} alt={row.staff.name} className="h-full w-full object-cover" />
                            ) : (
                              <UserRound className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[16px] font-semibold text-[#2f3843]">{row.staff.name}</p>
                            <p className="mt-0.5 truncate text-[12px] font-medium text-[#8a94a1]">
                              {row.staff.positionName || 'Сотрудник'}
                            </p>
                          </div>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setStaffMenuId((value) => (value === row.staff.id ? null : row.staff.id));
                                setFiltersOpen(false);
                                setSettingsOpen(false);
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#9099a6] transition hover:bg-[#f3f6fa]"
                              aria-label={`Открыть действия для ${row.staff.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {staffMenuId === row.staff.id ? (
                              <div className="absolute right-0 top-[calc(100%-4px)] z-[70]">
                                <StaffMenu
                                  staff={row.staff}
                                  selectedDate={selectedDate}
                                  hasOnlineSlotEditor={row.selectedDayIntervals.length <= 1}
                                  onClose={() => setStaffMenuId(null)}
                                  onEditDay={() => onOpenDesktopEditor(row.staff, selectedDate)}
                                  onOpenOnlineSlots={() => onOpenOnlineSlots(row.staff, selectedDate)}
                                  onEditTemplate={() => onEditStaff(row.staff)}
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>,
                        ...(showEmployeeTotals
                          ? [
                              <div
                                key={`${row.staff.id}-total`}
                                className="sticky z-10 border-r border-b border-[#e7edf4] bg-white px-4 py-3 text-[#87919e] shadow-[8px_0_18px_rgba(31,39,50,0.04)]"
                                style={{ left: STAFF_COLUMN_WIDTH }}
                              >
                                <div className="flex items-center gap-2 text-[13px] font-semibold">
                                  <CalendarDays className="h-4 w-4" />
                                  <span>{row.monthDays}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-[13px] font-semibold">
                                  <Clock3 className="h-4 w-4" />
                                  <span>{formatHours(row.monthHours)}</span>
                                </div>
                              </div>,
                            ]
                          : []),
                        ...visibleDates.map((date) => {
                          const iso = toISODate(date);
                          const intervals = getIntervalsForDate(hoursByStaff, row.staff.id, date);
                          return (
                            <ScheduleCell
                              key={`${row.staff.id}-${iso}`}
                              intervals={intervals}
                              isSelected={iso === selectedIso}
                              onClick={() => {
                                setCellContextMenu(null);
                                onOpenDesktopEditor(row.staff, date);
                              }}
                              onContextMenu={(event) => {
                                event.preventDefault();
                                setFiltersOpen(false);
                                setSettingsOpen(false);
                                setStaffMenuId(null);
                                setCellContextMenu({
                                  x: Math.min(event.clientX, window.innerWidth - 260),
                                  y: Math.min(event.clientY, window.innerHeight - 190),
                                  staff: row.staff,
                                  date,
                                  intervals,
                                });
                              }}
                            />
                          );
                        }),
                      ];
                    })}
                  </div>
                </div>
              </div>
            </div>

            {filteredRows.length === 0 ? (
              <div className="border-t border-[#e7edf4] px-4 py-10 text-center md:px-6">
                <p className="text-[20px] font-extrabold tracking-[-0.04em] text-[#232c36]">Ничего не найдено</p>
                <p className="mt-2 text-sm font-semibold text-[#7c8795]">
                  Сбросьте фильтры или измените параметры поиска.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {staffMenuId && openMenuRow ? (
        <div className="fixed inset-x-4 bottom-4 z-[70] xl:hidden">
          <StaffMenu
            staff={openMenuRow.staff}
            selectedDate={selectedDate}
            hasOnlineSlotEditor={openMenuRow.selectedDayIntervals.length <= 1}
            onClose={() => setStaffMenuId(null)}
            onEditDay={() => onOpenDesktopEditor(openMenuRow.staff, selectedDate)}
            onOpenOnlineSlots={() => onOpenOnlineSlots(openMenuRow.staff, selectedDate)}
            onEditTemplate={() => onEditStaff(openMenuRow.staff)}
          />
        </div>
      ) : null}

      {editorStaff ? (
        <DayEditorModal
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
          onCopy={() => {
            copyScheduleDay({
              staff: editorStaff,
              date: selectedDate,
              intervals: editorDayIntervals,
              fallbackIntervals: [editorDraftInterval],
            });
          }}
          onPaste={() => pasteScheduleDay(editorStaff, selectedDate)}
          canPaste={Boolean(dayClipboard)}
          hasDaySchedule={hasEditorDaySchedule}
        />
      ) : null}

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
          onShiftStartChange={onOnlineSlotsShiftStartChange}
          onShiftEndChange={onOnlineSlotsShiftEndChange}
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
