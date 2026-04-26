import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import clsx from 'clsx';
import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Minus,
  MonitorSmartphone,
  Plus,
  RefreshCw,
  UserRound,
  X,
} from 'lucide-react';
import { MONTHS_RU_GENITIVE } from '../constants';
import { formatTime, toISODate } from '../helpers';
import { buildUnavailableBookingRanges, isStaffAcceptingAt } from '../scheduleAvailability';
import type { AppointmentItem, ScheduleInterval, StaffItem, WorkingHoursMap } from '../types';

type TimetableScreenProps = {
  selectedDate: Date;
  staff: StaffItem[];
  visibleStaff: StaffItem[];
  appointments: AppointmentItem[];
  hoursByStaff: WorkingHoursMap;
  loading: boolean;
  backLabel: string;
  onSelectDate: (value: Date) => void;
  onReload: () => void;
  onBack: () => void;
  onOpenAppointment: (item: AppointmentItem) => void;
  canCreate: boolean;
  onCreateAt: (staffId: string, startTime: string) => void;
  onOpenDayEditor: (item: StaffItem) => void;
  onOpenTemplateEditor: (item: StaffItem) => void;
  onRemoveDay: (item: StaffItem) => void;
  onOpenOnlineSlots: (item: StaffItem) => void;
};

type PositionedAppointment = AppointmentItem & {
  top: number;
  height: number;
  lane: number;
  laneCount: number;
};

const DEFAULT_START_HOUR = 10;
const DEFAULT_END_HOUR = 20;
const HALF_HOUR_HEIGHT = 34;
const DESKTOP_AXIS_WIDTH = 86;
const DESKTOP_COLUMN_WIDTH = 286;

function addDays(date: Date, amount: number) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + amount);
  return next;
}

