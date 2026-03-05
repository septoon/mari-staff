import { ChevronRight, Phone, Trash2 } from 'lucide-react';

type NotificationRowProps = {
  label: string;
  time: string;
  mode: 'new' | 'delete';
};

export function NotificationRow({ label, time, mode }: NotificationRowProps) {
  return (
    <button type="button" className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-left">
      <div className="flex items-center gap-3">
        {mode === 'new' ? (
          <div className="rounded-md border-[3px] border-[#1f56dd] p-1 text-[#1f56dd]">
            <Phone className="h-5 w-5" />
          </div>
        ) : (
          <div className="rounded-md border-[3px] border-[#1f56dd] p-1 text-[#1f56dd]">
            <Trash2 className="h-5 w-5" />
          </div>
        )}
        <span className="text-[16px] font-medium text-ink">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-[16px] font-medium text-[#727987]">
        {time}
        <ChevronRight className="h-5 w-5 text-[#98a0ad]" />
      </div>
    </button>
  );
}
