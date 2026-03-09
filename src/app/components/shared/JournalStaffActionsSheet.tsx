import { ArrowLeft, ChevronRight } from 'lucide-react';
import { PageSheet } from './PageSheet';
import type { StaffItem } from '../../types';

type JournalStaffActionsSheetProps = {
  staff: StaffItem | null;
  onClose: () => void;
  onEditDay: () => void;
  onRemoveDay: () => void;
  onOpenScheduleEdit: () => void;
};

export function JournalStaffActionsSheet({
  staff,
  onClose,
  onEditDay,
  onRemoveDay,
  onOpenScheduleEdit,
}: JournalStaffActionsSheetProps) {
  if (!staff) {
    return null;
  }

  const actionClass =
    'flex w-full items-center justify-between border-t border-line px-4 py-5 text-left text-[20px] font-medium text-ink';

  return (
    <PageSheet
      open={Boolean(staff)}
      onDismiss={onClose}
      snapPoints={({ maxHeight }) => [Math.min(340, maxHeight), Math.min(520, maxHeight)]}
      defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? snapPoints[0] ?? 0}
    >
      <section className="bg-screen">
        <div className="flex items-center gap-3 px-4 pb-3 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink">
            <ArrowLeft className="h-7 w-7" />
          </button>
          <p className="text-[44px] font-extrabold leading-none text-ink">
            <span className="text-[52%]">{staff.name}</span>
          </p>
        </div>

        <button type="button" className={actionClass} onClick={onEditDay}>
          <span>Изменить график на день</span>
          <ChevronRight className="h-5 w-5 text-[#9ca5b2]" />
        </button>

        <button type="button" className={actionClass} onClick={onRemoveDay}>
          <span>Удалить из графика на день</span>
          <ChevronRight className="h-5 w-5 text-[#9ca5b2]" />
        </button>

        <button type="button" className={actionClass} onClick={onOpenScheduleEdit}>
          <span>Редактирование графика</span>
          <ChevronRight className="h-5 w-5 text-[#9ca5b2]" />
        </button>
      </section>
    </PageSheet>
  );
}
