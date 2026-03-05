import { ChevronRight, Loader2, LogOut, UserRound } from 'lucide-react';
import { InfoRow } from '../components/shared/InfoRow';
import { roleLabel } from '../helpers';
import type { MoreActionItem, StaffSession } from '../types';

type MoreScreenProps = {
  session: StaffSession;
  loading: boolean;
  menu: MoreActionItem[];
  onProfileClick: () => void;
  onAction: (title: string) => void;
  onLogout: () => void;
};

export function MoreScreen({
  session,
  loading,
  menu,
  onProfileClick,
  onAction,
  onLogout,
}: MoreScreenProps) {
  return (
    <div className="pb-7 pt-6">
      <h1 className="text-[30px] font-extrabold leading-none text-ink">Еще</h1>

      <div className="mt-8 space-y-2">
        <InfoRow
          onClick={onProfileClick}
          avatar={
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e3e0f8] text-[#a1a0e8]">
              <UserRound className="h-7 w-7" strokeWidth={1.8} />
            </div>
          }
          title={session.staff.name}
          subtitle={`${roleLabel(session.staff.role)} • ${session.staff.phoneE164}`}
        />
      </div>

      <div className="mt-5 rounded-2xl bg-screen">
        {menu.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => onAction(item.title)}
              className="flex w-full items-center justify-between py-4 text-left text-ink"
            >
              <div className="flex items-center gap-4">
                <Icon className="h-7 w-7 text-ink" strokeWidth={2} />
                <span className="text-[16px] font-medium">{item.title}</span>
              </div>
              <ChevronRight className="h-6 w-6 text-[#a4acb8]" />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onLogout}
        disabled={loading}
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-bold text-ink disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Выйти
      </button>
    </div>
  );
}
