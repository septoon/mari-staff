import { AlertTriangle, LockKeyhole, UserRound } from 'lucide-react';

type AccessDeniedScreenProps = {
  path: string;
  onOpenJournal: () => void;
  onOpenProfile: () => void;
};

export function AccessDeniedScreen({
  path,
  onOpenJournal,
  onOpenProfile,
}: AccessDeniedScreenProps) {
  return (
    <div className="pb-6 pt-4 md:pt-6">
      <section className="overflow-hidden rounded-[32px] border border-[#f0d7a8] bg-[linear-gradient(180deg,#fffdf8_0%,#fff8ea_100%)] shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
        <div className="border-b border-[#f3e2bf] px-6 py-5">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#222b33] text-[#f4c900]">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[#9e7d2b]">Ограничение доступа</p>
          <h1 className="mt-3 text-[34px] font-extrabold leading-[0.94] tracking-[-0.03em] text-ink md:text-[44px]">
            Страница недоступна
          </h1>
          <p className="mt-3 max-w-[720px] text-base font-semibold leading-7 text-[#756c5a]">
            Для вашего аккаунта этот раздел закрыт. Откройте журнал или перейдите в профиль.
          </p>
        </div>

        <div className="grid gap-4 px-6 py-6 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-[28px] border border-[#eadfca] bg-white px-5 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9ba3af]">Маршрут</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-[#f5f7fa] px-4 py-3 text-sm font-semibold text-ink">
              <LockKeyhole className="h-4 w-4 text-[#8d95a1]" />
              {path || '/'}
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={onOpenJournal}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)]"
            >
              Открыть журнал
            </button>
            <button
              type="button"
              onClick={onOpenProfile}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#d7dde6] bg-white px-5 text-sm font-semibold text-ink"
            >
              <UserRound className="h-4 w-4" />
              Открыть профиль
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
