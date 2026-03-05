import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { formatDateLabel } from '../helpers';
import type { StaffItem } from '../types';

type JournalDayEditScreenProps = {
  staff: StaffItem | null;
  selectedDate: Date;
  start: string;
  end: string;
  loading: boolean;
  onBack: () => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onSave: () => void;
};

export function JournalDayEditScreen({
  staff,
  selectedDate,
  start,
  end,
  loading,
  onBack,
  onStartChange,
  onEndChange,
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
              value={start}
              onChange={(event) => onStartChange(event.target.value)}
              placeholder="10:00"
              className="w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-muted">Конец</span>
            <input
              value={end}
              onChange={(event) => onEndChange(event.target.value)}
              placeholder="18:00"
              className="w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink outline-none"
            />
          </label>
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
