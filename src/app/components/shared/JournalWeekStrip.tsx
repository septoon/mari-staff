import clsx from 'clsx';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type TouchEvent,
  type WheelEvent,
} from 'react';
import { DAY_NAMES } from '../../constants';
import { getWeekDates, toISODate } from '../../helpers';

type JournalWeekStripProps = {
  selectedDate: Date;
  weekDates: Date[];
  onDaySelect: (value: Date) => void;
};

const WEEK_PAGE_SIZE = 7;
const SWIPE_THRESHOLD_PX = 42;
const WHEEL_THRESHOLD_PX = 32;
const WHEEL_COOLDOWN_MS = 360;
const SWIPE_CLICK_SUPPRESS_MS = 450;
const WEEK_SLIDE_MS = 180;

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function buildControlledStripDates(weekDates: Date[], selectedDate: Date) {
  return weekDates.length === WEEK_PAGE_SIZE ? weekDates : getWeekDates(selectedDate);
}

export function JournalWeekStrip({
  selectedDate,
  weekDates,
  onDaySelect,
}: JournalWeekStripProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastSwipeAtRef = useRef(0);
  const wheelLockUntilRef = useRef(0);
  const animationTimeoutRef = useRef<number | null>(null);
  const lastSelectedIsoRef = useRef(toISODate(selectedDate));

  const selectedIso = toISODate(selectedDate);
  const [stripDates, setStripDates] = useState<Date[]>(() =>
    buildControlledStripDates(weekDates, selectedDate),
  );
  const [slideOffset, setSlideOffset] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  useLayoutEffect(() => {
    const container = stripRef.current;
    if (!container) {
      return;
    }

    container.scrollLeft = 0;
  }, [selectedIso, stripDates]);

  useEffect(() => {
    if (lastSelectedIsoRef.current === selectedIso) {
      return;
    }

    lastSelectedIsoRef.current = selectedIso;
    setTransitionEnabled(false);
    setSlideOffset(0);
    setStripDates(buildControlledStripDates(weekDates, selectedDate));
  }, [selectedDate, selectedIso, weekDates]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const animateWeekOffset = (offset: number) => {
    if (animationTimeoutRef.current) {
      return;
    }

    lastSwipeAtRef.current = Date.now();
    setTransitionEnabled(true);
    setSlideOffset(offset > 0 ? -1 : 1);

    animationTimeoutRef.current = window.setTimeout(() => {
      setTransitionEnabled(false);
      setStripDates((current) => getWeekDates(addDays(current[0] ?? selectedDate, offset * WEEK_PAGE_SIZE)));
      setSlideOffset(offset > 0 ? 1 : -1);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setTransitionEnabled(true);
          setSlideOffset(0);
          animationTimeoutRef.current = null;
        });
      });
    }, WEEK_SLIDE_MS);
  };

  const handleGestureStart = (x: number, y: number) => {
    touchStartRef.current = { x, y };
  };

  const handleGestureEnd = (x: number, y: number) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) {
      return;
    }

    const deltaX = x - start.x;
    const deltaY = y - start.y;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
      return;
    }

    lastSwipeAtRef.current = Date.now();
    animateWeekOffset(deltaX < 0 ? 1 : -1);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    handleGestureStart(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    handleGestureEnd(event.clientX, event.clientY);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    handleGestureStart(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }
    handleGestureEnd(touch.clientX, touch.clientY);
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) < WHEEL_THRESHOLD_PX || Math.abs(event.deltaX) < Math.abs(event.deltaY)) {
      return;
    }

    event.preventDefault();
    const now = Date.now();
    if (now < wheelLockUntilRef.current) {
      return;
    }

    wheelLockUntilRef.current = now + WHEEL_COOLDOWN_MS;
    animateWeekOffset(event.deltaX > 0 ? 1 : -1);
  };

  const handleDayClick = (date: Date) => {
    if (Date.now() - lastSwipeAtRef.current < SWIPE_CLICK_SUPPRESS_MS) {
      return;
    }
    onDaySelect(date);
  };

  return (
    <div className="rounded-lg bg-slatePanel p-2">
      <div
        ref={stripRef}
        className="scrollbar-hidden touch-pan-y select-none overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        <ul
          className={clsx(
            'grid grid-cols-7 items-center gap-1.5 text-center',
            transitionEnabled ? 'transition-transform ease-out' : undefined,
          )}
          style={{
            transform: `translateX(${slideOffset * 100}%)`,
            transitionDuration: transitionEnabled ? `${WEEK_SLIDE_MS}ms` : '0ms',
          }}
        >
          {stripDates.map((date) => {
            const iso = toISODate(date);
            const isActive = iso === selectedIso;
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            return (
              <li key={iso} className="min-w-0">
                <button
                  type="button"
                  data-date={iso}
                  onClick={() => handleDayClick(date)}
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
