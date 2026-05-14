import clsx from 'clsx';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DAY_NAMES } from '../../constants';
import { getWeekDates, toISODate } from '../../helpers';

type JournalWeekStripProps = {
  selectedDate: Date;
  weekDates: Date[];
  onDaySelect: (value: Date) => void;
};

const WEEK_PAGE_SIZE = 7;
const WEEK_CELL_WIDTH = 65;
const WEEK_CELL_GAP = 6;
const WEEK_CELL_STEP = WEEK_CELL_WIDTH + WEEK_CELL_GAP;
const INITIAL_WEEK_BUFFER = 8;
const EXTEND_DAYS = WEEK_PAGE_SIZE * 4;
const EDGE_THRESHOLD_PX = WEEK_CELL_STEP * WEEK_PAGE_SIZE * 2;

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function buildDatesFrom(start: Date, count: number) {
  return Array.from({ length: count }).map((_, index) => addDays(start, index));
}

function buildDatesAround(date: Date) {
  const weekStart = getWeekDates(date)[0];
  const start = addDays(weekStart, -INITIAL_WEEK_BUFFER * WEEK_PAGE_SIZE);
  const total = (INITIAL_WEEK_BUFFER * 2 + 1) * WEEK_PAGE_SIZE;
  return buildDatesFrom(start, total);
}

export function JournalWeekStrip({
  selectedDate,
  onDaySelect,
}: JournalWeekStripProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const extendingRef = useRef(false);
  const pendingScrollAdjustmentRef = useRef(0);
  const shouldCenterSelectedRef = useRef(true);
  const lastSelectedIsoRef = useRef(toISODate(selectedDate));
  const [stripDates, setStripDates] = useState<Date[]>(() => buildDatesAround(selectedDate));

  const selectedIso = toISODate(selectedDate);
  if (lastSelectedIsoRef.current !== selectedIso) {
    lastSelectedIsoRef.current = selectedIso;
    shouldCenterSelectedRef.current = true;
  }

  const selectedIsRendered = useMemo(
    () => stripDates.some((date) => toISODate(date) === selectedIso),
    [selectedIso, stripDates],
  );

  useEffect(() => {
    if (!selectedIsRendered) {
      shouldCenterSelectedRef.current = true;
      setStripDates(buildDatesAround(selectedDate));
    }
  }, [selectedDate, selectedIsRendered]);

  useLayoutEffect(() => {
    const container = stripRef.current;
    if (!container) {
      return;
    }

    const pendingAdjustment = pendingScrollAdjustmentRef.current;
    if (pendingAdjustment) {
      container.scrollLeft += pendingAdjustment;
      pendingScrollAdjustmentRef.current = 0;
    }
    extendingRef.current = false;

    if (shouldCenterSelectedRef.current) {
      const selectedButton = container.querySelector<HTMLElement>(`[data-date="${selectedIso}"]`);
      if (selectedButton) {
        if (typeof selectedButton.scrollIntoView === 'function') {
          selectedButton.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'auto' });
        } else {
          container.scrollLeft =
            selectedButton.offsetLeft - container.clientWidth / 2 + selectedButton.offsetWidth / 2;
        }
        shouldCenterSelectedRef.current = false;
      }
    }
  }, [selectedIso, stripDates]);

  const handleScroll = () => {
    const container = stripRef.current;
    if (!container || extendingRef.current || stripDates.length === 0) {
      return;
    }

    if (container.scrollLeft < EDGE_THRESHOLD_PX) {
      extendingRef.current = true;
      pendingScrollAdjustmentRef.current += EXTEND_DAYS * WEEK_CELL_STEP;
      setStripDates((current) => [
        ...buildDatesFrom(addDays(current[0], -EXTEND_DAYS), EXTEND_DAYS),
        ...current,
      ]);
      return;
    }

    if (container.scrollWidth - container.clientWidth - container.scrollLeft < EDGE_THRESHOLD_PX) {
      extendingRef.current = true;
      setStripDates((current) => [
        ...current,
        ...buildDatesFrom(addDays(current[current.length - 1], 1), EXTEND_DAYS),
      ]);
    }
  };

  return (
    <div className="rounded-lg bg-slatePanel p-2">
      <div ref={stripRef} className="scrollbar-hidden overflow-x-auto" onScroll={handleScroll}>
        <ul className="flex min-w-max items-center gap-1.5 text-center">
          {stripDates.map((date) => {
            const iso = toISODate(date);
            const isActive = iso === selectedIso;
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            return (
              <li key={iso} className="shrink-0" style={{ width: `${WEEK_CELL_WIDTH}px` }}>
                <button
                  type="button"
                  data-date={iso}
                  onClick={() => onDaySelect(date)}
                  className={clsx(
                    'w-full rounded-lg py-1 text-[14px] font-semibold',
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
