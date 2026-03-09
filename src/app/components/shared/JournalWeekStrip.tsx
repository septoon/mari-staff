import clsx from 'clsx';
import { useEffect, useMemo, useRef } from 'react';
import { DAY_NAMES } from '../../constants';
import { getWeekDates, toISODate } from '../../helpers';

type JournalWeekStripProps = {
  selectedDate: Date;
  weekDates: Date[];
  onDaySelect: (value: Date) => void;
};

export function JournalWeekStrip({
  selectedDate,
  weekDates,
  onDaySelect,
}: JournalWeekStripProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const scrollSyncRef = useRef(false);
  const scrollTimerRef = useRef<number | null>(null);
  const WEEK_PAGE_SIZE = 7;
  const WEEK_CELL_WIDTH = 44;
  const WEEK_CELL_GAP = 8;
  const WEEK_LEFT_BUFFER = 1;
  const WEEK_RIGHT_BUFFER = 1;
  const WEEK_STEP_PX = (WEEK_CELL_WIDTH + WEEK_CELL_GAP) * WEEK_PAGE_SIZE;
  const WEEK_BASE_SCROLL_LEFT = WEEK_STEP_PX * WEEK_LEFT_BUFFER;

  const selectedIso = toISODate(selectedDate);
  const selectedWeekdayIndex = useMemo(() => {
    const index = weekDates.findIndex((date) => toISODate(date) === selectedIso);
    return index >= 0 ? index : 0;
  }, [selectedIso, weekDates]);
  const weekStart = useMemo(() => weekDates[0] ?? getWeekDates(selectedDate)[0], [selectedDate, weekDates]);
  const stripDates = useMemo(() => {
    const start = new Date(weekStart);
    start.setDate(start.getDate() - WEEK_LEFT_BUFFER * WEEK_PAGE_SIZE);
    const total = (WEEK_LEFT_BUFFER + WEEK_RIGHT_BUFFER + 1) * WEEK_PAGE_SIZE;
    return Array.from({ length: total }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [weekStart, WEEK_LEFT_BUFFER, WEEK_PAGE_SIZE, WEEK_RIGHT_BUFFER]);

  useEffect(() => {
    const container = stripRef.current;
    if (!container) {
      return;
    }
    scrollSyncRef.current = true;
    container.scrollTo({ left: WEEK_BASE_SCROLL_LEFT, behavior: 'auto' });
    const frame = window.requestAnimationFrame(() => {
      scrollSyncRef.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [WEEK_BASE_SCROLL_LEFT, selectedIso]);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  const handleStripScroll = () => {
    if (scrollSyncRef.current) {
      return;
    }
    if (scrollTimerRef.current !== null) {
      window.clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = window.setTimeout(() => {
      const container = stripRef.current;
      if (!container) {
        return;
      }
      const pageOffset = Math.round((container.scrollLeft - WEEK_BASE_SCROLL_LEFT) / WEEK_STEP_PX);
      if (pageOffset === 0) {
        scrollSyncRef.current = true;
        container.scrollTo({ left: WEEK_BASE_SCROLL_LEFT, behavior: 'smooth' });
        window.requestAnimationFrame(() => {
          scrollSyncRef.current = false;
        });
        return;
      }

      const nextDate = new Date(weekStart);
      nextDate.setDate(
        nextDate.getDate() + pageOffset * WEEK_PAGE_SIZE + selectedWeekdayIndex,
      );
      onDaySelect(nextDate);
    }, 120);
  };

  return (
    <div className="rounded-lg bg-slatePanel p-2">
      <div ref={stripRef} onScroll={handleStripScroll} className="scrollbar-hidden overflow-x-auto">
        <ul className="flex min-w-max items-center gap-2 text-center">
          {stripDates.map((date) => {
            const iso = toISODate(date);
            const isActive = iso === selectedIso;
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            return (
              <li key={iso} className="shrink-0" style={{ width: `${WEEK_CELL_WIDTH}px` }}>
                <button
                  type="button"
                  onClick={() => onDaySelect(date)}
                  className={clsx(
                    'w-full rounded-lg py-1 text-[15px] font-semibold',
                    isActive ? 'bg-accent text-[#222b33]' : 'text-white',
                  )}
                >
                  <div className={clsx(weekend && !isActive ? 'text-[#ff7935]' : undefined)}>
                    {DAY_NAMES[date.getDay()]}
                  </div>
                  <div className={clsx(weekend && !isActive ? 'text-[#ff7935]' : undefined)}>
                    {date.getDate()}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
