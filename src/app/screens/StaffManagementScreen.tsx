import type { Dispatch, SetStateAction } from 'react';
import clsx from 'clsx';
import { ArrowLeft, ChevronRight, Loader2, Plus, RefreshCcw, Search, UserRound } from 'lucide-react';
import { roleLabel } from '../helpers';
import type { StaffFilter, StaffItem } from '../types';

type StaffManagementScreenProps = {
  staff: StaffItem[];
  loading: boolean;
  search: string;
  onBack: () => void;
  onSearchChange: (value: string) => void;
  filters: StaffFilter;
  serviceCounts: Record<string, number>;
  onFilterChange: Dispatch<SetStateAction<StaffFilter>>;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (item: StaffItem) => Promise<void> | void;
};

export function StaffManagementScreen({
  staff,
  loading,
  search,
  onBack,
  onSearchChange,
  filters,
  serviceCounts,
  onFilterChange,
  onRefresh,
  onCreate,
  onEdit,
}: StaffManagementScreenProps) {
  const withServicesCount = staff.filter((item) => (serviceCounts[item.id] ?? 0) > 0).length;
  const withAccessCount = staff.filter((item) => item.isActive).length;

  return (
    <>
      <div className="pb-4 pt-[152px] md:hidden">
        <div className="fixed left-1/2 top-0 z-30 w-full -translate-x-1/2 bg-screen px-4 pb-4 pt-4">
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-[26px] font-extrabold text-ink">Сотрудники</h1>
            <div className="flex items-center gap-1 text-muted">
              <button type="button" onClick={onRefresh} className="rounded-lg p-2 text-ink">
                <RefreshCcw className="h-6 w-6" />
              </button>
              <button type="button" onClick={onCreate} className="rounded-lg p-2 text-ink">
                <Plus className="h-6 w-6" />
              </button>
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-xl border-[3px] border-line bg-screen px-4 py-2 text-muted">
            <Search className="h-7 w-7 text-[#97a0ad]" />
            <input
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Поиск"
              className="w-full bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:text-[#97a0ad]"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              onFilterChange((prev) => ({ ...prev, withServices: !prev.withServices }))
            }
            className={clsx(
              'rounded-full px-5 py-2 text-[16px] font-semibold',
              filters.withServices ? 'bg-[#f2dc7e] text-ink' : 'bg-[#dde2ea] text-ink',
            )}
          >
            Оказывает услуги
          </button>
        </div>

        <ul className="mt-4 space-y-5">
          {staff.map((item) => {
            const servicesCount = serviceCounts[item.id] ?? 0;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void onEdit(item)}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <div className="mt-1 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e3e0f8] text-[#a1a0e8]">
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-8 w-8" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[44px] font-medium leading-none text-ink">
                      <span className="text-[18px]">{item.name}</span>
                    </p>
                    <p className="mt-1 truncate text-[18px] font-medium text-muted">
                      {item.positionName || roleLabel(item.role)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {servicesCount > 0 ? (
                        <span className="rounded-full bg-[#f2dc7e] px-4 py-1 text-[14px] font-medium text-ink">
                          Оказывает услуги
                        </span>
                      ) : null}
                      <span className="rounded-full bg-[#dde2ea] px-4 py-1 text-[16px] font-medium text-ink">
                        {servicesCount} услуг
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="mt-7 h-6 w-6 shrink-0 text-[#9ca5b2]" />
                </button>
              </li>
            );
          })}
        </ul>

        {loading ? (
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Обновляю сотрудников...
          </div>
        ) : null}
        {!loading && staff.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-muted">Сотрудники не найдены</p>
        ) : null}
      </div>

      <div className="hidden pb-6 md:block">
        <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Команда</p>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                Сотрудники
              </h1>
              <p className="mt-4 max-w-[720px] text-[15px] font-semibold leading-6 text-[#7c8491]">
                Управление командой: поиск, фильтры, быстрый переход в карточку сотрудника и
                контроль доступа к сервису.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-semibold text-ink"
              >
                <ArrowLeft className="h-4 w-4 text-[#8892a2]" />
                Назад
              </button>
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-semibold text-ink"
              >
                <RefreshCcw className="h-4 w-4 text-[#8892a2]" />
                Обновить
              </button>
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)]"
              >
                <Plus className="h-4 w-4" />
                Новый сотрудник
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <label className="flex items-center gap-3 rounded-2xl border border-[#dce2ea] bg-white px-4 py-3 text-muted">
              <Search className="h-5 w-5 text-[#97a0ad]" />
              <input
                type="text"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Поиск по имени, роли или специализации"
                className="w-full bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:text-[#9aa2af]"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  onFilterChange((prev) => ({ ...prev, withServices: !prev.withServices }))
                }
                className={clsx(
                  'inline-flex h-12 items-center rounded-2xl px-4 text-sm font-extrabold transition',
                  filters.withServices
                    ? 'bg-[#f4c900] text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.22)]'
                    : 'border border-[#dde3eb] bg-white text-ink',
                )}
              >
                Оказывает услуги
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Всего</p>
              <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{staff.length}</p>
            </div>
            <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">С услугами</p>
              <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{withServicesCount}</p>
            </div>
            <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">С доступом</p>
              <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{withAccessCount}</p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mt-5 animate-pulse space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[92px] rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] shadow-[0_18px_40px_rgba(42,49,56,0.08)]"
              />
            ))}
          </div>
        ) : null}

        {!loading ? (
          <section className="mt-5 overflow-hidden rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
            <div className="grid items-center gap-4 border-b border-[#edf1f5] px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae] xl:grid-cols-[minmax(0,1.2fr)_220px_140px_140px_56px]">
              <div>Сотрудник</div>
              <div>Роль</div>
              <div>Услуги</div>
              <div>Доступ</div>
              <div />
            </div>

            {staff.length > 0 ? (
              staff.map((item, index) => {
                const servicesCount = serviceCounts[item.id] ?? 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void onEdit(item)}
                    className={clsx(
                      'grid w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-[#f7f9fc] xl:grid-cols-[minmax(0,1.2fr)_220px_140px_140px_56px]',
                      index > 0 ? 'border-t border-[#edf1f5]' : undefined,
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e3e0f8] text-[#a1a0e8]">
                        {item.avatarUrl ? (
                          <img src={item.avatarUrl} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <UserRound className="h-7 w-7" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[20px] font-extrabold text-ink">{item.name}</p>
                        <p className="mt-1 truncate text-sm font-semibold text-[#7d8693]">
                          {item.positionName || roleLabel(item.role)}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm font-bold text-[#5d6775]">{roleLabel(item.role)}</div>

                    <div>
                      <span className="inline-flex rounded-full bg-[#f4f6f9] px-3 py-2 text-sm font-bold text-ink">
                        {servicesCount} услуг
                      </span>
                    </div>

                    <div>
                      <span
                        className={clsx(
                          'inline-flex rounded-full px-3 py-2 text-sm font-bold',
                          item.isActive
                            ? 'bg-[#e4f4e8] text-[#267a45]'
                            : 'bg-[#f4e6e6] text-[#a34f4f]',
                        )}
                      >
                        {item.isActive ? 'Активен' : 'Без доступа'}
                      </span>
                    </div>

                    <div className="flex justify-end">
                      <ChevronRight className="h-5 w-5 text-[#9ca5b2]" />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-6 py-14 text-center">
                <p className="text-[28px] font-extrabold text-ink">Сотрудники не найдены</p>
                <p className="mt-3 text-base font-semibold text-[#7d8693]">
                  Измени фильтры поиска или создай нового сотрудника.
                </p>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}
