import clsx from 'clsx';
import { UserRound } from 'lucide-react';

type StaffChipProps = {
  title: string;
  badge: string;
  avatarUrl?: string | null;
  isUser?: boolean;
  onClick?: () => void;
};

export function StaffChip({ title, badge, avatarUrl, isUser, onClick }: StaffChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-center"
    >
      <div
        className={clsx(
          'mx-auto mb-1 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-[17px] font-bold',
          isUser ? 'bg-[#e3e0f8] text-[#a1a0e8]' : 'bg-[#e4e8ee] text-[#617589]',
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={title} className="h-full w-full object-cover" />
        ) : isUser ? (
          <UserRound className="h-5 w-5" strokeWidth={1.8} />
        ) : (
          badge
        )}
      </div>
      <div className="line-clamp-1 text-[14px] font-semibold text-ink">{title}</div>
    </button>
  );
}
