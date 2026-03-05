import clsx from 'clsx';
import { DAY_NAMES } from '../../constants';
import { toISODate } from '../../helpers';

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
  return (
    <div className="rounded-2xl bg-slatePanel p-2">
      <ul className="grid grid-cols-7 text-center">
        {weekDates.map((date) => {
          const isActive = toISODate(date) === toISODate(selectedDate);
          const weekend = date.getDay() === 0 || date.getDay() === 6;
          return (
            <li key={toISODate(date)}>
              <button
                type="button"
                onClick={() => onDaySelect(date)}
                className={clsx(
                  'w-full rounded-xl py-2 text-[15px] font-semibold',
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
  );
}