function formatTimetableDate(date: Date) {
  return `${date.getDate()} ${MONTHS_RU_GENITIVE[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDayTitle(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function getIntervalsForDate(hoursByStaff: WorkingHoursMap, staffId: string, date: Date) {
  return hoursByStaff[staffId]?.[toISODate(date)] ?? [];
}

function getIntervalRangeLabel(intervals: ScheduleInterval[]) {
  const first = intervals[0];
  if (!first) {
    return 'Не в смене';
  }
  if (intervals.length === 1) {
    return `${first.start} - ${first.end}`;
  }
  return `${first.start} - ${first.end} +${intervals.length - 1}`;
}

function getBookingRangeLabel(intervals: ScheduleInterval[]) {
  const first = intervals[0];
  if (!first) {
    return 'Онлайн закрыт';
  }
  if (first.start === first.bookingStart && first.end === first.bookingEnd) {
    return 'Онлайн во всю смену';
  }
  return `Онлайн ${first.bookingStart} - ${first.bookingEnd}`;
}

function getMinutesFromDate(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function getAppointmentTone(status: string) {
  if (status === 'ARRIVED') {
    return 'border-[#27965a] bg-[#ddf5e7] text-[#1f6c42]';
  }
  if (status === 'CONFIRMED') {
    return 'border-[#355fca] bg-[#e5edff] text-[#274aa5]';
  }
  if (status === 'NO_SHOW' || status === 'CANCELLED') {
    return 'border-[#cf6d6d] bg-[#fbe5e5] text-[#9f3f3f]';
  }
  return 'border-[#d2a316] bg-[#fff3cb] text-[#8a6400]';
}

function resolveTimeBounds(
  appointments: AppointmentItem[],
  staff: StaffItem[],
  hoursByStaff: WorkingHoursMap,
  date: Date,
) {
  let minMinutes = DEFAULT_START_HOUR * 60;
  let maxMinutes = DEFAULT_END_HOUR * 60;

  appointments.forEach((item) => {
    minMinutes = Math.min(minMinutes, getMinutesFromDate(item.startAt));
    maxMinutes = Math.max(maxMinutes, getMinutesFromDate(item.endAt));
  });

  staff.forEach((item) => {
    getIntervalsForDate(hoursByStaff, item.id, date).forEach((interval) => {
      const [startHour, startMinute] = interval.start.split(':').map(Number);
      const [endHour, endMinute] = interval.end.split(':').map(Number);
      if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) {
        return;
      }
      minMinutes = Math.min(minMinutes, startHour * 60 + startMinute);
      maxMinutes = Math.max(maxMinutes, endHour * 60 + endMinute);
    });
  });

  const normalizedStart = Math.max(6 * 60, Math.floor(minMinutes / 60) * 60);
  const normalizedEnd = Math.min(23 * 60 + 30, Math.ceil(maxMinutes / 60) * 60);

  return {
    startMinutes: normalizedStart,
    endMinutes: Math.max(normalizedEnd, normalizedStart + 60),
  };
}

function buildAxisLabels(startMinutes: number, endMinutes: number) {
  const labels: Array<{ key: string; hours: string; minutes: string; half: boolean }> = [];
  for (let cursor = startMinutes; cursor <= endMinutes; cursor += 30) {
    const hours = String(Math.floor(cursor / 60)).padStart(2, '0');
    const minutes = String(cursor % 60).padStart(2, '0');
    labels.push({
      key: `${hours}:${minutes}`,
      hours,
      minutes,
      half: minutes !== '00',
    });
  }
  return labels;
}

function formatShiftBadge(intervals: ScheduleInterval[]) {
  const first = intervals[0];
  if (!first) {
    return '';
  }
  return `${first.start} - ${first.end}`;
}

function AxisColumn({
  labels,
  gridHeight,
  align = 'left',
}: {
  labels: Array<{ key: string; hours: string; minutes: string; half: boolean }>;
  gridHeight: number;
  align?: 'left' | 'right';
}) {
  return (
    <div className={clsx('sticky z-10 bg-white', align === 'left' ? 'left-0 border-r' : 'right-0 border-l', 'border-[#e9edf2]')}>
      <div className="relative" style={{ height: gridHeight }}>
        {labels.slice(0, -1).map((label, index) => (
          <div
            key={`${align}-${label.key}`}
            className={clsx(
              'absolute inset-x-0 flex items-start pt-1',
              align === 'left' ? 'justify-start pl-5' : 'justify-end pr-5',
            )}
            style={{ top: index * HALF_HOUR_HEIGHT }}
          >
            {label.half ? (
              <span className="text-[14px] font-semibold text-[#8c96a4]">{label.minutes}</span>
            ) : (
              <span className="text-[22px] font-extrabold tracking-[-0.04em] text-[#2c3440]">
                {label.hours}
                <span className="align-top text-[12px] font-bold text-[#768090]">{label.minutes}</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimetableAppointmentCard({
  item,
  onOpenAppointment,
  style,
}: {
  item: PositionedAppointment;
  onOpenAppointment: (item: AppointmentItem) => void;
  style: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenAppointment(item)}
      className="absolute overflow-hidden rounded-[10px] border border-[#8fd2c3] bg-[#bfe8dd] text-left shadow-[0_8px_18px_rgba(66,122,110,0.14)] transition hover:translate-y-[-1px]"
      style={style}
    >
      <div className="flex items-center justify-between gap-2 bg-[#4db69f] px-2.5 py-1.5 text-white">
        <span className="text-[11px] font-extrabold tracking-[-0.02em]">
          {formatTime(item.startAt)} - {formatTime(item.endAt)}
        </span>
        <Clock3 className="h-3.5 w-3.5 opacity-90" />
      </div>
      <div className="px-2.5 py-2 text-[#2d3a43]">
        <p className="line-clamp-2 text-[11px] font-extrabold leading-[1.25]">{item.serviceName}</p>
        <p className="mt-1 line-clamp-1 text-[11px] font-semibold opacity-80">{item.clientName}</p>
        <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold opacity-75">{item.clientPhone}</p>
      </div>
    </button>
  );
}

function StaffHeaderMenu({
  staff,
  onOpenDayEditor,
  onRemoveDay,
  onOpenTemplateEditor,
  onClose,
}: {
  staff: StaffItem;
  onOpenDayEditor: (item: StaffItem) => void;
  onRemoveDay: (item: StaffItem) => void;
  onOpenTemplateEditor: (item: StaffItem) => void;
  onClose: () => void;
}) {
  const items = [
    {
      key: 'edit-time',
      label: 'Изменить рабочее время',
      icon: Clock3,
      action: () => onOpenDayEditor(staff),
    },
    {
      key: 'cancel-day',
      label: 'Отменить рабочий день',
      icon: X,
      action: () => onRemoveDay(staff),
    },
    {
      key: 'add-days',
      label: 'Добавить рабочие дни',
      icon: Plus,
      action: () => onOpenTemplateEditor(staff),
    },
    {
      key: 'remove-days',
      label: 'Убрать рабочие дни',
      icon: Minus,
      action: () => onOpenTemplateEditor(staff),
    },
    {
      key: 'config',
      label: 'Настроить график работы',
      icon: CalendarRange,
      action: () => onOpenTemplateEditor(staff),
    },
  ] as const;

  return (
    <div className="absolute left-1/2 top-[calc(100%+16px)] z-30 w-[344px] -translate-x-1/2 rounded-[24px] border border-[#dfe5ec] bg-white p-4 shadow-[0_18px_40px_rgba(34,43,51,0.18)]">
      <div className="absolute left-1/2 top-[-8px] h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-[#dfe5ec] bg-white" />
      <div className="space-y-1">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.key}>
              {index === 2 ? <div className="my-2 h-px bg-[#edf1f5]" /> : null}
              <button
                type="button"
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[15px] font-semibold text-[#6f7885] transition hover:bg-[#f5f7fa] hover:text-[#2c3440]"
              >
                <Icon className="h-4 w-4 text-[#798392]" />
                <span>{item.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function layoutAppointments(
  appointments: AppointmentItem[],
  startMinutes: number,
) {
  if (appointments.length === 0) {
    return [] as PositionedAppointment[];
  }

  const sorted = [...appointments].sort((left, right) => {
    const startDiff = left.startAt.getTime() - right.startAt.getTime();
    if (startDiff !== 0) {
      return startDiff;
    }
    return left.endAt.getTime() - right.endAt.getTime();
  });

  const positioned: PositionedAppointment[] = [];
  let cluster: PositionedAppointment[] = [];
  let active: PositionedAppointment[] = [];
  let clusterLaneCount = 1;

  const finalizeCluster = () => {
    cluster.forEach((item) => {
      item.laneCount = Math.max(item.laneCount, clusterLaneCount);
    });
    cluster = [];
    active = [];
    clusterLaneCount = 1;
  };

  sorted.forEach((item) => {
    const itemStart = getMinutesFromDate(item.startAt);
    active = active.filter((current) => getMinutesFromDate(current.endAt) > itemStart);

    if (active.length === 0 && cluster.length > 0) {
      finalizeCluster();
    }

    const usedLanes = new Set(active.map((current) => current.lane));
    let lane = 0;
    while (usedLanes.has(lane)) {
      lane += 1;
    }

    const top = ((itemStart - startMinutes) / 30) * HALF_HOUR_HEIGHT + 4;
    const durationMinutes = Math.max(30, getMinutesFromDate(item.endAt) - itemStart);
    const height = Math.max((durationMinutes / 30) * HALF_HOUR_HEIGHT - 8, 58);
    const nextItem: PositionedAppointment = {
      ...item,
      top,
      height,
      lane,
      laneCount: 1,
    };

    cluster.push(nextItem);
    active.push(nextItem);
    clusterLaneCount = Math.max(clusterLaneCount, active.length);
    positioned.push(nextItem);
  });

  if (cluster.length > 0) {
    finalizeCluster();
  }

  return positioned;
}

export function TimetableScreen({
  selectedDate,
  staff,
  visibleStaff,
  appointments,
  hoursByStaff,
  loading,
  backLabel,
  onSelectDate,
  onReload,
  onBack,
  onOpenAppointment,
  canCreate,
  onCreateAt,
  onOpenDayEditor,
  onOpenTemplateEditor,
  onRemoveDay,
  onOpenOnlineSlots,
}: TimetableScreenProps) {
  const [menuStaffId, setMenuStaffId] = useState<string | null>(null);
  const menuRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuStaffId) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && menuRootRef.current?.contains(target)) {
        return;
      }
      setMenuStaffId(null);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [menuStaffId]);

  const editableStaffIds = useMemo(() => new Set(visibleStaff.map((item) => item.id)), [visibleStaff]);
  const mergedStaff = useMemo(() => {
    const merged = [...visibleStaff];
    const seenIds = new Set(visibleStaff.map((item) => item.id));
    const seenNames = new Set(
      visibleStaff.map((item) => item.name.trim().toLowerCase()).filter(Boolean),
    );

    staff.forEach((item) => {
      const normalizedName = item.name.trim().toLowerCase();
      if (seenIds.has(item.id) || seenNames.has(normalizedName)) {
        return;
      }
      merged.push(item);
      seenIds.add(item.id);
      seenNames.add(normalizedName);
    });

    return merged.sort((left, right) => {
      const leftIntervals = getIntervalsForDate(hoursByStaff, left.id, selectedDate).length;
      const rightIntervals = getIntervalsForDate(hoursByStaff, right.id, selectedDate).length;
      if (leftIntervals !== rightIntervals) {
        return rightIntervals - leftIntervals;
      }
      return left.name.localeCompare(right.name, 'ru');
    });
  }, [hoursByStaff, selectedDate, staff, visibleStaff]);

  const appointmentGroups = useMemo(() => {
    const byId = new Map<string, AppointmentItem[]>();
    const byName = new Map<string, AppointmentItem[]>();

    appointments.forEach((item) => {
      const normalizedName = item.staffName.trim().toLowerCase();
      if (item.staffId) {
        const current = byId.get(item.staffId) ?? [];
        current.push(item);
        byId.set(item.staffId, current);
      }
      if (normalizedName) {
        const current = byName.get(normalizedName) ?? [];
        current.push(item);
        byName.set(normalizedName, current);
      }
    });

    return { byId, byName };
  }, [appointments]);

  const timeBounds = useMemo(
    () => resolveTimeBounds(appointments, mergedStaff, hoursByStaff, selectedDate),
    [appointments, hoursByStaff, mergedStaff, selectedDate],
  );
  const axisLabels = useMemo(
    () => buildAxisLabels(timeBounds.startMinutes, timeBounds.endMinutes),
    [timeBounds.endMinutes, timeBounds.startMinutes],
  );
  const gridHeight = (axisLabels.length - 1) * HALF_HOUR_HEIGHT;

  const dayData = useMemo(
    () =>
      mergedStaff.map((item) => {
        const normalizedName = item.name.trim().toLowerCase();
        const appointmentsForStaff =
          appointmentGroups.byId.get(item.id) ??
          appointmentGroups.byName.get(normalizedName) ??
          [];
        const intervals = getIntervalsForDate(hoursByStaff, item.id, selectedDate);
        const unavailableBookingRanges = buildUnavailableBookingRanges(
          intervals,
          timeBounds.startMinutes,
          timeBounds.endMinutes,
        );
        return {
          staff: item,
          intervals,
          unavailableBookingRanges,
          appointments: appointmentsForStaff.sort(
            (left, right) => left.startAt.getTime() - right.startAt.getTime(),
          ),
          positionedAppointments: layoutAppointments(appointmentsForStaff, timeBounds.startMinutes),
          editable: editableStaffIds.has(item.id),
        };
      }),
    [appointmentGroups.byId, appointmentGroups.byName, editableStaffIds, hoursByStaff, mergedStaff, selectedDate, timeBounds.endMinutes, timeBounds.startMinutes],
  );

  const staffInShiftCount = dayData.filter((item) => item.intervals.length > 0).length;
  const hasVisibleStaff = dayData.length > 0;

  return (
    <div className="pb-6 pt-4 md:pt-6">
      <section className="overflow-hidden rounded-[34px] border border-[#dfe6ee] bg-[#f9fbfd] shadow-[0_24px_60px_rgba(31,39,50,0.08)]">
        <div className="border-b border-[#e5ebf2] px-5 py-5 md:px-7 md:py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-[720px]">
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#8f98a6]">
                Таймлайн дня
              </p>
              <h1 className="mt-3 text-[34px] font-extrabold tracking-[-0.05em] text-[#232c36] md:text-[52px]">
                {formatDayTitle(selectedDate)}
              </h1>
              <p className="mt-3 text-[15px] leading-6 text-[#66707d] md:text-base">
                Здесь видно, кто реально работает в этот день, какие интервалы доступны для записи и
                как записи легли поверх смены. Если нужно поменять день, редактирование открывается
                прямо из колонки сотрудника.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#d8e0ea] bg-white px-4 text-sm font-semibold text-[#2f3843]"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </button>
              <button
                type="button"
                onClick={() => onSelectDate(addDays(selectedDate, -1))}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d8e0ea] bg-white text-[#2f3843]"
                aria-label="Предыдущий день"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onSelectDate(new Date())}
                className="inline-flex h-12 items-center rounded-2xl bg-[#f4c900] px-4 text-sm font-extrabold text-[#2f3843] shadow-[0_14px_30px_rgba(244,201,0,0.24)]"
              >
                Сегодня
              </button>
              <button
                type="button"
                onClick={() => onSelectDate(addDays(selectedDate, 1))}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d8e0ea] bg-white text-[#2f3843]"
                aria-label="Следующий день"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onReload}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#d8e0ea] bg-white px-4 text-sm font-semibold text-[#2f3843]"
              >
                <RefreshCw className={clsx('h-4 w-4', loading ? 'animate-spin' : undefined)} />
                Обновить
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8f98a6]">
                Дата
              </p>
              <p className="mt-1 text-lg font-extrabold text-[#232c36]">{formatTimetableDate(selectedDate)}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8f98a6]">
                В смене
              </p>
              <p className="mt-1 text-lg font-extrabold text-[#232c36]">{staffInShiftCount}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8f98a6]">
                Записи
              </p>
              <p className="mt-1 text-lg font-extrabold text-[#232c36]">{appointments.length}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8f98a6]">
                Окно дня
              </p>
              <p className="mt-1 text-lg font-extrabold text-[#232c36]">
                {axisLabels[0] ? `${axisLabels[0].hours}:${axisLabels[0].minutes}` : ''} -{' '}
                {axisLabels[axisLabels.length - 1]
                  ? `${axisLabels[axisLabels.length - 1].hours}:${axisLabels[axisLabels.length - 1].minutes}`
                  : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="md:hidden">
          <div className="space-y-4 px-4 py-4">
            {hasVisibleStaff ? (
              dayData.map((column) => (
                <section
                  key={column.staff.id}
                  className="rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_12px_32px_rgba(31,39,50,0.06)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[20px] bg-[#eef2f6] text-[#65707d]">
                      {column.staff.avatarUrl ? (
                        <img src={column.staff.avatarUrl} alt={column.staff.name} className="h-full w-full object-cover" />
                      ) : (
                        <UserRound className="h-6 w-6" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[22px] font-extrabold tracking-[-0.04em] text-[#232c36]">
                        {column.staff.name}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#728090]">
                        {column.staff.positionName || 'Сотрудник'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[#f5f8fb] px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8f98a6]">
                        Смена
                      </p>
                      <p className="mt-2 text-base font-extrabold text-[#232c36]">
                        {getIntervalRangeLabel(column.intervals)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#f5f8fb] px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8f98a6]">
                        Онлайн
                      </p>
                      <p className="mt-2 text-base font-extrabold text-[#232c36]">
                        {getBookingRangeLabel(column.intervals)}
                      </p>
                    </div>
                  </div>

                  {column.editable ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenDayEditor(column.staff)}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d8e0ea] bg-white px-4 text-sm font-semibold text-[#2f3843]"
                      >
                        <CalendarDays className="h-4 w-4" />
                        Изменить день
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenOnlineSlots(column.staff)}
                        disabled={column.intervals.length !== 1}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d8e0ea] bg-white px-4 text-sm font-semibold text-[#2f3843] disabled:opacity-45"
                      >
                        <MonitorSmartphone className="h-4 w-4" />
                        Онлайн-время
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenTemplateEditor(column.staff)}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d8e0ea] bg-white px-4 text-sm font-semibold text-[#2f3843]"
                      >
                        <CalendarRange className="h-4 w-4" />
                        График
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    {column.appointments.length > 0 ? (
                      column.appointments.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onOpenAppointment(item)}
                          className={clsx(
                            'block w-full rounded-[22px] border px-4 py-4 text-left shadow-[0_10px_24px_rgba(31,39,50,0.06)]',
                            getAppointmentTone(item.status),
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-extrabold">
                              {formatTime(item.startAt)} - {formatTime(item.endAt)}
                            </span>
                            <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em]">
                              {item.status}
                            </span>
                          </div>
                          <p className="mt-3 text-base font-extrabold leading-tight">{item.clientName}</p>
                          <p className="mt-1 text-sm font-semibold opacity-80">{item.serviceName}</p>
                          <p className="mt-1 text-sm opacity-80">{item.clientPhone}</p>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-[#d8e0ea] bg-[#fbfcfe] px-4 py-5 text-sm font-semibold text-[#7b8694]">
                        {column.intervals.length > 0
                          ? 'Записей на этого сотрудника в выбранный день нет.'
                          : 'Сотрудник не выведен в смену на выбранный день.'}
                      </div>
                    )}
                  </div>
                </section>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-[#d8e0ea] bg-white px-5 py-8 text-center shadow-[0_12px_32px_rgba(31,39,50,0.04)]">
                <p className="text-[24px] font-extrabold tracking-[-0.04em] text-[#232c36]">
                  На этот день нет смен
                </p>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#728090]">
                  Выберите другую дату или добавьте сотрудников в график на выбранный день.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="hidden px-4 py-4 md:block">
          {hasVisibleStaff ? (
            <div ref={menuRootRef} className="overflow-x-auto overflow-y-visible">
              <div
                className="grid min-w-full"
                style={{
                  gridTemplateColumns: `${DESKTOP_AXIS_WIDTH}px repeat(${Math.max(dayData.length, 1)}, ${DESKTOP_COLUMN_WIDTH}px) ${DESKTOP_AXIS_WIDTH}px`,
                  minWidth:
                    DESKTOP_AXIS_WIDTH * 2 + Math.max(dayData.length, 1) * DESKTOP_COLUMN_WIDTH,
                }}
              >
              <div className="sticky left-0 top-0 z-20 rounded-tl-[24px] border-b border-r border-[#e5ebf2] bg-white" />
              {dayData.map((column) => {
                const menuOpen = menuStaffId === column.staff.id;
                return (
                  <div
                    key={column.staff.id}
                    className={clsx(
                      'relative border-b border-r border-[#e5ebf2] bg-white px-4 py-5',
                      menuOpen ? 'bg-[#eef2f8]' : undefined,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!column.editable) {
                          return;
                        }
                        setMenuStaffId((prev) => (prev === column.staff.id ? null : column.staff.id));
                      }}
                      className={clsx(
                        'block w-full text-left',
                        column.editable ? 'cursor-pointer' : 'cursor-default',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[12px] bg-[#f2f4f7] text-[#65707d] text-[10px] font-bold uppercase">
                          {column.staff.avatarUrl ? (
                            <img src={column.staff.avatarUrl} alt={column.staff.name} className="h-full w-full object-cover" />
                          ) : (
                            <UserRound className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[19px] font-extrabold tracking-[-0.04em] text-[#2c3440]">
                            {column.staff.name}
                          </p>
                          <p className="mt-1 truncate text-[12px] font-semibold text-[#727b88]">
                            {column.staff.positionName || 'Сотрудник'}
                          </p>
                        </div>
                      </div>
                    </button>
                    {menuOpen && column.editable ? (
                      <StaffHeaderMenu
                        staff={column.staff}
                        onOpenDayEditor={onOpenDayEditor}
                        onRemoveDay={onRemoveDay}
                        onOpenTemplateEditor={onOpenTemplateEditor}
                        onClose={() => setMenuStaffId(null)}
                      />
                    ) : null}
                  </div>
                );
              })}
              <div className="sticky right-0 top-0 z-20 rounded-tr-[24px] border-b border-l border-[#e5ebf2] bg-white" />

              <AxisColumn labels={axisLabels} gridHeight={gridHeight} align="left" />

              {dayData.map((column) => (
                <div key={column.staff.id} className="relative border-r border-[#eef2f6] bg-white">
                  <div className="relative" style={{ height: gridHeight }}>
                    {axisLabels.slice(0, -1).map((label, index) => {
                      const isAccepting = isStaffAcceptingAt(column.intervals, label.key);
                      return (
                        <button
                          key={`${column.staff.id}-${label.key}`}
                          type="button"
                          onClick={() => {
                            if (canCreate) {
                              onCreateAt(column.staff.id, label.key);
                            }
                          }}
                          disabled={!canCreate || !isAccepting}
                          className={clsx(
                            'absolute inset-x-0 block border-t border-[#dce1e8] bg-[#eef8f2] text-left transition disabled:cursor-default',
                            isAccepting ? 'hover:bg-[#e0f3e8]' : undefined,
                          )}
                          style={{ top: index * HALF_HOUR_HEIGHT, height: HALF_HOUR_HEIGHT }}
                          aria-label={`${column.staff.name}, ${label.key}`}
                        />
                      );
                    })}

                    {column.unavailableBookingRanges.map((range) => (
                      <div
                        key={`${column.staff.id}-unavailable-${range.startMinutes}-${range.endMinutes}`}
                        className="pointer-events-none absolute inset-x-0 bg-[repeating-linear-gradient(135deg,rgba(244,246,249,0.92)_0px,rgba(244,246,249,0.92)_7px,rgba(223,230,240,0.92)_7px,rgba(223,230,240,0.92)_14px)]"
                        style={{
                          top:
                            ((range.startMinutes - timeBounds.startMinutes) / 30) *
                            HALF_HOUR_HEIGHT,
                          height:
                            ((range.endMinutes - range.startMinutes) / 30) *
                            HALF_HOUR_HEIGHT,
                        }}
                      />
                    ))}

                    {column.intervals.map((interval, index) => {
                      const [startHour, startMinute] = interval.start.split(':').map(Number);
                      const [endHour, endMinute] = interval.end.split(':').map(Number);
                      const shiftStart = startHour * 60 + startMinute;
                      const shiftEnd = endHour * 60 + endMinute;
                      const top = ((shiftStart - timeBounds.startMinutes) / 30) * HALF_HOUR_HEIGHT;
                      const height =
                        ((shiftEnd - shiftStart) / 30) * HALF_HOUR_HEIGHT;
                      const [bookingStartHour, bookingStartMinute] = interval.bookingStart.split(':').map(Number);
                      const [bookingEndHour, bookingEndMinute] = interval.bookingEnd.split(':').map(Number);
                      const bookingTop =
                        (((bookingStartHour * 60 + bookingStartMinute) - timeBounds.startMinutes) / 30) *
                        HALF_HOUR_HEIGHT;
                      const bookingHeight =
                        (((bookingEndHour * 60 + bookingEndMinute) - (bookingStartHour * 60 + bookingStartMinute)) /
                          30) *
                        HALF_HOUR_HEIGHT;

                      return (
                        <div key={`${column.staff.id}-${index}`}>
                          <div
                            className="pointer-events-none absolute left-0 right-0 rounded-none border-y border-[#c9ead3]"
                            style={{ top, height: Math.max(height, 28) }}
                          />
                          {index === 0 ? (
                            <div className="pointer-events-none absolute left-2 top-[6px] rounded-md bg-white/85 px-2 py-1 text-[11px] font-semibold text-[#354252] shadow-[0_4px_12px_rgba(31,39,50,0.08)]">
                              {formatShiftBadge(column.intervals)}
                            </div>
                          ) : null}
                          <div
                            className="pointer-events-none absolute left-0 right-0 border-y border-[#c9ead3] bg-white/20"
                            style={{ top: bookingTop, height: Math.max(bookingHeight, 18) }}
                          />
                        </div>
                      );
                    })}

                    {column.positionedAppointments.map((item) => {
                      const width = `calc(${100 / item.laneCount}% - 10px)`;
                      const left = `calc(${(100 / item.laneCount) * item.lane}% + 5px)`;
                      return (
                        <TimetableAppointmentCard
                          key={item.id}
                          item={item}
                          onOpenAppointment={onOpenAppointment}
                          style={{
                            top: item.top,
                            left,
                            width,
                            height: item.height,
                          }}
                        />
                      );
                    })}

                    {column.intervals.length === 0 && column.appointments.length === 0 ? (
                      <div className="absolute inset-x-3 top-4 rounded-[22px] border border-dashed border-[#d8e0ea] bg-[#fbfcfe] px-4 py-5 text-sm font-semibold text-[#7b8694]">
                        День не назначен
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              <AxisColumn labels={axisLabels} gridHeight={gridHeight} align="right" />
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-[#d8e0ea] bg-white px-8 py-14 text-center shadow-[0_12px_32px_rgba(31,39,50,0.04)]">
              <p className="text-[32px] font-extrabold tracking-[-0.05em] text-[#232c36]">
                На этот день никто не в смене
              </p>
              <p className="mx-auto mt-4 max-w-[560px] text-base font-semibold leading-7 text-[#728090]">
                Таймлайн появится автоматически, когда в графике будут назначены сотрудники на выбранную дату.
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center gap-5 px-2 text-xs font-semibold text-[#7b8694]">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#eef8f2]" />
              Прием открыт
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[repeating-linear-gradient(135deg,#f4f6f9_0px,#f4f6f9_4px,#e8edf4_4px,#e8edf4_8px)]" />
              Прием закрыт
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#bfe8dd]" />
              Запись клиента
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
