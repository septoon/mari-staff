import { ArrowLeft, Banknote, ChevronRight, Clock3, Plus, Search } from 'lucide-react';
import type { ServiceItem } from '../types';

type ServicesCategoryScreenProps = {
  categoryName: string;
  services: ServiceItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onBack: () => void;
  onCreateService: () => void;
  onOpenService: (serviceId: string) => void;
  onEditCategory: () => void;
};

function formatDuration(durationSec: number) {
  if (durationSec <= 0) {
    return '0 мин';
  }
  const totalMin = Math.round(durationSec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) {
    return `${h} ч ${m} м`;
  }
  if (h > 0) {
    return `${h} ч`;
  }
  return `${m} мин`;
}

export function ServicesCategoryScreen({
  categoryName,
  services,
  search,
  onSearchChange,
  onBack,
  onCreateService,
  onOpenService,
  onEditCategory,
}: ServicesCategoryScreenProps) {
  return (
    <div className="pb-4 pt-[calc(env(safe-area-inset-top)+164px)]">
      <div className="fixed left-1/2 top-0 z-30 w-full -translate-x-1/2 bg-screen px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <button type="button" onClick={onEditCategory} className="min-w-0 flex-1 text-left">
            <h1 className="truncate text-[24px] font-extrabold text-ink">{categoryName}</h1>
          </button>
          <button type="button" onClick={onCreateService} className="rounded-lg p-2 text-ink">
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
        {services.map((item) => (
          <li key={item.id} className="border-b border-line py-4">
            <button
              type="button"
              onClick={() => onOpenService(item.id)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[18px] font-semibold text-ink">{item.name}</p>
                <div className="mt-2 flex items-center gap-5 text-[16px] font-medium text-[#6f7682]">
                  <span className="inline-flex items-center gap-2">
                    <Banknote className="h-6 w-6" />
                    {item.priceMin}₽
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-6 w-6" />
                    {formatDuration(item.durationSec)}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-6 w-6 shrink-0 text-[#9ca5b2]" />
            </button>
          </li>
        ))}
      </ul>

      {services.length === 0 ? (
        <p className="mt-4 text-sm font-semibold text-muted">Услуги не найдены</p>
      ) : null}
    </div>
  );
}
