import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronRight, Minus, Search } from 'lucide-react';
import type { ServiceItem } from '../types';

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
    // Keep only existing category ids; by default all categories stay collapsed.
    const existingIds = new Set(allGroups.map((group) => group.id));
    setExpandedCategoryIds((prev) => prev.filter((id) => existingIds.has(id)));
  }, [allGroups]);

  const expandedSet = useMemo(() => new Set(expandedCategoryIds), [expandedCategoryIds]);

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  return (
    <div className="pb-6 pt-[188px]">
      <div className="fixed left-1/2 top-0 z-30 w-full max-w-[450px] -translate-x-1/2 bg-screen px-4 pb-4 pt-4">
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
  );
}
