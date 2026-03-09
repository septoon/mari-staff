import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { CalendarDays, Loader2, Pencil, SlidersHorizontal, UserRound, UsersRound } from 'lucide-react';
import { ISO_DAY_LABELS, MONTHS_RU } from '../constants';
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const monthStripRef = useRef<HTMLDivElement | null>(null);
  const monthScrollSyncRef = useRef(false);
  const monthScrollTimerRef = useRef<number | null>(null);
  const STAFF_COLUMN_WIDTH = 96;
  const DAY_COLUMN_WIDTH = 72;
  const GRID_GAP = 6;
  const TODAY_LEFT_SHIFT_PX = 36;
  const MONTH_PAGE_SIZE = 5;
  const MONTH_CELL_WIDTH = 74;
  const MONTH_CELL_GAP = 8;
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
    const targetLeft = Math.max(0, Math.round(currentDayOffset - leftAnchor + TODAY_LEFT_SHIFT_PX));
    container.scrollTo({ left: targetLeft, behavior: 'auto' });
  }, [DAY_COLUMN_WIDTH, GRID_GAP, STAFF_COLUMN_WIDTH, TODAY_LEFT_SHIFT_PX, monthDates, selectedDateIso]);

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

  return (
    <div className="flex min-h-full flex-col pb-[170px] pt-5">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[24px] font-extrabold leading-none text-ink">
          <span>График работы</span>
          <button
            type="button"
            onClick={() => setDatePickerOpen(true)}
            aria-label="Открыть календарь"
          >
            <CalendarDays className="h-6 w-6 text-accent" />
          </button>
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReload}
            className="flex items-center gap-2 rounded-2xl bg-[#e6e9ef] px-3 py-2 text-[13px] font-semibold text-[#6f7682]"
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
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <div ref={scrollRef} className="scrollbar-hidden overflow-x-auto pb-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: gridColumns, minWidth }}>
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
                <div className="text-[16px]">{date.getDate()}</div>
                <div className="mt-1">{ISO_DAY_LABELS[toISODay(date)]}</div>
              </div>
            ))}

            {staff.map((person, index) => (
              <Fragment key={person.id}>
                <div
                  key={`${person.id}-profile`}
                  className="sticky left-0 z-30 bg-screen pr-2 text-center"
                >
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-2 bg-gradient-to-r from-screen to-transparent" />
                  <button
                    type="button"
                    onClick={() => onEditStaff(person)}
                    className="group relative mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl"
                    aria-label={`Редактировать график: ${person.name}`}
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
                          'relative z-10 h-6 w-6',
                          index === 0 ? 'text-[#a2a0eb]' : 'text-[#68768a]',
                        )}
                      />
                    )}
                    <span className="absolute -bottom-1 -right-1 z-20 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#f4c900] text-white shadow-sm">
                      <Pencil className="h-3 w-3" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditStaff(person)}
                    className="mt-2 line-clamp-2 text-[12px] font-semibold leading-tight text-ink"
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
                        'min-h-[74px] rounded-md p-2 text-[11px] font-semibold leading-tight whitespace-pre-line',
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

      <div className="fixed bottom-[74px] left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-4">
        <button
          type="button"
          onClick={onEdit}
          className="mt-4 w-full rounded-[28px] bg-accentSoft py-4 text-[20px] font-extrabold text-[#796f3a]"
        >
          Редактировать график
        </button>

        {loading ? (
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загружаю график...
          </div>
        ) : null}

        <div className="mt-3 rounded-xl bg-slatePanel p-2">
          <div
            ref={monthStripRef}
            onScroll={handleMonthStripScroll}
            className="scrollbar-hidden overflow-x-auto"
          >
            <ul className="flex min-w-max items-center gap-2 text-center text-[14px] font-semibold">
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
                    {month.active ? <div className="text-sm font-semibold text-[#222b33]">{month.year}</div> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
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
    </div>
  );
}
