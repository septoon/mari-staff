import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileDown,
  Filter,
  Info,
  Loader2,
  MoreHorizontal,
  Settings2,
  SlidersHorizontal,
  SquarePen,
  Star,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { ISO_DAY_LABELS, MONTHS_RU, MONTHS_RU_GENITIVE, ROLE_LABELS } from '../constants';
import { parseSlot } from '../controller/schedule';
import { toISODate, toISODay } from '../helpers';
import { JournalDatePickerSheet } from '../components/shared/JournalDatePickerSheet';
import type { StaffItem, WorkingHoursMap } from '../types';

type ScheduleScreenProps = {
  selectedDate: Date;
  staff: StaffItem[];
  hoursByStaff: WorkingHoursMap;
  loading: boolean;
  onReload: () => void;
  onEdit: () => void;
  onEditStaff: (item: StaffItem) => void;
  onSelectDate: (value: Date) => void;
};

function addDays(date: Date, amount: number) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonthsKeepingDay(date: Date, amount: number) {
  const baseDay = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(baseDay, daysInMonth));
  return next;
}

function formatMonthLabel(date: Date) {
  const month = MONTHS_RU[date.getMonth()];
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
}

function formatWeekRangeLabel(start: Date, end: Date) {
  const startMonth = MONTHS_RU_GENITIVE[start.getMonth()];
  const endMonth = MONTHS_RU_GENITIVE[end.getMonth()];
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}-${end.getDate()} ${startMonth} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
}

function formatShortMonthLabel(date: Date) {
  const month = MONTHS_RU[date.getMonth()];
  return `${month.charAt(0).toUpperCase()}${month.slice(1)}`;
}

function formatShortTimeRange(slot: string) {
  const parsed = parseSlot(slot);
  if (!parsed) {
    return slot;
  }
  return `${parsed.start}\n${parsed.end}`;
}

function parseSlotDurationHours(slot: string) {
  const parsed = parseSlot(slot);
  if (!parsed) {
    return 0;
  }
  const [startHour, startMinute] = parsed.start.split(':').map(Number);
  const [endHour, endMinute] = parsed.end.split(':').map(Number);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) {
    return 0;
  }
  let durationMin = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (durationMin < 0) {
    durationMin += 24 * 60;
  }
  return durationMin / 60;
}

function formatHoursLabel(hours: number) {
  const rounded = Math.round(hours * 10) / 10;
  if (Number.isInteger(rounded)) {
    return `${rounded} ч.`;
  }
  return `${rounded.toFixed(1).replace('.', ',')} ч.`;
}

function isWeekend(date: Date) {
  const isoDay = toISODay(date);
  return isoDay === 6 || isoDay === 7;
}

