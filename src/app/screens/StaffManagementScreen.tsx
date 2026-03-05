import type { Dispatch, SetStateAction } from 'react';
import clsx from 'clsx';
import { ArrowLeft, ChevronRight, Loader2, Plus, Search, UserRound, X } from 'lucide-react';
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
  return (
    <div className="pb-4 pt-4">
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[26px] font-extrabold text-ink">Сотрудники</h1>
        <div className="flex items-center gap-1 text-muted">
          <button type="button" onClick={onRefresh} className="rounded-lg p-2 text-ink">
            <UserRound className="h-6 w-6" />
            <X className="-ml-2 h-3 w-3" />
          </button>
          <button type="button" onClick={onCreate} className="rounded-lg p-2 text-ink">
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-3xl border-[3px] border-line bg-screen px-4 py-3 text-muted">
        <Search className="h-7 w-7 text-[#97a0ad]" />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Поиск"
          className="w-full bg-transparent text-[18px] font-semibold text-ink outline-none placeholder:text-[#97a0ad]"
        />
      </label>

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
        <button
          type="button"
          onClick={() => onFilterChange((prev) => ({ ...prev, withAccess: !prev.withAccess }))}
          className={clsx(
            'rounded-full px-5 py-2 text-[16px] font-semibold',
            filters.withAccess ? 'bg-[#f2dc7e] text-ink' : 'bg-[#dde2ea] text-ink',
          )}
        >
          Доступ к сервису
        </button>
      </div>

      <ul className="mt-4 space-y-5">
        {staff.map((item) => (
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
                  <span className="text-[50%]">{item.name}</span>
                </p>
                <p className="mt-1 truncate text-[18px] font-medium text-muted">
                  {item.positionName || roleLabel(item.role)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#f2dc7e] px-4 py-1 text-[16px] font-medium text-ink">
                    Оказывает услуги
                  </span>
                  <span
                    className={clsx(
                      'rounded-full px-4 py-1 text-[16px] font-medium',
                      item.isActive ? 'bg-[#dde2ea] text-ink' : 'bg-[#ebd9d9] text-[#905252]',
                    )}
                  >
                    {item.isActive ? 'Доступ к сервису' : 'Доступ отключен'}
                  </span>
                  <span className="rounded-full bg-[#dde2ea] px-4 py-1 text-[16px] font-medium text-ink">
                    {serviceCounts[item.id] ?? 0} услуг
                  </span>
                </div>
              </div>
              <ChevronRight className="mt-7 h-6 w-6 shrink-0 text-[#9ca5b2]" />
            </button>
          </li>
        ))}
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
  );
}
