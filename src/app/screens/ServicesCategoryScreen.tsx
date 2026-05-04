import { ArrowLeft, Banknote, ChevronRight, Clock3, Plus, Search } from 'lucide-react';
import { formatGroupedRub } from '../helpers';
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

const DESKTOP_PANEL_CLASS =
  'rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]';

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

function formatPrice(item: ServiceItem) {
  const priceMax = item.priceMax || item.priceMin;
  if (priceMax !== item.priceMin) {
    return `${formatGroupedRub(item.priceMin)}-${formatGroupedRub(priceMax)}`;
  }
  return formatGroupedRub(priceMax);
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
  const onlineServicesCount = services.filter((item) => item.isActive).length;
  const averagePrice =
    services.length > 0
      ? services.reduce((sum, item) => sum + Math.max(item.priceMin, 0), 0) / services.length
      : 0;

  return (
    <>
      <div className="pb-4 pt-[calc(env(safe-area-inset-top)+164px)] md:hidden">
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

      <div className="hidden pb-6 pt-6 md:block">
        <section className={DESKTOP_PANEL_CLASS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Услуги</p>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                {categoryName}
              </h1>
              <p className="mt-4 max-w-[720px] text-[15px] font-semibold leading-6 text-[#7c8491]">
                Управление услугами внутри категории: цена, длительность и переход к карточке услуги.
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
                onClick={onEditCategory}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-4 text-sm font-extrabold text-ink"
              >
                Редактировать
              </button>
              <button
                type="button"
                onClick={onCreateService}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)]"
              >
                <Plus className="h-4 w-4" />
                Услуга
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
                placeholder="Введите название услуги"
                className="w-full bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:text-[#9aa2af]"
              />
            </label>
            <div className="inline-flex h-12 items-center rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-semibold text-[#7c8491]">
              Найдено: {services.length}
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Услуг</p>
              <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{services.length}</p>
            </div>
            <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Онлайн-запись</p>
              <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{onlineServicesCount}</p>
            </div>
            <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Средняя цена</p>
              <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{formatGroupedRub(averagePrice)}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
          <div className="flex items-center justify-between gap-4 bg-[#f6f8fb] px-6 py-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Список</p>
              <h2 className="mt-2 text-[28px] font-extrabold leading-none text-ink">Услуги категории</h2>
            </div>
            <button
              type="button"
              onClick={onCreateService}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-4 text-sm font-extrabold text-ink"
            >
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          </div>

          {services.length > 0 ? (
            <div className="divide-y divide-[#edf1f5]">
              {services.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenService(item.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_150px_150px_150px_40px] items-center gap-4 px-6 py-5 text-left transition hover:bg-[#f8fafc]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[18px] font-extrabold text-ink">{item.name}</p>
                    {item.description ? (
                      <p className="mt-2 line-clamp-1 text-sm font-semibold text-[#7c8491]">{item.description}</p>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-[#9aa2af]">Описание не заполнено</p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#6f7682]">
                    <Banknote className="h-5 w-5 text-[#8892a2]" />
                    {formatPrice(item)}
                  </span>
                  <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#6f7682]">
                    <Clock3 className="h-5 w-5 text-[#8892a2]" />
                    {formatDuration(item.durationSec)}
                  </span>
                  <span className="inline-flex w-fit rounded-full border border-[#dde3eb] bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#7c8491]">
                    {item.isActive ? 'Онлайн' : 'Скрыта'}
                  </span>
                  <ChevronRight className="h-5 w-5 justify-self-end text-[#9ca5b2]" />
                </button>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-sm font-semibold text-muted">Услуги не найдены</div>
          )}
        </section>
      </div>
    </>
  );
}
