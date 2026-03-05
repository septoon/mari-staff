import clsx from 'clsx';
import { Info, X } from 'lucide-react';
import { MONTHS_RU } from '../../constants';
import { toISODate } from '../../helpers';

type JournalDatePickerSheetProps = {
  open: boolean;
  selectedDate: Date;
  markedDates: string[];
  onClose: () => void;
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

export function JournalDatePickerSheet({
  open,
  selectedDate,
  markedDates,
  onClose,
  onSelectDate,
}: JournalDatePickerSheetProps) {
  if (!open) {
    return null;
  }

  const selectedIso = toISODate(selectedDate);
  const todayIso = toISODate(new Date());
  const markedSet = new Set(markedDates);
  const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const months = Array.from({ length: 4 }).map((_, index) => {
    const value = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return {
      year: value.getFullYear(),
      month: value.getMonth(),
      title: MONTHS_RU[value.getMonth()],
    };
  });

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/35"
        aria-label="Закрыть календарь"
      />

      <div className="absolute bottom-0 left-1/2 flex h-[86vh] w-full max-w-[430px] -translate-x-1/2 flex-col rounded-t-[22px] bg-[#f3f3f4] shadow-[0_-8px_20px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mt-1.5 h-1.5 w-14 rounded-full bg-[#d6d9de]" />

        <div className="mt-2 flex items-center gap-3 border-b border-[#e0e3e7] px-4 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#2f3540]"
            aria-label="Закрыть"
          >
            <X className="h-8 w-8" />
          </button>
          <h3 className="text-[34px] font-bold text-[#2d3440]">Выберите дату</h3>
          <div className="ml-auto flex items-center gap-2 rounded-2xl bg-[#e8ebef] px-3 py-2">
            <span className="text-sm font-semibold text-[#2f3540]">Все</span>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#cfd4db] text-[#2f3540]"
            aria-label="Информация"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>

        <div className="scrollbar-hidden flex-1 overflow-y-auto px-5 pb-8 pt-2">
          {months.map((month) => {
            const days = getMonthDaysGrid(month.year, month.month);
            return (
              <section key={`${month.year}-${month.month}`} className="mt-6 first:mt-2">
                <h4 className="text-[26px] font-bold capitalize text-[#1f2732]">
                  {month.title}
                </h4>
                <div className="mt-3 grid grid-cols-7 gap-y-2">
                  {WEEK_LABELS.map((label) => (
                    <div
                      key={`${month.year}-${month.month}-${label}`}
                      className="text-center text-[16px] font-semibold text-[#9ea7b5]"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-7 gap-y-3">
                  {days.map((date, index) => {
                    if (!date) {
                      return <div key={`${month.year}-${month.month}-empty-${index}`} className="h-11" />;
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
                            'relative flex h-11 w-11 items-center justify-center rounded-full border-2 text-[16px] font-semibold',
                            isSelected
                              ? 'border-[#f4c900] bg-[#f4c900] text-[#2d3440]'
                              : isToday
                                ? 'border-[#ff4d4f] text-[#2d3440]'
                                : 'border-[#d2d4d8] text-[#2d3440]',
                          )}
                        >
                          {hasAppointments && !isSelected ? (
                            <span className="pointer-events-none absolute inset-0 rounded-full border-[3px] border-transparent border-r-[#2ab84d] border-t-[#2ab84d] rotate-[24deg]" />
                          ) : null}
                          {date.getDate()}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
