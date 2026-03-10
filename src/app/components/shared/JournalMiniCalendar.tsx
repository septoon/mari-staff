import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MONTHS_RU } from '../../constants';
import { toISODate } from '../../helpers';

type JournalMiniCalendarProps = {
  selectedDate: Date;
  markedDates: string[];
  onSelectDate: (value: Date) => void;
};

const WEEK_LABELS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'] as const;

function getMonthDaysGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (first.getDay() + 6) % 7;
  const cells: Array<Date | null> = [];
  for (let index = 0; index < firstDayIndex; index += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  return cells;
}

export function JournalMiniCalendar({
  selectedDate,
  markedDates,
  onSelectDate,
}: JournalMiniCalendarProps) {
  const [displayMonth, setDisplayMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  useEffect(() => {
    setDisplayMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  const days = useMemo(
    () => getMonthDaysGrid(displayMonth.getFullYear(), displayMonth.getMonth()),
    [displayMonth],
  );
  const markedSet = useMemo(() => new Set(markedDates), [markedDates]);
  const todayIso = toISODate(new Date());
  const selectedIso = toISODate(selectedDate);

  return (
    <section className="rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-5 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Календарь</p>
          <h3 className="mt-2 text-[28px] font-extrabold capitalize leading-none text-ink">
            {MONTHS_RU[displayMonth.getMonth()]} {displayMonth.getFullYear()}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setDisplayMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
              )
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f4f8] text-[#69717d] transition hover:bg-[#e7ebf0] hover:text-ink"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setDisplayMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
              )
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f4f8] text-[#69717d] transition hover:bg-[#e7ebf0] hover:text-ink"
            aria-label="Следующий месяц"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-y-2 text-center">
        {WEEK_LABELS.map((label) => (
          <div key={label} className="text-xs font-bold uppercase text-[#a0a7b3]">
            {label}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-7 gap-y-3">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-11" />;
          }
          const iso = toISODate(date);
          const isSelected = iso === selectedIso;
          const isToday = iso === todayIso;
          const hasAppointments = markedSet.has(iso);
          return (
            <div key={iso} className="flex justify-center">
              <button
                type="button"
                onClick={() => onSelectDate(date)}
                className={clsx(
                  'relative flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-bold transition',
                  isSelected
                    ? 'border-[#f4c900] bg-[#f4c900] text-[#222b33]'
                    : isToday
                      ? 'border-[#f6878d] bg-white text-ink'
                      : 'border-[#d7dde6] bg-white text-[#49515d] hover:border-[#b5bdca]',
                )}
              >
                {hasAppointments && !isSelected ? (
                  <span className="pointer-events-none absolute bottom-1 h-1.5 w-1.5 rounded-full bg-[#2ab84d]" />
                ) : null}
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>

    </section>
  );
}
