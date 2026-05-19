import { ArrowLeft, Coffee, Loader2, Save } from 'lucide-react';
import { formatDateLabel } from '../helpers';
import type { StaffItem } from '../types';

function openNativePicker(input: HTMLInputElement & { showPicker?: () => void }) {
  try {
    input.showPicker?.();
  } catch {
    // Some browsers only allow opening the native picker during a direct pointer action.
  }
}

type JournalDayEditScreenProps = {
  staff: StaffItem | null;
  selectedDate: Date;
  start: string;
  end: string;
  breakEnabled: boolean;
  breakStart: string;
  breakEnd: string;
  loading: boolean;
  onBack: () => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onBreakEnabledChange: (value: boolean) => void;
  onBreakStartChange: (value: string) => void;
  onBreakEndChange: (value: string) => void;
  onSave: () => void;
};

export function JournalDayEditScreen({
  staff,
  selectedDate,
  start,
  end,
  breakEnabled,
  breakStart,
  breakEnd,
  loading,
  onBack,
  onStartChange,
  onEndChange,
  onBreakEnabledChange,
  onBreakStartChange,
  onBreakEndChange,
  onSave,
}: JournalDayEditScreenProps) {
  return (
    <div className="pb-6 pt-4">
      <div className="mb-4 flex items-center gap-3 border-b border-line pb-3">
        <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[26px] font-extrabold text-ink">График на день</h1>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="text-sm font-semibold text-muted">Сотрудник</p>
        <p className="mt-1 text-[20px] font-semibold text-ink">{staff?.name || '—'}</p>

        <p className="mt-4 text-sm font-semibold text-muted">Дата</p>
        <p className="mt-1 text-[18px] font-semibold text-ink">{formatDateLabel(selectedDate)}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-muted">Начало</span>
            <input
              type="time"
              value={start}
              onChange={(event) => onStartChange(event.target.value)}
              onClick={(event) => openNativePicker(event.currentTarget)}
              onFocus={(event) => openNativePicker(event.currentTarget)}
              placeholder="10:00"
              className="w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-muted">Конец</span>
            <input
              type="time"
              value={end}
              onChange={(event) => onEndChange(event.target.value)}
              onClick={(event) => openNativePicker(event.currentTarget)}
              onFocus={(event) => openNativePicker(event.currentTarget)}
              placeholder="20:00"
              className="w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink outline-none"
            />
          </label>
        </div>

        <div className="mt-5 rounded-2xl border border-line bg-[#f8fafc] p-3">
          <label className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-extrabold text-ink">
              <Coffee className="h-4 w-4 text-[#946d00]" />
              Перерыв
            </span>
            <input
              type="checkbox"
              checked={breakEnabled}
              onChange={(event) => onBreakEnabledChange(event.target.checked)}
              className="h-5 w-5 accent-[#f4c900]"
            />
          </label>

          {breakEnabled ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-muted">Начало</span>
                <input
                  type="time"
                  value={breakStart}
                  onChange={(event) => onBreakStartChange(event.target.value)}
                  onClick={(event) => openNativePicker(event.currentTarget)}
                  onFocus={(event) => openNativePicker(event.currentTarget)}
                  placeholder="13:00"
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-muted">Конец</span>
                <input
                  type="time"
                  value={breakEnd}
                  onChange={(event) => onBreakEndChange(event.target.value)}
                  onClick={(event) => openNativePicker(event.currentTarget)}
                  onFocus={(event) => openNativePicker(event.currentTarget)}
                  placeholder="14:00"
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none"
                />
              </label>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={loading || !staff}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-extrabold text-[#222b33] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Сохранить
        </button>
      </div>
    </div>
  );
}
