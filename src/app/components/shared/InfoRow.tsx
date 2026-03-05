import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

type InfoRowProps = {
  avatar: ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
};

export function InfoRow({ avatar, title, subtitle, onClick }: InfoRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between py-3 text-left"
    >
      <div className="flex items-center gap-4">
        {avatar}
        <div>
          {subtitle ? <div className="text-[14px] font-semibold text-muted">{subtitle}</div> : null}
          <div className="text-[18px] font-medium text-ink">{title}</div>
        </div>
      </div>
      <ChevronRight className="h-6 w-6 text-[#a4acb8]" />
    </button>
  );
}
