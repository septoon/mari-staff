import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import { PageSheet } from './PageSheet';
import { MONTHS_RU } from '../../constants';
import { toISODate } from '../../helpers';

type JournalDatePickerSheetProps = {
  open: boolean;
  selectedDate: Date;
  markedDates: string[];
  onClose: () => void;
  onSelectDate: (value: Date) => void;
  initialMonthMode?: 'selected' | 'today';
};

const WEEK_LABELS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'] as const;
const PAST_MONTHS = 18;
const FUTURE_MONTHS = 18;
const LEGEND_SAMPLE_DAY = 27;

type LegendTone = 'none' | 'low' | 'medium' | 'high' | 'off';

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

function LegendBadge({ tone }: { tone: LegendTone }) {
  if (tone === 'off') {
    return (
      <span className="inline-flex h-12 w-12 items-center justify-center text-[18px] font-semibold text-[#a4adb9]">
        {LEGEND_SAMPLE_DAY}
      </span>
    );
  }

  const ringClass =
    tone === 'low'
      ? 'border-r-[#2ab84d] border-t-[#2ab84d]'
      : tone === 'medium'
        ? 'border-r-[#f4c900] border-t-[#f4c900]'
        : tone === 'high'
          ? 'border-r-[#ff3b3b] border-t-[#ff3b3b]'
          : 'border-transparent';

  return (
    <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#d2d4d8] text-[18px] font-semibold text-[#2d3440]">
      {tone !== 'none' ? (
        <span className={clsx('pointer-events-none absolute inset-0 rounded-full border-[3px] border-transparent rotate-[24deg]', ringClass)} />
      ) : null}
      {LEGEND_SAMPLE_DAY}
    </span>
  );
}

function LegendRow({ tone, label }: { tone: LegendTone; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <LegendBadge tone={tone} />
      <span className="text-[17px] font-semibold text-[#2d3440]">{label}</span>
    </div>
  );
}

export function JournalDatePickerSheet({
  open,
  selectedDate,
  markedDates,
  onClose,
  onSelectDate,
  initialMonthMode = 'selected',
}: JournalDatePickerSheetProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const selectedIso = toISODate(selectedDate);
  const todayIso = toISODate(new Date());
  const markedSet = new Set(markedDates);
  const focusedMonthRef = useRef<HTMLElement | null>(null);
  const focusDate = useMemo(
    () => (initialMonthMode === 'today' ? new Date() : selectedDate),
    [initialMonthMode, selectedDate],
  );
  const focusedMonthKey = `${focusDate.getFullYear()}-${focusDate.getMonth()}`;
  const months = useMemo(
    () =>
      Array.from({ length: PAST_MONTHS + FUTURE_MONTHS + 1 }).map((_, index) => {
        const offset = index - PAST_MONTHS;
        const value = new Date(focusDate.getFullYear(), focusDate.getMonth() + offset, 1);
        return {
          year: value.getFullYear(),
          month: value.getMonth(),
          key: `${value.getFullYear()}-${value.getMonth()}`,
          title: MONTHS_RU[value.getMonth()],
        };
      }),
    [focusDate],
  );

  useEffect(() => {
    if (!open) {
      setInfoOpen(false);
      return;
    }
    let cancelled = false;
    let timerId: number | null = null;
    let attempts = 0;
    let stableHits = 0;

    const tryScroll = () => {
      if (cancelled) {
        return;
      }
      attempts += 1;
      const focusedMonthNode = focusedMonthRef.current;
      if (focusedMonthNode) {
        const container = focusedMonthNode.closest('[data-rsbs-scroll]') as HTMLDivElement | null;
        if (container && container.scrollHeight > container.clientHeight + 1) {
          const targetTop = Math.max(
            container.scrollTop +
              focusedMonthNode.getBoundingClientRect().top -
              container.getBoundingClientRect().top -
              8,
            0,
          );
          container.scrollTo({ top: targetTop, behavior: 'auto' });
          const delta = Math.abs(container.scrollTop - targetTop);
          stableHits = delta <= 2 ? stableHits + 1 : 0;
        } else {
          stableHits = 0;
        }
      }

      if (stableHits >= 2 || attempts >= 80) {
        return;
      }
      timerId = window.setTimeout(tryScroll, 40);
    };

    tryScroll();
    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [focusedMonthKey, open]);

  return (
    <>
      <PageSheet
        open={open}
        onDismiss={onClose}
        className="mari-page-sheet--calendar mari-page-sheet--journal-date"
        snapPoints={({ maxHeight }) => {
          const sheetHeight = Math.max(360, Math.min(maxHeight - 24, Math.round(maxHeight * 0.8)));
          return [sheetHeight];
        }}
        defaultSnap={({ snapPoints }) => snapPoints[0] ?? 0}
      >
        <div className="min-h-full rounded-t-[18px] bg-[#f3f3f4] shadow-[0_-8px_20px_rgba(0,0,0,0.12)]">
          <div className="sticky top-0 z-10 mt-2 flex shrink-0 items-center gap-3 border-b border-[#e0e3e7] bg-[#f3f3f4] px-4 py-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#2f3540]"
              aria-label="Закрыть выбор даты"
            >
              <X className="h-8 w-8" />
            </button>
            <h3 className="text-[24px] font-bold text-[#2d3440]">Выберите дату</h3>
            <div className="ml-auto flex items-center gap-2 rounded-2xl bg-[#e8ebef] px-3 py-2">
              <span className="text-sm font-semibold text-[#2f3540]">Все</span>
            </div>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#cfd4db] text-[#2f3540]"
              aria-label="Как работает заполненность календаря"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>

          <div className="snap-y snap-mandatory px-5 pb-8 pt-2">
            {months.map((month) => {
              const days = getMonthDaysGrid(month.year, month.month);
              const isFocusedMonth = month.key === focusedMonthKey;
              return (
                <section
                  key={month.key}
                  ref={isFocusedMonth ? focusedMonthRef : undefined}
                  className="mt-6 snap-start snap-always first:mt-2"
                >
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
      </PageSheet>

      <PageSheet
        open={open && infoOpen}
        onDismiss={() => setInfoOpen(false)}
        className="mari-page-sheet--journal-date-help"
        snapPoints={({ maxHeight }) => {
          const maxSheet = Math.max(320, Math.min(560, maxHeight - 56));
          const midSheet = Math.max(320, Math.min(460, maxSheet - 60));
          return [midSheet, maxSheet];
        }}
        defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? snapPoints[0] ?? 0}
      >
        <div className="rounded-t-[22px] bg-[#f3f3f4] px-5 pb-6 pt-5">
          <h4 className="text-[24px] font-bold text-[#1f2732]">Как это работает</h4>
          <p className="mt-3 text-[17px] font-medium leading-7 text-[#2d3440]">
            Заполненность круга в календаре отражает уровень загрузки сотрудников
          </p>
          <div className="mt-6 space-y-4">
            <LegendRow tone="none" label="Записей нет" />
            <LegendRow tone="low" label="Малое количество записей" />
            <LegendRow tone="medium" label="Среднее количество записей" />
            <LegendRow tone="high" label="Большое количество записей" />
            <LegendRow tone="off" label="Нерабочий день" />
          </div>
        </div>
      </PageSheet>
    </>
  );
}
