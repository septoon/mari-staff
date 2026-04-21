import { ArrowLeft, ChevronRight, Pencil, Search } from 'lucide-react';
import type { ServiceCategoryItem } from '../types';

type ServicesSectionScreenProps = {
  sectionName: string;
  categories: ServiceCategoryItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onBack: () => void;
  onOpenCategory: (categoryId: string) => void;
  onEditSection: () => void;
};

export function ServicesSectionScreen({
  sectionName,
  categories,
  search,
  onSearchChange,
  onBack,
  onOpenCategory,
  onEditSection,
}: ServicesSectionScreenProps) {
  return (
    <div className="pb-4 pt-[calc(env(safe-area-inset-top)+164px)]">
      <div className="fixed left-1/2 top-0 z-30 w-full -translate-x-1/2 bg-screen px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <button type="button" onClick={onEditSection} className="min-w-0 flex-1 text-left">
            <h1 className="truncate text-[24px] font-extrabold text-ink">{sectionName}</h1>
          </button>
          <button type="button" onClick={onEditSection} className="rounded-lg p-2 text-ink">
            <Pencil className="h-6 w-6" />
          </button>
        </div>

        <label className="flex items-center gap-3 rounded-xl border-[3px] border-line bg-screen px-4 py-2 text-muted">
          <Search className="h-6 w-6 text-[#97a0ad]" />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Поиск категории"
            className="w-full bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:text-[#97a0ad]"
          />
        </label>
      </div>

      <ul>
        {categories.map((item) => (
          <li key={item.id} className="border-b border-line py-4">
            <button
              type="button"
              onClick={() => onOpenCategory(item.id)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[18px] font-semibold text-ink">{item.name}</p>
                <p className="mt-1 text-[14px] font-medium text-[#6f7682]">{item.count} услуг</p>
              </div>
              <ChevronRight className="h-6 w-6 shrink-0 text-[#9ca5b2]" />
            </button>
          </li>
        ))}
      </ul>

      {categories.length === 0 ? (
        <p className="mt-4 text-sm font-semibold text-muted">Категории не найдены</p>
      ) : null}
    </div>
  );
}
