import { Fragment, useMemo, useState } from 'react';
import clsx from 'clsx';
import { CalendarDays, Loader2, Pencil, SlidersHorizontal, UserRound, UsersRound } from 'lucide-react';
import { ISO_DAY_LABELS } from '../constants';
import { monthStrip, toISODate, toISODay } from '../helpers';
import { JournalDatePickerSheet } from '../components/shared/JournalDatePickerSheet';
import type { StaffItem, WorkingHoursMap } from '../types';

type ScheduleScreenProps = {
  selectedDate: Date;
  weekDates: Date[];
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
  weekDates,
  staff,
  hoursByStaff,
  loading,
  onReload,
  onEdit,
  onEditStaff,
  onSelectDate,
}: ScheduleScreenProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const gridColumns = `108px repeat(${weekDates.length}, minmax(98px, 1fr))`;
  const minWidth = 108 + weekDates.length * 108;
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

  return (
    <div className="pb-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-[30px] font-extrabold leading-none text-ink">
          <span>График работы</span>
          <button
            type="button"
            onClick={() => setDatePickerOpen(true)}
            aria-label="Открыть календарь"
          >
            <CalendarDays className="h-8 w-8 text-accent" />
          </button>
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReload}
            className="flex items-center gap-2 rounded-2xl bg-[#e6e9ef] px-4 py-2 text-[14px] font-semibold text-[#6f7682]"
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
        <div className="scrollbar-hidden overflow-x-auto pb-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: gridColumns, minWidth }}>
            <div />
            {weekDates.map((date) => (
              <div
                key={toISODate(date)}
                className={clsx(
                  'text-center text-[14px] font-bold leading-tight',
                  toISODate(date) === toISODate(selectedDate) ? 'text-ink' : 'text-[#bcc3d0]',
                )}
              >
                <div className="text-[16px]">{date.getDate()}</div>
                <div className="mt-1">{ISO_DAY_LABELS[toISODay(date)]}</div>
              </div>
            ))}

            {staff.map((person, index) => (
              <Fragment key={person.id}>
                <div key={`${person.id}-profile`} className="text-center">
                  <button
                    type="button"
                    onClick={() => onEditStaff(person)}
                    className="group relative mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl"
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
                    <span className="absolute -bottom-1 -right-1 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#f4c900] text-white shadow-sm">
                      <Pencil className="h-3.5 w-3.5" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditStaff(person)}
                    className="mt-2 line-clamp-2 text-[15px] font-semibold leading-tight text-ink"
                  >
                    {person.name}
                  </button>
                </div>

                {weekDates.map((day) => {
                  const daySlots = hoursByStaff[person.id]?.[toISODay(day)] ?? [];
                  const slotText = daySlots.map((slot) => slot.replace('-', '-\n')).join('\n');
                  return (
                    <div
                      key={`${person.id}-${toISODate(day)}`}
                      className={clsx(
                        'min-h-[102px] rounded-md p-2 text-[16px] font-semibold leading-tight whitespace-pre-line',
                        slotText ? 'bg-[#e8ebf1] text-ink' : 'bg-[#f0f2f6] text-transparent',
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

      <div className="mt-6 rounded-3xl bg-slatePanel p-2">
        <ul className="grid grid-cols-5 items-center gap-2 text-center text-[18px] font-semibold">
          {monthStrip(weekDates[0]).map((month, index) => (
            <li
              key={month.label}
              className={clsx(
                'rounded-2xl py-2 text-white',
                index === 0 ? 'bg-accent text-[#222b33]' : 'opacity-90',
              )}
            >
              {month.label}
              {index === 0 ? <div className="text-sm font-semibold">{month.year}</div> : null}
            </li>
          ))}
        </ul>
      </div>

      <JournalDatePickerSheet
        open={datePickerOpen}
        selectedDate={selectedDate}
        markedDates={markedDates}
        onClose={() => setDatePickerOpen(false)}
        onSelectDate={(value) => {
          onSelectDate(value);
          setDatePickerOpen(false);
        }}
      />
    </div>
  );
}
