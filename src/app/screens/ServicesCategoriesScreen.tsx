import { useMemo } from 'react';
import { ArrowLeft, ChevronRight, Pencil, Plus, Search } from 'lucide-react';
import type { ServiceCategoryItem } from '../types';

type ServicesCategoriesScreenProps = {
  categories: ServiceCategoryItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onBack: () => void;
  onCreateCategory: () => void;
  onOpenCategory: (categoryId: string) => void;
  onEditCategory: (categoryId: string) => void;
};

export function ServicesCategoriesScreen({
  categories,
  search,
  onSearchChange,
  onBack,
  onCreateCategory,
  onOpenCategory,
  onEditCategory,
}: ServicesCategoriesScreenProps) {
  const totalCount = useMemo<number>(
    () => categories.reduce((sum: number, item) => sum + item.count, 0),
    [categories]
  );
  return (
    <div className="pb-4 pt-40">
      <div className="fixed left-1/2 top-0 z-30 w-full -translate-x-1/2 bg-screen px-4 pb-4 pt-4">
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-[26px] font-extrabold text-ink">Услуги</h1>
          <button type="button" onClick={onCreateCategory} className="rounded-lg p-2 text-ink">
            <Plus className="h-7 w-7" />
          </button>
        </div>

        <label className="flex items-center gap-3 rounded-xl border-[3px] border-line bg-screen px-4 py-2 text-muted">
          <Search className="h-6 w-6 text-[#97a0ad]" />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Поиск"
            className="w-full bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:text-[#97a0ad]"
          />
        </label>
      </div>

      <ul>
        {categories.map((item) => (
          <li key={item.id} className="border-b border-line py-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onOpenCategory(item.id)}
                className="flex min-w-0 flex-1 items-center justify-between text-left"
              >
                <span className="truncate text-[22px] font-medium text-ink">{item.name}</span>
                <div className="ml-3 flex items-center gap-2">
                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#e6e9ef] px-2 text-[18px] font-medium text-[#7a828f]">
                    {item.count}
                  </span>
                  <ChevronRight className="h-6 w-6 text-[#9ca5b2]" />
                </div>
              </button>
              <button
                type="button"
                onClick={() => onEditCategory(item.id)}
                className="rounded-lg p-1 text-[#7a828f]"
              >
                <Pencil className="h-6 w-6" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <span>Всего услуг: {totalCount}</span>

      {categories.length === 0 ? (
        <p className="mt-4 text-sm font-semibold text-muted">Категории не найдены</p>
      ) : null}
    </div>
  );
}
