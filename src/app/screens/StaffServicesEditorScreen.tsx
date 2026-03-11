import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ArrowLeft, Check, ChevronDown, ChevronRight, Minus, Search } from 'lucide-react';
import type { ServiceItem } from '../types';

const DESKTOP_PANEL_CLASS =
  'rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]';

type StaffServicesEditorScreenProps = {
  staffName: string;
  services: ServiceItem[];
  selectedServiceIds: string[];
  search: string;
  loading: boolean;
  onBack: () => void;
  onSearchChange: (value: string) => void;
  onToggleCategory: (categoryId: string) => void;
  onToggleService: (serviceId: string) => void;
  onSave: () => void;
};

type CategoryGroup = {
  id: string;
  name: string;
  items: ServiceItem[];
};

function formatDuration(durationSec: number) {
  const totalMin = Math.max(0, Math.round(durationSec / 60));
  if (totalMin === 0) {
    return '0 мин';
  }
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours} ч ${minutes} м`;
  }
  if (hours > 0) {
    return `${hours} ч`;
  }
  return `${minutes} мин`;
}

export function StaffServicesEditorScreen({
  staffName,
  services,
  selectedServiceIds,
  search,
  loading,
  onBack,
  onSearchChange,
  onToggleCategory,
  onToggleService,
  onSave,
}: StaffServicesEditorScreenProps) {
  const selectedSet = useMemo(() => new Set(selectedServiceIds), [selectedServiceIds]);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);

  const allGroups = useMemo(() => {
    const groupsMap = new Map<string, CategoryGroup>();
    services.forEach((item) => {
      const id = item.categoryId || 'uncategorized';
      const name = item.categoryName || 'Без категории';
      const current = groupsMap.get(id);
      if (!current) {
        groupsMap.set(id, { id, name, items: [item] });
        return;
      }
      current.items.push(item);
    });
    return Array.from(groupsMap.values())
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [services]);

  const allGroupsById = useMemo(() => {
    const map = new Map<string, CategoryGroup>();
    allGroups.forEach((group) => {
      map.set(group.id, group);
    });
    return map;
  }, [allGroups]);

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return allGroups;
    }
    return allGroups
      .map((group) => {
        const categoryMatches = group.name.toLowerCase().includes(query);
        if (categoryMatches) {
          return group;
        }
        const filteredItems = group.items.filter((item) =>
          `${item.name} ${item.nameOnline || ''}`.toLowerCase().includes(query),
        );
        if (filteredItems.length === 0) {
          return null;
        }
        return {
          ...group,
          items: filteredItems,
        };
      })
      .filter(Boolean) as CategoryGroup[];
  }, [allGroups, search]);

  useEffect(() => {
    if (allGroups.length === 0) {
      setExpandedCategoryIds([]);
      return;
    }

    const query = search.trim();
    if (query) {
      setExpandedCategoryIds(visibleGroups.map((group) => group.id));
      return;
    }

    const existingIds = new Set(allGroups.map((group) => group.id));
    setExpandedCategoryIds((prev) => {
      const persisted = prev.filter((id) => existingIds.has(id));
      return persisted.length > 0 ? persisted : [allGroups[0].id];
    });
  }, [allGroups, search, visibleGroups]);

  const expandedSet = useMemo(() => new Set(expandedCategoryIds), [expandedCategoryIds]);
  const selectedServices = useMemo(
    () => services.filter((item) => selectedSet.has(item.id)),
    [selectedSet, services],
  );
  const selectedTotalMinPrice = useMemo(
    () => selectedServices.reduce((sum, item) => sum + Math.max(item.priceMin, 0), 0),
    [selectedServices],
  );
  const selectedTotalDurationMin = useMemo(
    () =>
      selectedServices.reduce((sum, item) => sum + Math.max(0, Math.round(item.durationSec / 60)), 0),
    [selectedServices],
  );

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  return (
    <>
      <div className="pb-6 pt-[188px] md:hidden">
        <div className="fixed left-1/2 top-0 z-30 w-full -translate-x-1/2 bg-screen px-4 pb-4 pt-4">
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="min-w-0 flex-1 px-2 text-center">
              <h1 className="truncate text-[24px] font-extrabold text-ink">Оказываемые услуги</h1>
              <p className="truncate text-[14px] font-semibold text-muted">{staffName}</p>
            </div>
            <div className="w-10" />
          </div>

          <label className="flex items-center gap-3 rounded-xl border-[3px] border-line bg-screen px-4 py-2 text-muted">
            <Search className="h-6 w-6 text-[#97a0ad]" />
            <input
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Поиск услуги"
              className="w-full bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:text-[#97a0ad]"
            />
          </label>

          <div className="mt-2 text-[13px] font-semibold text-muted">
            Выбрано услуг: {selectedServiceIds.length}
          </div>
        </div>

        <ul className="mt-3 space-y-3">
          {visibleGroups.map((group) => {
            const fullGroup = allGroupsById.get(group.id) || group;
            const totalInCategory = fullGroup.items.length;
            const selectedInCategory = fullGroup.items.reduce(
              (count, item) => count + (selectedSet.has(item.id) ? 1 : 0),
              0,
            );
            const categoryAllSelected =
              totalInCategory > 0 && selectedInCategory === totalInCategory;
            const categoryPartialSelected =
              selectedInCategory > 0 && selectedInCategory < totalInCategory;
            const expanded = expandedSet.has(group.id);

            return (
              <li key={group.id} className="rounded-2xl border border-line bg-screen">
                <div className="flex items-center gap-2 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onToggleCategory(group.id)}
                    className={
                      categoryAllSelected || categoryPartialSelected
                        ? 'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[#1f2937]'
                        : 'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#c5ccd7] bg-white'
                    }
                  >
                    {categoryAllSelected ? <Check className="h-3.5 w-3.5" /> : null}
                    {!categoryAllSelected && categoryPartialSelected ? (
                      <Minus className="h-3.5 w-3.5" />
                    ) : null}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleExpanded(group.id)}
                    className="flex min-w-0 flex-1 items-center justify-between text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[17px] font-semibold text-ink">
                        {group.name}
                      </span>
                      <span className="text-[12px] font-semibold text-muted">
                        {selectedInCategory}/{totalInCategory} услуг
                      </span>
                    </span>
                    {expanded ? (
                      <ChevronDown className="h-5 w-5 shrink-0 text-[#96a0ad]" />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0 text-[#96a0ad]" />
                    )}
                  </button>
                </div>

                {expanded ? (
                  <ul className="space-y-2 border-t border-line px-3 py-3">
                    {group.items.map((item) => {
                      const selected = selectedSet.has(item.id);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => onToggleService(item.id)}
                            className="flex w-full items-start gap-3 rounded-xl border border-line bg-screen px-3 py-2.5 text-left"
                          >
                            <span
                              className={
                                selected
                                  ? 'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[#1f2937]'
                                  : 'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#c5ccd7] bg-white'
                              }
                            >
                              {selected ? <Check className="h-3.5 w-3.5" /> : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-semibold text-ink">
                                {item.name}
                              </span>
                              <span className="mt-0.5 block truncate text-[12px] font-medium text-muted">
                                {item.priceMin}₽ • {formatDuration(item.durationSec)}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>

        {visibleGroups.length === 0 ? (
          <p className="mt-4 text-sm font-semibold text-muted">Услуги не найдены</p>
        ) : null}

        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="mt-5 w-full rounded-3xl bg-accent py-4 text-[22px] font-extrabold text-[#222b33] disabled:opacity-50"
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      <div className="hidden pb-6 md:block">
        <section className={DESKTOP_PANEL_CLASS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Команда</p>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                Оказываемые услуги
              </h1>
              <p className="mt-4 max-w-[760px] text-[15px] font-semibold leading-6 text-[#7c8491]">
                Назначь сотруднику услуги, с которыми он работает. Категории можно включать
                целиком или выбирать отдельные позиции вручную.
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
                onClick={onSave}
                disabled={loading}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)] disabled:opacity-60"
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className={DESKTOP_PANEL_CLASS}>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label className="flex items-center gap-3 rounded-2xl border border-[#dce2ea] bg-white px-4 py-3 text-muted">
                <Search className="h-5 w-5 text-[#97a0ad]" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Поиск услуги или категории"
                  className="w-full bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:text-[#9aa2af]"
                />
              </label>

              <div className="rounded-2xl border border-[#e5e9f0] bg-white px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">
                  Сотрудник
                </p>
                <p className="mt-2 text-sm font-extrabold text-ink">{staffName}</p>
              </div>

              <div className="rounded-2xl border border-[#e5e9f0] bg-white px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">
                  Выбрано
                </p>
                <p className="mt-2 text-sm font-extrabold text-ink">{selectedServiceIds.length} услуг</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {visibleGroups.map((group) => {
                const fullGroup = allGroupsById.get(group.id) || group;
                const totalInCategory = fullGroup.items.length;
                const selectedInCategory = fullGroup.items.reduce(
                  (count, item) => count + (selectedSet.has(item.id) ? 1 : 0),
                  0,
                );
                const categoryAllSelected =
                  totalInCategory > 0 && selectedInCategory === totalInCategory;
                const categoryPartialSelected =
                  selectedInCategory > 0 && selectedInCategory < totalInCategory;
                const expanded = expandedSet.has(group.id);

                return (
                  <section
                    key={group.id}
                    className="overflow-hidden rounded-[28px] border border-[#e5e9f0] bg-white"
                  >
                    <div className="flex items-center gap-4 bg-[#f6f8fb] px-5 py-4">
                      <button
                        type="button"
                        onClick={() => onToggleCategory(group.id)}
                        className={clsx(
                          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[#222b33] transition',
                          categoryAllSelected || categoryPartialSelected
                            ? 'border-[#f4c900] bg-[#f4c900]'
                            : 'border-[#cfd6e0] bg-white',
                        )}
                      >
                        {categoryAllSelected ? <Check className="h-4 w-4" /> : null}
                        {!categoryAllSelected && categoryPartialSelected ? (
                          <Minus className="h-4 w-4" />
                        ) : null}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpanded(group.id)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[24px] font-extrabold text-ink">{group.name}</p>
                          <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                            {selectedInCategory}/{totalInCategory} услуг выбрано
                          </p>
                        </div>
                        {expanded ? (
                          <ChevronDown className="h-5 w-5 shrink-0 text-[#96a0ad]" />
                        ) : (
                          <ChevronRight className="h-5 w-5 shrink-0 text-[#96a0ad]" />
                        )}
                      </button>
                    </div>

                    {expanded ? (
                      <div className="divide-y divide-[#edf1f5]">
                        {group.items.map((item) => {
                          const selected = selectedSet.has(item.id);

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => onToggleService(item.id)}
                              className="grid w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#fbfcfe] xl:grid-cols-[28px_minmax(0,1fr)_120px_120px]"
                            >
                              <span
                                className={clsx(
                                  'inline-flex h-7 w-7 items-center justify-center rounded-full border text-[#222b33] transition',
                                  selected ? 'border-[#f4c900] bg-[#f4c900]' : 'border-[#cfd6e0] bg-white',
                                )}
                              >
                                {selected ? <Check className="h-4 w-4" /> : null}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-[17px] font-bold text-ink">
                                  {item.name}
                                </span>
                                <span className="mt-1 block text-sm font-semibold text-[#7d8693]">
                                  {item.nameOnline || 'Без online-названия'}
                                </span>
                              </span>
                              <span className="text-sm font-bold text-ink">{item.priceMin}₽</span>
                              <span className="text-sm font-semibold text-[#5d6775]">
                                {formatDuration(item.durationSec)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })}

              {visibleGroups.length === 0 ? (
                <div className="rounded-[28px] border border-[#e5e9f0] bg-white px-6 py-12 text-center">
                  <p className="text-[28px] font-extrabold text-ink">Услуги не найдены</p>
                  <p className="mt-3 text-base font-semibold text-[#7d8693]">
                    Измени поисковый запрос или проверь выбранные категории.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <div className="space-y-5">
            <section className={DESKTOP_PANEL_CLASS}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Сводка</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">Выбрано услуг</p>
                  <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">
                    {selectedServiceIds.length}
                  </p>
                </div>
                <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">Сумма цен</p>
                  <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">
                    {selectedTotalMinPrice}₽
                  </p>
                </div>
                <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">Общая длительность</p>
                  <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">
                    {selectedTotalDurationMin} мин
                  </p>
                </div>
              </div>
            </section>

            <section className={DESKTOP_PANEL_CLASS}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Выбранные услуги</p>
              {selectedServices.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {selectedServices.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onToggleService(item.id)}
                      className="flex w-full items-start gap-3 rounded-[24px] border border-[#e5e9f0] bg-white px-4 py-3 text-left transition hover:bg-[#fbfcfe]"
                    >
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f4c900] text-[#222b33]">
                        <Check className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-extrabold text-ink">
                          {item.name}
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-[#7d8693]">
                          {item.priceMin}₽ • {formatDuration(item.durationSec)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-8 text-center">
                  <p className="text-lg font-extrabold text-ink">Пока ничего не выбрано</p>
                  <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                    Отметь услуги слева, и они сразу появятся здесь.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
