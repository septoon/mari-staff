import { ChevronRight, Loader2, LogOut, UserRound } from 'lucide-react';
import { InfoRow } from '../components/shared/InfoRow';
import { roleLabel } from '../helpers';
import type { MoreActionItem, StaffItem, StaffSession } from '../types';

type MoreScreenProps = {
  session: StaffSession;
  currentStaff: StaffItem | null;
  loading: boolean;
  menu: MoreActionItem[];
  onProfileClick: () => void;
  onAction: (title: string) => void;
  onLogout: () => void;
};

export function MoreScreen({
  session,
  currentStaff,
  loading,
  menu,
  onProfileClick,
  onAction,
  onLogout,
}: MoreScreenProps) {
  const displayName = currentStaff?.name?.trim() || session.staff.name;
  const displayRole = currentStaff?.role || session.staff.role;
  const displayPhone = currentStaff?.phoneE164?.trim() || session.staff.phoneE164;
  const displaySubtitle = displayPhone
    ? `${roleLabel(displayRole)} • ${displayPhone}`
    : roleLabel(displayRole);

  return (
    <>
      <div className="pb-7 pt-6 md:hidden">
        <h1 className="text-[24px] font-extrabold leading-none text-ink">Еще</h1>

        <div className="mt-8 space-y-2">
          <InfoRow
            onClick={onProfileClick}
            avatar={
              currentStaff?.avatarUrl ? (
                <img
                  src={currentStaff.avatarUrl}
                  alt={displayName}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e3e0f8] text-[#a1a0e8]">
                  <UserRound className="h-7 w-7" strokeWidth={1.8} />
                </div>
              )
            }
            title={displayName}
            subtitle={displaySubtitle}
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

      <div className="hidden pb-6 md:block">
        <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Аккаунт</p>
          <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
            Еще
          </h1>

          <div className="mt-6">
            <InfoRow
              onClick={onProfileClick}
              avatar={
                currentStaff?.avatarUrl ? (
                  <img
                    src={currentStaff.avatarUrl}
                    alt={displayName}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e3e0f8] text-[#a1a0e8]">
                    <UserRound className="h-7 w-7" strokeWidth={1.8} />
                  </div>
                )
              }
              title={displayName}
              subtitle={displaySubtitle}
            />
          </div>
        </section>

        <section className="mt-5 rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] px-6 py-3 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
          {menu.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => onAction(item.title)}
                className="flex w-full items-center justify-between border-b border-[#eef2f6] py-4 text-left text-ink last:border-b-0"
              >
                <div className="flex items-center gap-4">
                  <Icon className="h-6 w-6 text-ink" strokeWidth={2} />
                  <span className="text-[18px] font-semibold">{item.title}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-[#a4acb8]" />
              </button>
            );
          })}
        </section>

        <button
          type="button"
          onClick={onLogout}
          disabled={loading}
          className="mt-5 inline-flex h-12 items-center gap-2 rounded-2xl border border-[#d9dfe8] bg-white px-5 text-sm font-bold text-ink disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Выйти
        </button>
      </div>
    </>
  );
}
