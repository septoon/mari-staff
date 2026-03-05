import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { formatDateLabel } from '../helpers';
import type { StaffItem } from '../types';

type JournalDayRemoveScreenProps = {
  staff: StaffItem | null;
  selectedDate: Date;
  loading: boolean;
  onBack: () => void;
  onConfirm: () => void;
};

export function JournalDayRemoveScreen({
  staff,
  selectedDate,
  loading,
  onBack,
  onConfirm,
}: JournalDayRemoveScreenProps) {
  return (
    <div className="pb-6 pt-4">
      <div className="mb-4 flex items-center gap-3 border-b border-line pb-3">
        <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[26px] font-extrabold text-ink">Удалить из графика</h1>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="text-sm font-semibold text-muted">Сотрудник</p>
        <p className="mt-1 text-[20px] font-semibold text-ink">{staff?.name || '—'}</p>

        <p className="mt-4 text-sm font-semibold text-muted">Дата</p>
        <p className="mt-1 text-[18px] font-semibold text-ink">{formatDateLabel(selectedDate)}</p>

        <p className="mt-4 text-sm font-semibold text-muted">
          Действие удалит все интервалы работы выбранного сотрудника на этот день.
        </p>

        <button
          type="button"
          onClick={onConfirm}
          disabled={loading || !staff}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ffd7d7] px-4 py-2 text-sm font-extrabold text-[#8f2d2d] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Удалить на день
        </button>
      </div>
    </div>
  );
}
