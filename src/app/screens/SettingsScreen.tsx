import { ArrowLeft, BellRing, ChevronRight, Mail } from 'lucide-react';

type SettingsScreenProps = {
  notificationCount: number;
  canEdit: boolean;
  onBack: () => void;
  onOpenNotifications: () => void;
};

export function SettingsScreen({
  notificationCount,
  canEdit,
  onBack,
  onOpenNotifications,
}: SettingsScreenProps) {
  return (
    <>
      <div className="pb-8 pt-6 md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d9dfe8] bg-white text-ink"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Сервис</p>
            <h1 className="mt-1 text-[26px] font-extrabold leading-none text-ink">Настройки</h1>
          </div>
        </div>

        <section className="mt-5 rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-5 shadow-[0_16px_34px_rgba(42,49,56,0.08)]">
          <p className="text-sm font-semibold leading-6 text-[#707a88]">
            Здесь собраны служебные настройки салона. Сейчас доступен раздел с уведомлениями по
            эл. почте для клиентов, администраторов и сотрудников.
          </p>
        </section>

        <button
          type="button"
          onClick={onOpenNotifications}
          className="mt-4 flex w-full items-center gap-4 rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-5 text-left shadow-[0_16px_34px_rgba(42,49,56,0.08)]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#fff6cf] text-[#9b7a06]">
            <BellRing className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[20px] font-extrabold leading-none text-ink">Уведомления</p>
              {notificationCount > 0 ? (
                <span className="rounded-full bg-[#eff3f7] px-3 py-1 text-xs font-extrabold text-[#5e6776]">
                  {notificationCount} сценариев
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#707a88]">
              Какие письма получает клиент, администратор и сотрудник. Здесь же настраивается
              время отправки напоминания перед визитом.
            </p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#eff3f7] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#5e6776]">
              <Mail className="h-3.5 w-3.5" />
              Эл. почта
            </span>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-[#98a1ae]" />
        </button>

        <p className="mt-3 text-sm font-semibold leading-6 text-[#707a88]">
          {canEdit
            ? 'Изменения сохраняются сразу после переключения или после нажатия на кнопку сохранения.'
            : 'Просмотр доступен всем сотрудникам, изменение только владельцу.'}
        </p>
      </div>

      <div className="hidden pb-6 md:block">
        <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] px-6 py-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Сервис</p>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                Настройки
              </h1>
              <p className="mt-3 max-w-[720px] text-[16px] font-semibold leading-7 text-[#748091]">
                Служебные разделы салона. Раздел уведомлений отвечает за письма по эл. почте для
                клиентов, администраторов и сотрудников, а также за время отправки напоминания
                перед визитом.
              </p>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#d9dfe8] bg-white px-5 text-sm font-bold text-ink transition hover:border-[#c7d0dc] hover:bg-[#f7f9fc]"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </button>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#fff6cf] text-[#9b7a06]">
                  <Mail className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Канал отправки</p>
                  <p className="mt-3 text-[30px] font-extrabold leading-[0.98] tracking-[-0.03em] text-ink">
                    Эл. почта
                  </p>
                  <p className="mt-3 text-sm font-semibold leading-7 text-[#748091]">
                    Все уведомления на этой странице работают только через SMTP.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Доступ</p>
              <p className="mt-3 text-[30px] font-extrabold leading-[0.98] tracking-[-0.03em] text-ink">
                {canEdit ? 'Владелец' : 'Только просмотр'}
              </p>
              <p className="mt-3 text-sm font-semibold leading-7 text-[#748091]">
                {canEdit
                  ? 'Переключатели и время напоминания можно менять с этой учётной записи.'
                  : 'Эта учётная запись может только просматривать настройки уведомлений.'}
              </p>
            </section>
          </aside>

          <button
            type="button"
            onClick={onOpenNotifications}
            className="group flex min-h-[220px] flex-col justify-between rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 text-left shadow-[0_18px_40px_rgba(42,49,56,0.08)] transition hover:-translate-y-[1px] hover:border-[#d5dce6] hover:shadow-[0_22px_44px_rgba(33,40,48,0.1)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#fff6cf] text-[#9b7a06]">
                <BellRing className="h-7 w-7" />
              </div>
              {notificationCount > 0 ? (
                <div className="rounded-full bg-[#eff3f7] px-4 py-2 text-sm font-bold text-[#5e6776]">
                  {notificationCount} сценариев
                </div>
              ) : null}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Раздел</p>
              <h2 className="mt-3 text-[34px] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink">
                Уведомления
              </h2>
              <p className="mt-3 max-w-[720px] text-[16px] font-semibold leading-7 text-[#748091]">
                Управление письмами по группам: клиентам, администраторам и сотрудникам. Внутри
                раздела можно включать и выключать каждый сценарий отдельно.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-[#edf1f5] pt-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#eff3f7] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#5e6776]">
                <Mail className="h-3.5 w-3.5" />
                Эл. почта
              </span>
              <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                Открыть раздел
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
