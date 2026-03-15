import {
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronRight,
  Loader2,
  LogOut,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react';
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
  const displayEmail = currentStaff?.email?.trim() || session.staff.email || '';
  const displaySubtitle = displayPhone
    ? `${roleLabel(displayRole)} • ${displayPhone}`
    : roleLabel(displayRole);
  const actionDescriptions: Record<string, string> = {
    'Сотрудники': 'Управление командой, ролями, услугами и доступами сотрудников.',
    'Аналитика': 'Основные показатели салона, выручка, загрузка и клиентские сегменты.',
    'Онлайн-запись': 'Настройка клиентского сайта, публичных услуг и сценариев записи.',
    'Политика конфиденциальности': 'Блоки политики, cookie-уведомление и тексты согласия на обработку данных.',
    'Настройки': 'Общие параметры студии, системные опции и служебные конфиги.',
    'Поддержка': 'Связь с поддержкой и быстрый доступ к служебным сценариям.',
  };

  const profileAvatar = currentStaff?.avatarUrl ? (
    <img
      src={currentStaff.avatarUrl}
      alt={displayName}
      className="h-20 w-20 rounded-[28px] object-cover"
    />
  ) : (
    <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#e3e0f8] text-[#8c8ae7]">
      <UserRound className="h-10 w-10" strokeWidth={1.8} />
    </div>
  );

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
        <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] px-6 py-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Сервис</p>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                Еще
              </h1>
              <p className="mt-3 max-w-[620px] text-[16px] font-semibold leading-7 text-[#748091]">
                Быстрый доступ к служебным разделам, настройкам, поддержке и личному аккаунту.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onProfileClick}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#d9dfe8] bg-white px-5 text-sm font-bold text-ink transition hover:border-[#c7d0dc] hover:bg-[#f7f9fc]"
              >
                <UserRound className="h-4 w-4" />
                Профиль
              </button>
              <button
                type="button"
                onClick={onLogout}
                disabled={loading}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#efd6d3] bg-white px-5 text-sm font-bold text-[#b65746] transition hover:bg-[#fff6f3] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Выйти
              </button>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
              <div className="flex items-start gap-4">
                {profileAvatar}
                <div className="min-w-0 flex-1">
                  <p className="text-[28px] font-extrabold leading-[1.02] tracking-[-0.04em] text-ink">
                    {displayName}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#748091]">{displaySubtitle}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-[24px] border border-[#e6ebf1] bg-white px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Роль</p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#eff3f7] px-3 py-2 text-sm font-extrabold text-[#445062]">
                    <BriefcaseBusiness className="h-4 w-4" />
                    {roleLabel(displayRole)}
                  </div>
                </div>

                {displayPhone ? (
                  <div className="rounded-[24px] border border-[#e6ebf1] bg-white px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Телефон</p>
                    <div className="mt-3 flex items-center gap-2 text-sm font-extrabold text-ink">
                      <Phone className="h-4 w-4 text-[#748091]" />
                      {displayPhone}
                    </div>
                  </div>
                ) : null}

                {displayEmail ? (
                  <div className="rounded-[24px] border border-[#e6ebf1] bg-white px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Email</p>
                    <div className="mt-3 flex items-center gap-2 text-sm font-extrabold text-ink">
                      <Mail className="h-4 w-4 text-[#748091]" />
                      <span className="truncate">{displayEmail}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </aside>

          <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Разделы</p>
                <h2 className="mt-3 text-[30px] font-extrabold leading-none tracking-[-0.03em] text-ink">
                  Быстрые действия
                </h2>
              </div>
              <div className="rounded-full bg-[#f4f6f9] px-4 py-2 text-sm font-bold text-[#748091]">
                {menu.length} разделов
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {menu.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => onAction(item.title)}
                    className="group flex min-h-[156px] flex-col justify-between rounded-[28px] border border-[#e5e9f0] bg-white p-5 text-left transition hover:-translate-y-[1px] hover:border-[#d5dce6] hover:shadow-[0_18px_36px_rgba(33,40,48,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#f4c900] text-[#222b33] shadow-[0_10px_22px_rgba(244,201,0,0.28)]">
                        <Icon className="h-5 w-5" strokeWidth={2.1} />
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-[#a4acb8] transition group-hover:text-ink" />
                    </div>

                    <div className="mt-6">
                      <p className="text-[24px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink">
                        {item.title}
                      </p>
                      <p className="mt-3 text-[15px] font-semibold leading-7 text-[#748091]">
                        {actionDescriptions[item.title] ?? 'Открыть раздел и продолжить работу с настройками.'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-[28px] border border-[#eceff4] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)] px-5 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Аккаунт</p>
                  <p className="mt-3 text-[22px] font-extrabold leading-none text-ink">
                    {displayName}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-[#748091]">
                    Доступ, профиль и выход из системы доступны без переключения на мобильный сценарий.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onProfileClick}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#d9dfe8] bg-white px-5 text-sm font-bold text-ink transition hover:border-[#c7d0dc] hover:bg-[#f7f9fc]"
                >
                  Открыть профиль
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
