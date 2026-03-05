import clsx from 'clsx';
import { ArrowLeft, ChevronRight, Plus, Trash2, UserRound } from 'lucide-react';
import { MONTHS_RU } from '../constants';
import type { StaffItem } from '../types';

type ScheduleEditorScreenProps = {
  staff: StaffItem | null;
  selectedDate: Date;
  selectedDays: number[];
  start: string;
  end: string;
  loading: boolean;
  onBack: () => void;
  onToggleDay: (day: number) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onPresetSelect: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
};

const ISO_DAY_OPTIONS = [
  { day: 1, short: 'Пн' },
  { day: 2, short: 'Вт' },
  { day: 3, short: 'Ср' },
  { day: 4, short: 'Чт' },
  { day: 5, short: 'Пт' },
  { day: 6, short: 'Сб' },
  { day: 7, short: 'Вс' },
] as const;

const PRESETS = ['09:00-18:00', '10:00-19:00', '10:00-20:00', '12:00-21:00'] as const;

function formatPeriodLabel(date: Date) {
  const from = new Date(date);
  const to = new Date(date);
  to.setMonth(to.getMonth() + 1);
  to.setDate(to.getDate() - 1);
  return `${from.getDate()} ${MONTHS_RU[from.getMonth()]} ${from.getFullYear()} - ${to.getDate()} ${
    MONTHS_RU[to.getMonth()]
  } ${to.getFullYear()}`;
}

export function ScheduleEditorScreen({
  staff,
  selectedDate,
  selectedDays,
  start,
  end,
  loading,
  onBack,
  onToggleDay,
  onStartChange,
  onEndChange,
  onPresetSelect,
  onSave,
  onClear,
}: ScheduleEditorScreenProps) {
  const selectedDaysSet = new Set(selectedDays);

  return (
    <div className="pb-6 pt-4">
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
          <ArrowLeft className="h-7 w-7" />
        </button>
        <h1 className="text-[24px] font-extrabold text-ink">Редактирование графика</h1>
        <button type="button" onClick={onClear} className="rounded-lg p-2 text-[#eb6d47]">
          <Trash2 className="h-7 w-7" />
        </button>
      </div>

      <div className="space-y-5">
        <div className="flex w-full items-center justify-between rounded-2xl bg-[#f1f3f7] px-3 py-3 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#e3e0f8] text-[#a2a0eb]">
              {staff?.avatarUrl ? (
                <img src={staff.avatarUrl} alt={staff.name} className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </div>
            <span className="text-[20px] font-semibold text-ink">{staff?.name || 'Сотрудник'}</span>
          </div>
          <ChevronRight className="h-6 w-6 text-[#e7af27]" />
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-between border-b border-line pb-3 text-left"
        >
          <div>
            <p className="text-[20px] font-semibold text-ink">График</p>
            <p className="text-[16px] font-medium text-muted">По дням недели</p>
          </div>
          <ChevronRight className="h-6 w-6 text-[#e7af27]" />
        </button>

        <div>
          <p className="text-[20px] font-semibold text-[#59606b]">Выберите рабочие дни недели</p>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {ISO_DAY_OPTIONS.map((item) => {
              const active = selectedDaysSet.has(item.day);
              return (
                <button
                  key={item.day}
                  type="button"
                  onClick={() => onToggleDay(item.day)}
                  className="flex flex-col items-center gap-2"
                >
                  <span
                    className={clsx(
                      'h-9 w-9 rounded-xl border-[3px] transition-colors',
                      active ? 'border-[#f4c900] bg-[#fdf4c8]' : 'border-[#d2d6de]',
                    )}
                  />
                  <span className="text-[17px] font-semibold text-ink">{item.short}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-between border-b border-line pb-3 text-left"
        >
          <div>
            <p className="text-[20px] font-semibold text-ink">Период действия</p>
            <p className="text-[16px] font-medium text-muted">{formatPeriodLabel(selectedDate)}</p>
          </div>
          <ChevronRight className="h-6 w-6 text-[#e7af27]" />
        </button>

        <div className="scrollbar-hidden overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onPresetSelect(preset)}
                className="rounded-2xl bg-white px-4 py-3 text-[18px] font-semibold text-ink shadow-[0_6px_16px_rgba(36,46,66,0.08)]"
              >
                c {preset.replace('-', ' до ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[18px] font-semibold text-muted">Рабочее время</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="rounded-3xl border-[2px] border-line bg-screen px-6 py-4">
              <span className="block text-[18px] font-semibold text-muted">с</span>
              <input
                value={start}
                onChange={(event) => onStartChange(event.target.value)}
                className="mt-1 w-full bg-transparent text-[40px] font-semibold text-ink outline-none"
              />
            </label>
            <label className="rounded-3xl border-[2px] border-line bg-screen px-6 py-4">
              <span className="block text-[18px] font-semibold text-muted">до</span>
              <input
                value={end}
                onChange={(event) => onEndChange(event.target.value)}
                className="mt-1 w-full bg-transparent text-[40px] font-semibold text-ink outline-none"
              />
            </label>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-[58px] w-full items-center justify-center gap-3 rounded-3xl bg-[#dfe3ea] text-[20px] font-bold text-[#313740]"
        >
          <Plus className="h-7 w-7 text-[#e8b316]" />
          Добавить перерыв
        </button>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={loading}
        className="mt-6 w-full rounded-3xl bg-[#f2df8f] py-4 text-[24px] font-bold text-[#7c8696] disabled:opacity-60"
      >
        {loading ? 'Сохранение...' : 'Сохранить'}
      </button>
    </div>
  );
}