export function ScheduleScreen({
  selectedDate,
  staff,
  hoursByStaff,
  loading,
  onReload,
  onEdit,
  onEditStaff,
  onSelectDate,
}: ScheduleScreenProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true);
  const [desktopViewMode, setDesktopViewMode] = useState<'week' | 'month'>('month');
  const [desktopStaffFilter, setDesktopStaffFilter] = useState('all');
  const [desktopPositionFilter, setDesktopPositionFilter] = useState('all');
  const [desktopRemovedFilter, setDesktopRemovedFilter] = useState<'all' | 'not_removed' | 'removed'>('not_removed');
  const [desktopEmploymentFilter, setDesktopEmploymentFilter] = useState<'all' | 'employed' | 'dismissed'>('employed');
  const [desktopScheduleFilter, setDesktopScheduleFilter] = useState<'all' | 'with' | 'without'>('all');
  const [desktopInfoOpen, setDesktopInfoOpen] = useState(false);
  const [desktopFavorite, setDesktopFavorite] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const desktopScrollRef = useRef<HTMLDivElement | null>(null);
  const monthStripRef = useRef<HTMLDivElement | null>(null);
  const monthScrollSyncRef = useRef(false);
  const monthScrollTimerRef = useRef<number | null>(null);
  const STAFF_COLUMN_WIDTH = 90;
  const DAY_COLUMN_WIDTH = 68;
  const GRID_GAP = 4;
  const CURRENT_DAY_GUTTER_PX = 8;
  const MONTH_PAGE_SIZE = 5;
  const MONTH_CELL_WIDTH = 68;
  const MONTH_CELL_GAP = 6;
  const MONTH_LEFT_BUFFER = 5;
  const MONTH_RIGHT_BUFFER = 5;
  const MONTH_CELL_STEP_PX = MONTH_CELL_WIDTH + MONTH_CELL_GAP;
  const MONTH_PAGE_STEP_PX = MONTH_CELL_STEP_PX * MONTH_PAGE_SIZE;
  const MONTH_BASE_SCROLL_LEFT = MONTH_CELL_STEP_PX * MONTH_LEFT_BUFFER;
  const monthDates = useMemo(() => {
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const dates: Date[] = [];
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date));
    }
    return dates;
  }, [selectedDate]);
  const gridColumns = `${STAFF_COLUMN_WIDTH}px repeat(${monthDates.length}, ${DAY_COLUMN_WIDTH}px)`;
  const minWidth = STAFF_COLUMN_WIDTH + monthDates.length * (DAY_COLUMN_WIDTH + GRID_GAP) + GRID_GAP;
  const selectedDateIso = toISODate(selectedDate);
  const selectedTimestamp = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
  ).getTime();
  const dayTone = (date: Date) => {
    const iso = toISODate(date);
    if (iso === selectedDateIso) {
      return 'current' as const;
    }
    const ts = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    if (ts < selectedTimestamp) {
      return 'past' as const;
    }
    return 'future' as const;
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || monthDates.length === 0) {
      return;
    }
    const index = monthDates.findIndex((date) => toISODate(date) === selectedDateIso);
    if (index < 0) {
      return;
    }
    const currentDayOffset = STAFF_COLUMN_WIDTH + GRID_GAP + index * (DAY_COLUMN_WIDTH + GRID_GAP);
    const leftAnchor = STAFF_COLUMN_WIDTH + GRID_GAP;
    const targetLeft = Math.max(
      0,
      Math.round(currentDayOffset - leftAnchor - CURRENT_DAY_GUTTER_PX),
    );
    container.scrollTo({ left: targetLeft, behavior: 'auto' });
  }, [CURRENT_DAY_GUTTER_PX, DAY_COLUMN_WIDTH, GRID_GAP, STAFF_COLUMN_WIDTH, monthDates, selectedDateIso]);

  const markedDates = useMemo(() => {
    const daysWithHours = new Set<number>();
    Object.values(hoursByStaff).forEach((byDay) => {
      Object.entries(byDay).forEach(([day, slots]) => {
        const key = Number(day);
        if (Number.isFinite(key) && slots.length > 0) {
          daysWithHours.add(key);
        }
      });
    });
    if (daysWithHours.size === 0) {
      return [] as string[];
    }

    const from = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const to = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 4, 0);
    const items: string[] = [];
    for (let date = new Date(from); date <= to; date.setDate(date.getDate() + 1)) {
      const day = toISODay(date);
      if (daysWithHours.has(day)) {
        items.push(toISODate(date));
      }
    }
    return items;
  }, [hoursByStaff, selectedDate]);
  const monthTabs = useMemo(() => {
    const baseDay = selectedDate.getDate();
    return Array.from({ length: MONTH_LEFT_BUFFER + MONTH_RIGHT_BUFFER + 1 }).map((_, index) => {
      const offset = index - MONTH_LEFT_BUFFER;
      const tabDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + offset, 1);
      const endOfMonthDay = new Date(tabDate.getFullYear(), tabDate.getMonth() + 1, 0).getDate();
      tabDate.setDate(Math.min(baseDay, endOfMonthDay));
      const monthName = MONTHS_RU[tabDate.getMonth()];
      const monthLabel = monthName.length > 4 ? monthName.slice(0, 3) : monthName;
      return {
        label: monthLabel,
        year: tabDate.getFullYear(),
        key: `${tabDate.getFullYear()}-${tabDate.getMonth()}`,
        date: tabDate,
        active: offset === 0,
      };
    });
  }, [MONTH_LEFT_BUFFER, MONTH_RIGHT_BUFFER, selectedDate]);

  useEffect(() => {
    const container = monthStripRef.current;
    if (!container) {
      return;
    }
    monthScrollSyncRef.current = true;
    container.scrollTo({ left: MONTH_BASE_SCROLL_LEFT, behavior: 'auto' });
    const frame = window.requestAnimationFrame(() => {
      monthScrollSyncRef.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [MONTH_BASE_SCROLL_LEFT, selectedDate]);

  useEffect(() => {
    return () => {
      if (monthScrollTimerRef.current !== null) {
        window.clearTimeout(monthScrollTimerRef.current);
      }
    };
  }, []);

  const handleMonthStripScroll = () => {
    if (monthScrollSyncRef.current) {
      return;
    }
    if (monthScrollTimerRef.current !== null) {
      window.clearTimeout(monthScrollTimerRef.current);
    }
    monthScrollTimerRef.current = window.setTimeout(() => {
      const container = monthStripRef.current;
      if (!container) {
        return;
      }
      const pageOffset = Math.round(
        (container.scrollLeft - MONTH_BASE_SCROLL_LEFT) / MONTH_PAGE_STEP_PX,
      );
      if (pageOffset === 0) {
        monthScrollSyncRef.current = true;
        container.scrollTo({ left: MONTH_BASE_SCROLL_LEFT, behavior: 'smooth' });
        window.requestAnimationFrame(() => {
          monthScrollSyncRef.current = false;
        });
        return;
      }
      const baseDay = selectedDate.getDate();
      const nextDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + pageOffset * MONTH_PAGE_SIZE,
        1,
      );
      const monthDays = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(baseDay, monthDays));
      onSelectDate(nextDate);
    }, 120);
  };

  const desktopDates = useMemo(() => {
    if (desktopViewMode === 'week') {
      return Array.from({ length: 7 }, (_, index) => addDays(selectedDate, index));
    }

    const from = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 4, 1);
    const to = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 5, 0);
    const dates: Date[] = [];
    for (let date = new Date(from); date <= to; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date));
    }
    return dates;
  }, [desktopViewMode, selectedDate]);
  const desktopTitle = useMemo(() => {
    if (desktopDates.length === 0) {
      return formatMonthLabel(selectedDate);
    }
    if (desktopViewMode === 'week') {
      return formatWeekRangeLabel(desktopDates[0], desktopDates[desktopDates.length - 1]);
    }
    return formatMonthLabel(selectedDate);
  }, [desktopDates, desktopViewMode, selectedDate]);
  const staffSchedulePresence = useMemo(() => {
    const result = new Set<string>();
    staff.forEach((person) => {
      const hasSchedule = Object.values(hoursByStaff[person.id] ?? {}).some((slots) => slots.length > 0);
      if (hasSchedule) {
        result.add(person.id);
      }
    });
    return result;
  }, [hoursByStaff, staff]);
  const desktopPositionOptions = useMemo(() => {
    return Array.from(
      new Set(
        staff
          .map((person) => person.positionName?.trim() || ROLE_LABELS[person.role] || 'Без должности')
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right, 'ru'));
  }, [staff]);
  const desktopFilteredStaff = useMemo(() => {
    return staff.filter((person) => {
      const positionLabel = person.positionName?.trim() || ROLE_LABELS[person.role] || 'Без должности';
      const hasSchedule = staffSchedulePresence.has(person.id);
      if (desktopStaffFilter !== 'all' && desktopStaffFilter !== person.id) {
        return false;
      }
      if (desktopPositionFilter !== 'all' && desktopPositionFilter !== positionLabel) {
        return false;
      }
      if (desktopRemovedFilter === 'not_removed' && !person.isActive) {
        return false;
      }
      if (desktopRemovedFilter === 'removed' && person.isActive) {
        return false;
      }
      if (desktopEmploymentFilter === 'employed' && !person.isActive) {
        return false;
      }
      if (desktopEmploymentFilter === 'dismissed' && person.isActive) {
        return false;
      }
      if (desktopScheduleFilter === 'with' && !hasSchedule) {
        return false;
      }
      if (desktopScheduleFilter === 'without' && hasSchedule) {
        return false;
      }
      return true;
    });
  }, [
    desktopEmploymentFilter,
    desktopPositionFilter,
    desktopRemovedFilter,
    desktopScheduleFilter,
    desktopStaffFilter,
    staff,
    staffSchedulePresence,
  ]);
  const desktopSelectedIso = toISODate(selectedDate);
  const desktopCurrentMonthDates = useMemo(() => {
    return desktopDates.filter(
      (date) =>
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear(),
    );
  }, [desktopDates, selectedDate]);
  const desktopNextMonthAnchor = useMemo(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1),
    [selectedDate],
  );
  const desktopNextMonthDates = useMemo(() => {
    return desktopDates.filter(
      (date) =>
        date.getMonth() === desktopNextMonthAnchor.getMonth() &&
        date.getFullYear() === desktopNextMonthAnchor.getFullYear(),
    );
  }, [desktopDates, desktopNextMonthAnchor]);
  const desktopLeadingMonthLabel = formatShortMonthLabel(selectedDate);
  const desktopTrailingMonthLabel = formatShortMonthLabel(desktopNextMonthAnchor);
  const desktopShowTrailingSummary =
    desktopViewMode === 'month' && desktopNextMonthDates.length > 0;
  const desktopDayStaffCounts = useMemo(() => {
    return desktopDates.map((date) =>
      desktopFilteredStaff.reduce((count, person) => {
        const slots = hoursByStaff[person.id]?.[toISODay(date)] ?? [];
        return count + (slots.length > 0 ? 1 : 0);
      }, 0),
    );
  }, [desktopDates, desktopFilteredStaff, hoursByStaff]);
  const DESKTOP_STAFF_COLUMN_WIDTH = 276;
  const DESKTOP_TOTAL_COLUMN_WIDTH = 104;
  const DESKTOP_DAY_COLUMN_WIDTH = 46;
  const desktopGridColumns = `${DESKTOP_STAFF_COLUMN_WIDTH}px ${DESKTOP_TOTAL_COLUMN_WIDTH}px repeat(${desktopDates.length}, ${DESKTOP_DAY_COLUMN_WIDTH}px)${desktopShowTrailingSummary ? ` ${DESKTOP_TOTAL_COLUMN_WIDTH}px` : ''}`;
  const desktopGridMinWidth =
    DESKTOP_STAFF_COLUMN_WIDTH +
    DESKTOP_TOTAL_COLUMN_WIDTH +
    desktopDates.length * DESKTOP_DAY_COLUMN_WIDTH +
    (desktopShowTrailingSummary ? DESKTOP_TOTAL_COLUMN_WIDTH : 0);
  const desktopSelectedIndex = useMemo(
    () => desktopDates.findIndex((date) => toISODate(date) === desktopSelectedIso),
    [desktopDates, desktopSelectedIso],
  );

  const getSlotsForDate = (person: StaffItem, date: Date) =>
    hoursByStaff[person.id]?.[toISODay(date)] ?? [];

  const getSummaryForDates = (person: StaffItem, dates: Date[]) => {
    let shifts = 0;
    let totalHours = 0;
    dates.forEach((date) => {
      const slots = getSlotsForDate(person, date);
      shifts += slots.length;
      slots.forEach((slot) => {
        totalHours += parseSlotDurationHours(slot);
      });
    });
    return { shifts, totalHours };
  };

  const handleDesktopStep = (direction: -1 | 1) => {
    const nextDate =
      desktopViewMode === 'week'
        ? addDays(selectedDate, direction * 7)
        : addMonthsKeepingDay(selectedDate, direction);
    onSelectDate(nextDate);
  };

  const handleDesktopPrint = () => {
    window.print();
  };

  const resetDesktopFilters = () => {
    setDesktopStaffFilter('all');
    setDesktopPositionFilter('all');
    setDesktopRemovedFilter('not_removed');
    setDesktopEmploymentFilter('employed');
    setDesktopScheduleFilter('all');
  };

  useEffect(() => {
    const container = desktopScrollRef.current;
    if (!container || desktopViewMode !== 'month' || desktopSelectedIndex < 0) {
      return;
    }
    const leftOffset =
      DESKTOP_STAFF_COLUMN_WIDTH +
      DESKTOP_TOTAL_COLUMN_WIDTH +
      desktopSelectedIndex * DESKTOP_DAY_COLUMN_WIDTH;
    const anchor = DESKTOP_STAFF_COLUMN_WIDTH + DESKTOP_TOTAL_COLUMN_WIDTH + 24;
    const targetLeft = Math.max(0, Math.round(leftOffset - anchor));
    container.scrollTo({ left: targetLeft, behavior: 'auto' });
  }, [
    DESKTOP_DAY_COLUMN_WIDTH,
    DESKTOP_STAFF_COLUMN_WIDTH,
    DESKTOP_TOTAL_COLUMN_WIDTH,
    desktopSelectedIndex,
    desktopViewMode,
  ]);

  return (
    <>
      <div className="flex min-h-full flex-col pb-[190px] pt-5 md:hidden">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-[22px] font-extrabold leading-none text-ink">
            <span>График работы</span>
            <button
              type="button"
              onClick={() => setDatePickerOpen(true)}
              aria-label="Открыть календарь"
            >
              <CalendarDays className="h-5 w-5 text-accent" />
            </button>
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReload}
              className="flex items-center gap-2 rounded-2xl bg-[#e6e9ef] px-3 py-2 text-[12px] font-semibold text-[#6f7682]"
            >
              <UsersRound className="h-4 w-4" />
              Все
            </button>
            <button
              type="button"
              onClick={onReload}
              className="rounded-2xl bg-[#e6e9ef] p-2 text-[#6f7682]"
              aria-label="Обновить график"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="-mx-4 mt-4 border-t border-line pt-4">
          <div ref={scrollRef} className="scrollbar-hidden overflow-x-auto pb-4">
            <div className="grid gap-1" style={{ gridTemplateColumns: gridColumns, minWidth }}>
              <div className="sticky left-0 z-30 bg-screen" />
              {monthDates.map((date) => (
                <div
                  key={toISODate(date)}
                  className={clsx(
                    'text-center text-[12px] font-bold leading-tight',
                    dayTone(date) === 'current'
                      ? 'text-ink'
                      : dayTone(date) === 'past'
                        ? 'text-[#bcc3d0] opacity-60'
                        : 'text-[#a9b2be]',
                  )}
                >
                  <div className="text-[14px]">{date.getDate()}</div>
                  <div className="mt-1">{ISO_DAY_LABELS[toISODay(date)]}</div>
                </div>
              ))}

              {staff.map((person, index) => (
                <Fragment key={person.id}>
                  <div
                    key={`${person.id}-profile`}
                    className="sticky left-0 z-30 flex flex-col justify-center bg-screen pr-2 text-center"
                  >
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-2 bg-gradient-to-r from-screen to-transparent" />
                    <div className="relative mx-auto w-[48px]">
                      <button
                        type="button"
                        onClick={() => onEditStaff(person)}
                        className="group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[18px]"
                        aria-label={`Открыть график: ${person.name}`}
                      >
                        <div
                          className={clsx(
                            'absolute inset-0',
                            index === 0 ? 'bg-[#e3e0f8]' : 'bg-[#e4e8ee]',
                          )}
                        />
                        {person.avatarUrl ? (
                          <img
                            src={person.avatarUrl}
                            alt={person.name}
                            className="relative z-10 h-full w-full object-cover"
                          />
                        ) : (
                          <UserRound
                            className={clsx(
                              'relative z-10 h-5 w-5',
                              index === 0 ? 'text-[#a2a0eb]' : 'text-[#68768a]',
                            )}
                          />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditStaff(person)}
                        className="absolute -bottom-1 -right-1 z-20 inline-flex h-6 w-6 items-center justify-center rounded-[8px] bg-[#f4c900] text-white shadow-[0_3px_10px_rgba(0,0,0,0.14)]"
                        aria-label={`Редактировать график: ${person.name}`}
                      >
                        <SquarePen className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditStaff(person)}
                      className="mt-2 line-clamp-2 text-[11px] font-semibold leading-tight text-ink"
                    >
                      {person.name}
                    </button>
                  </div>

                  {monthDates.map((day) => {
                    const daySlots = hoursByStaff[person.id]?.[toISODay(day)] ?? [];
                    const slotText = daySlots.map((slot) => slot.replace('-', '-\n')).join('\n');
                    const tone = dayTone(day);
                    const isPast = tone === 'past';
                    return (
                      <div
                        key={`${person.id}-${toISODate(day)}`}
                        className={clsx(
                          'min-h-[68px] rounded-md p-2 text-[10px] font-semibold leading-tight whitespace-pre-line',
                          slotText
                            ? isPast
                              ? 'bg-[#ebeff5] text-[#a8b1be]'
                              : tone === 'current'
                                ? 'bg-[#e2e6ed] text-ink'
                                : 'bg-[#e2e6ed] text-[#8f98a6]'
                            : 'bg-[#ebeff5] text-transparent',
                        )}
                      >
                        {slotText || '--'}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="fixed left-1/2 z-40 w-full -translate-x-1/2 px-6" style={{ bottom: '94px' }}>
          <button
            type="button"
            onClick={onEdit}
            className="mt-4 w-full rounded-xl bg-accentSoft py-4 text-[18px] font-extrabold text-[#796f3a]"
          >
            Редактировать график
          </button>

          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загружаю график...
            </div>
          ) : null}

          <div className="mt-3 rounded-xl bg-slatePanel py-2">
            <div
              ref={monthStripRef}
              onScroll={handleMonthStripScroll}
              className="scrollbar-hidden overflow-x-auto"
            >
              <ul className="flex min-w-max items-center gap-1.5 text-center text-[13px] font-semibold">
                {monthTabs.map((month) => (
                  <li
                    key={month.key}
                    className={clsx(
                      'shrink-0 rounded-xl',
                      month.active ? 'bg-accent' : 'text-white opacity-90',
                    )}
                    style={{ width: `${MONTH_CELL_WIDTH}px` }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectDate(month.date)}
                      className={clsx('w-full rounded-xl py-1', month.active ? 'text-[#222b33]' : 'text-white')}
                    >
                      <span>{month.label}</span>
                      {month.active ? <div className="text-[12px] font-semibold text-[#222b33]">{month.year}</div> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden pb-6 md:block">
        <section className="overflow-hidden rounded-[32px] border border-[#e1e4ea] bg-[#fcfcfd] shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eceff4] px-6 py-6">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d9dee8] bg-[#f6f8fb] text-[#333c46] transition hover:bg-[#eef2f7]"
                aria-label="Открыть настройки графика"
              >
                <SlidersHorizontal className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-[54px] font-light leading-none tracking-[-0.05em] text-[#343c46]">
                    График работы
                  </h1>
                  <button
                    type="button"
                    onClick={() => setDesktopInfoOpen((value) => !value)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#c6ccd7] text-[#717887] transition hover:bg-[#f5f7fa]"
                    aria-pressed={desktopInfoOpen}
                    aria-label="Показать информацию"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesktopFavorite((value) => !value)}
                    className={clsx(
                      'inline-flex h-8 w-8 items-center justify-center rounded-full transition',
                      desktopFavorite ? 'text-[#f4c900]' : 'text-[#a4acb8]',
                    )}
                    aria-pressed={desktopFavorite}
                    aria-label="Добавить в избранное"
                  >
                    <Star className={clsx('h-5 w-5', desktopFavorite ? 'fill-[#f4c900]' : undefined)} />
                  </button>
                </div>
                <p className="mt-2 text-[14px] font-medium text-[#b1b7c2]">Настройки</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDesktopPrint}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#f0c23d] bg-white px-5 text-[15px] font-semibold text-[#3b4148] transition hover:bg-[#fff8dc]"
            >
              <FileDown className="h-4 w-4 text-[#d1a100]" />
              Выгрузить в PDF
            </button>
          </div>

          {desktopInfoOpen ? (
            <div className="border-b border-[#f1e4a4] bg-[#fff8dc] px-6 py-4 text-sm font-medium text-[#675b2a]">
              В desktop-режиме график показывает повторяющиеся weekly-слоты сотрудников. Клик по строке,
              ячейке или меню открывает редактирование графика конкретного мастера.
            </div>
          ) : null}

          <div className="px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDesktopFiltersOpen((value) => !value)}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#f0c23d] bg-white px-4 text-[15px] font-semibold text-[#2f3741] transition hover:bg-[#fff8dc]"
                  aria-expanded={desktopFiltersOpen}
                >
                  <Filter className="h-4 w-4" />
                  Фильтры
                  <ChevronDown className={clsx('h-4 w-4 transition', desktopFiltersOpen ? 'rotate-180' : undefined)} />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDesktopStep(-1)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dce2eb] bg-[#f8fafc] text-[#4a535d] transition hover:bg-[#eef3f7]"
                    aria-label="Предыдущий период"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDesktopStep(1)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dce2eb] bg-[#f8fafc] text-[#4a535d] transition hover:bg-[#eef3f7]"
                    aria-label="Следующий период"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-w-[220px] text-[20px] font-medium text-[#4a5058]">{desktopTitle}</div>

                <button
                  type="button"
                  onClick={() => onSelectDate(new Date())}
                  className="inline-flex h-10 items-center rounded-2xl border border-[#dce2eb] bg-white px-4 text-[15px] font-medium text-[#4a5058] transition hover:bg-[#f6f8fb]"
                >
                  Сегодня
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="rounded-[16px] bg-[#f2f3f5] p-1">
                  <button
                    type="button"
                    onClick={() => setDesktopViewMode('week')}
                    className={clsx(
                      'rounded-[12px] px-4 py-2 text-[15px] font-medium transition',
                      desktopViewMode === 'week' ? 'bg-white text-[#2d343c] shadow-sm' : 'text-[#737a85]',
                    )}
                  >
                    Неделя
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesktopViewMode('month')}
                    className={clsx(
                      'rounded-[12px] px-4 py-2 text-[15px] font-medium transition',
                      desktopViewMode === 'month' ? 'bg-[#303030] text-white shadow-sm' : 'text-[#737a85]',
                    )}
                  >
                    Месяц
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onReload}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dce2eb] bg-white text-[#78808b] transition hover:bg-[#f6f8fb]"
                  aria-label="Обновить график"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {desktopFiltersOpen ? (
              <div className="mt-6 grid gap-5 xl:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-[14px] font-medium text-[#969daa]">Сотрудники и должности</span>
                  <select
                    value={desktopStaffFilter}
                    onChange={(event) => setDesktopStaffFilter(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-[#dce2eb] bg-white px-4 text-[15px] font-medium text-[#4b535d] outline-none transition focus:border-[#f0c23d]"
                  >
                    <option value="all">Не выбраны</option>
                    {staff.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[14px] font-medium text-[#969daa]">Специализации</span>
                  <select
                    value={desktopPositionFilter}
                    onChange={(event) => setDesktopPositionFilter(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-[#dce2eb] bg-white px-4 text-[15px] font-medium text-[#4b535d] outline-none transition focus:border-[#f0c23d]"
                  >
                    <option value="all">Не выбраны</option>
                    {desktopPositionOptions.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[14px] font-medium text-[#969daa]">Есть график / Нет графика</span>
                  <select
                    value={desktopScheduleFilter}
                    onChange={(event) => setDesktopScheduleFilter(event.target.value as 'all' | 'with' | 'without')}
                    className="h-12 w-full rounded-2xl border border-[#dce2eb] bg-white px-4 text-[15px] font-medium text-[#4b535d] outline-none transition focus:border-[#f0c23d]"
                  >
                    <option value="all">Все</option>
                    <option value="with">Есть график</option>
                    <option value="without">Нет графика</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[14px] font-medium text-[#969daa]">Удаленные / Неудаленные</span>
                  <select
                    value={desktopRemovedFilter}
                    onChange={(event) => setDesktopRemovedFilter(event.target.value as 'all' | 'not_removed' | 'removed')}
                    className="h-12 w-full rounded-2xl border border-[#dce2eb] bg-white px-4 text-[15px] font-medium text-[#4b535d] outline-none transition focus:border-[#f0c23d]"
                  >
                    <option value="not_removed">Неудаленные</option>
                    <option value="removed">Удаленные</option>
                    <option value="all">Все</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[14px] font-medium text-[#969daa]">Уволенные / Неуволенные</span>
                  <select
                    value={desktopEmploymentFilter}
                    onChange={(event) => setDesktopEmploymentFilter(event.target.value as 'all' | 'employed' | 'dismissed')}
                    className="h-12 w-full rounded-2xl border border-[#dce2eb] bg-white px-4 text-[15px] font-medium text-[#4b535d] outline-none transition focus:border-[#f0c23d]"
                  >
                    <option value="employed">Неуволенные</option>
                    <option value="dismissed">Уволенные</option>
                    <option value="all">Все</option>
                  </select>
                </label>

                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={resetDesktopFilters}
                    className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dce2eb] bg-[#f7f9fb] px-5 text-[15px] font-semibold text-[#4a535d] transition hover:bg-[#eef2f7]"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[32px] border border-[#e1e4ea] bg-[#fcfcfd] shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
          {loading ? (
            <div className="flex items-center gap-2 border-b border-[#eceff4] px-6 py-4 text-sm font-semibold text-[#7c8795]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загружаю график...
            </div>
          ) : null}

          {desktopFilteredStaff.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-[32px] font-light tracking-[-0.03em] text-[#343c46]">Сотрудники не найдены</p>
              <p className="mt-3 text-[16px] text-[#8e96a3]">
                Измени фильтры или верни все значения по умолчанию.
              </p>
              <button
                type="button"
                onClick={resetDesktopFilters}
                className="mt-6 inline-flex h-11 items-center rounded-2xl bg-[#f4c900] px-5 text-[15px] font-semibold text-[#2b3138] shadow-[0_14px_30px_rgba(244,201,0,0.25)]"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <div ref={desktopScrollRef} className="scrollbar-hidden overflow-x-auto">
              <div style={{ minWidth: desktopGridMinWidth }}>
                <div
                  className="grid border-b border-[#e6eaf0] bg-[#fcfcfd]"
                  style={{ gridTemplateColumns: desktopGridColumns }}
                >
                  <div className="sticky left-0 z-30 flex items-end gap-2 border-r border-[#e6eaf0] bg-[#fcfcfd] px-4 py-5">
                    <span className="text-[18px] font-medium text-[#303842]">Сотрудники</span>
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#edf1f6] px-2 text-[12px] font-semibold text-[#7a8390]">
                      {desktopFilteredStaff.length}
                    </span>
                  </div>

                  <div
                    className="sticky z-20 border-r border-[#e6eaf0] bg-[#fcfcfd] px-4 py-4"
                    style={{ left: DESKTOP_STAFF_COLUMN_WIDTH }}
                  >
                    <div className="text-[16px] font-semibold text-[#303842]">Всего</div>
                    <div className="text-[13px] text-[#8f98a4]">{desktopLeadingMonthLabel}</div>
                  </div>

                  {desktopDates.map((date, index) => {
                    const iso = toISODate(date);
                    const weekend = isWeekend(date);
                    const selected = iso === desktopSelectedIso;
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => onSelectDate(date)}
                        className={clsx(
                          'border-r border-[#e6eaf0] px-1 py-3 text-center transition',
                          selected ? 'bg-[#f8e28a]' : 'bg-[#fcfcfd] hover:bg-[#f6f8fb]',
                        )}
                      >
                        <div className={clsx('text-[15px] font-semibold', weekend && !selected ? 'text-[#ff6c63]' : 'text-[#363e47]')}>
                          {date.getDate()}
                        </div>
                        <div className={clsx('mt-1 text-[12px] font-medium', weekend && !selected ? 'text-[#ff6c63]' : 'text-[#7d8693]')}>
                          {ISO_DAY_LABELS[toISODay(date)]}
                        </div>
                        <div className="mt-2 text-[11px] font-medium text-[#98a0ad]">
                          {desktopDayStaffCounts[index] > 0 ? `${desktopDayStaffCounts[index]}` : '—'}
                        </div>
                      </button>
                    );
                  })}

                  {desktopShowTrailingSummary ? (
                    <div className="border-l border-[#e6eaf0] px-4 py-4">
                      <div className="text-[16px] font-semibold text-[#303842]">Всего</div>
                      <div className="text-[13px] text-[#8f98a4]">{desktopTrailingMonthLabel}</div>
                    </div>
                  ) : null}
                </div>

                {desktopFilteredStaff.map((person, index) => {
                  const leadingSummary = getSummaryForDates(
                    person,
                    desktopCurrentMonthDates.length > 0 ? desktopCurrentMonthDates : desktopDates,
                  );
                  const trailingSummary = desktopShowTrailingSummary
                    ? getSummaryForDates(person, desktopNextMonthDates)
                    : null;
                  const positionLabel = person.positionName?.trim() || ROLE_LABELS[person.role] || 'Без должности';
                  const rowSurface = index % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfd]';
                  return (
                    <div
                      key={person.id}
                      className="grid border-b border-[#eef1f5] last:border-b-0"
                      style={{ gridTemplateColumns: desktopGridColumns }}
                    >
                      <div className={clsx('sticky left-0 z-20 border-r border-[#e6eaf0] px-4 py-4', rowSurface)}>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => onEditStaff(person)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#eef1f6] text-[#7c8592]"
                            aria-label={`Открыть график сотрудника ${person.name}`}
                          >
                            {person.avatarUrl ? (
                              <img src={person.avatarUrl} alt={person.name} className="h-full w-full object-cover" />
                            ) : (
                              <UserRound className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditStaff(person)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="truncate text-[18px] font-medium text-[#313943]">{person.name}</div>
                            <div className="truncate text-[14px] text-[#7f8895]">{positionLabel}</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditStaff(person)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#8f97a2] transition hover:bg-[#eef2f7]"
                            aria-label={`Дополнительные действия для ${person.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onEditStaff(person)}
                        className={clsx('sticky z-10 flex flex-col items-start justify-center gap-2 border-r border-[#e6eaf0] px-4 py-3 text-left', rowSurface)}
                        style={{ left: DESKTOP_STAFF_COLUMN_WIDTH }}
                      >
                        <div className="inline-flex items-center gap-2 text-[14px] text-[#7c8591]">
                          <Briefcase className="h-4 w-4" />
                          {leadingSummary.shifts}
                        </div>
                        <div className="inline-flex items-center gap-2 text-[14px] text-[#7c8591]">
                          <Clock3 className="h-4 w-4" />
                          {formatHoursLabel(leadingSummary.totalHours)}
                        </div>
                      </button>

                      {desktopDates.map((date) => {
                        const iso = toISODate(date);
                        const daySlots = getSlotsForDate(person, date);
                        const selected = iso === desktopSelectedIso;
                        return (
                          <button
                            key={`${person.id}-${iso}`}
                            type="button"
                            onClick={() => {
                              onSelectDate(date);
                              onEditStaff(person);
                            }}
                            className={clsx(
                              'min-h-[74px] border-r border-[#e6eaf0] px-1 py-1 text-left transition',
                              selected ? 'bg-[#fbf5df]' : rowSurface,
                            )}
                          >
                            {daySlots.length > 0 ? (
                              <div className="flex h-full w-full flex-col justify-between rounded-[12px] border border-[#b8ddb0] bg-[#caeec3] px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                                <div className="text-[10px] font-semibold leading-[1.1] whitespace-pre-line text-[#2d7c2d]">
                                  {daySlots.slice(0, 2).map((slot) => formatShortTimeRange(slot)).join('\n')}
                                </div>
                                <div className="text-[10px] font-semibold text-[#49a245]">
                                  {daySlots.length}
                                </div>
                              </div>
                            ) : (
                              <div
                                className={clsx(
                                  'h-full min-h-[64px] rounded-[12px] border border-dashed',
                                  selected ? 'border-[#ead9a2] bg-[#f8f0d7]' : 'border-transparent bg-transparent',
                                )}
                              />
                            )}
                          </button>
                        );
                      })}

                      {desktopShowTrailingSummary ? (
                        <button
                          type="button"
                          onClick={() => onEditStaff(person)}
                          className={clsx('flex flex-col items-start justify-center gap-2 px-4 py-3 text-left', rowSurface)}
                        >
                          <div className="inline-flex items-center gap-2 text-[14px] text-[#7c8591]">
                            <Briefcase className="h-4 w-4" />
                            {trailingSummary?.shifts ?? 0}
                          </div>
                          <div className="inline-flex items-center gap-2 text-[14px] text-[#7c8591]">
                            <Clock3 className="h-4 w-4" />
                            {formatHoursLabel(trailingSummary?.totalHours ?? 0)}
                          </div>
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      <JournalDatePickerSheet
        open={datePickerOpen}
        selectedDate={selectedDate}
        markedDates={markedDates}
        initialMonthMode="today"
        onClose={() => setDatePickerOpen(false)}
        onSelectDate={(value) => {
          onSelectDate(value);
          setDatePickerOpen(false);
        }}
      />
    </>
  );
}
