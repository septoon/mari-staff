import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  GripVertical,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
} from 'lucide-react';
import { PrimeSwitch } from '../components/shared/PrimeSwitch';
import { PageSheet } from '../components/shared/PageSheet';
import { formatGroupedRub } from '../helpers';
import type { ServiceCategoryItem, ServiceItem } from '../types';

type ServicesCategoriesScreenProps = {
  categories: ServiceCategoryItem[];
  services: ServiceItem[];
  search: string;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onBack: () => void;
  onCreateCategory: () => void;
  onCreateServiceInCategory: (categoryId: string) => void;
  onOpenCategory: (categoryId: string) => void;
  onOpenService: (serviceId: string) => void;
  onConfigureService: (serviceId: string) => void;
  onEditCategory: (categoryId: string) => void;
  onToggleServiceActive: (serviceId: string, enabled: boolean) => Promise<void>;
};

type ServiceGroup = {
  category: ServiceCategoryItem;
  services: ServiceItem[];
  totalCount: number;
};

const DESKTOP_SERVICES_TABLE_COLUMNS =
  'minmax(320px,2.2fr) 168px 120px 150px 160px 180px 170px 56px';
const DESKTOP_SERVICES_TABLE_MIN_WIDTH = '1324px';

function formatDuration(durationSec: number) {
  if (durationSec <= 0) {
    return '0 мин';
  }
  const totalMin = Math.round(durationSec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) {
    return `${h} ч ${m} мин`;
  }
  if (h > 0) {
    return `${h} ч`;
  }
  return `${m} мин`;
}

function escapeCsvValue(value: string | number) {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const content = `\uFEFF${rows.map((row) => row.map(escapeCsvValue).join(';')).join('\n')}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function ServicesCategoriesScreen({
  categories,
  services,
  search,
  loading,
  onSearchChange,
  onBack,
  onCreateCategory,
  onCreateServiceInCategory,
  onOpenCategory,
  onOpenService,
  onConfigureService,
  onEditCategory,
  onToggleServiceActive,
}: ServicesCategoriesScreenProps) {
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [pendingServiceIds, setPendingServiceIds] = useState<string[]>([]);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const normalizedQuery = search.trim().toLowerCase();
  const servicesByCategory = useMemo(() => {
    const map = new Map<string, ServiceItem[]>();
    services.forEach((item) => {
      const bucket = map.get(item.categoryId) ?? [];
      bucket.push(item);
      map.set(item.categoryId, bucket);
    });
    map.forEach((items) => {
      items.sort((left, right) => left.name.localeCompare(right.name, 'ru'));
    });
    return map;
  }, [services]);

  const serviceGroups = useMemo<ServiceGroup[]>(() => {
    return categories
      .map((category) => {
        const categoryServices = servicesByCategory.get(category.id) ?? [];
        const categoryMatches =
          normalizedQuery.length === 0 ||
          category.name.toLowerCase().includes(normalizedQuery);
        const matchedServices =
          normalizedQuery.length === 0
            ? categoryServices
            : categoryServices.filter((item) =>
                `${item.name} ${item.nameOnline || ''} ${item.description || ''} ${item.categoryName}`
                  .toLowerCase()
                  .includes(normalizedQuery),
              );
        const visibleServices =
          normalizedQuery.length === 0
            ? categoryServices
            : categoryMatches
              ? categoryServices
              : matchedServices;

        return {
          category,
          services: visibleServices,
          totalCount: categoryServices.length,
        };
      })
      .filter(
        (group) =>
          normalizedQuery.length === 0 ||
          group.category.name.toLowerCase().includes(normalizedQuery) ||
          group.services.length > 0,
      );
  }, [categories, normalizedQuery, servicesByCategory]);

  useEffect(() => {
    if (serviceGroups.length === 0) {
      setExpandedCategoryIds([]);
      return;
    }
    if (normalizedQuery.length > 0) {
      setExpandedCategoryIds(serviceGroups.map((group) => group.category.id));
      return;
    }
    setExpandedCategoryIds((prev) => {
      const availableIds = new Set(serviceGroups.map((group) => group.category.id));
      const persisted = prev.filter((id) => availableIds.has(id));
      return persisted.length > 0 ? persisted : [serviceGroups[0].category.id];
    });
  }, [normalizedQuery, serviceGroups]);

  useEffect(() => {
    if (!exportMenuOpen) {
      return undefined;
    }
    const handleOutsideClick = (event: MouseEvent) => {
      if (exportMenuRef.current?.contains(event.target as Node)) {
        return;
      }
      setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [exportMenuOpen]);

  const totalServices = services.length;
  const onlineServicesCount = services.filter((item) => item.isActive).length;
  const averagePrice =
    services.length > 0
      ? services.reduce((sum, item) => sum + Math.max(item.priceMin, 0), 0) / services.length
      : 0;
  const totalCount = useMemo<number>(
    () => categories.reduce((sum: number, item) => sum + item.count, 0),
    [categories],
  );

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((item) => item !== categoryId)
        : [...prev, categoryId],
    );
  };

  const handleToggleService = async (serviceId: string, enabled: boolean) => {
    setPendingServiceIds((prev) => [...prev, serviceId]);
    try {
      await onToggleServiceActive(serviceId, enabled);
    } finally {
      setPendingServiceIds((prev) => prev.filter((item) => item !== serviceId));
    }
  };

  const exportCategoriesCsv = () => {
    downloadCsv('services-categories.csv', [
      ['Категория', 'Количество услуг'],
      ...categories.map((item) => [item.name, item.count]),
    ]);
    setExportMenuOpen(false);
    setMobileToolsOpen(false);
  };

  const exportServicesCsv = () => {
    downloadCsv('services.csv', [
      [
        'Категория',
        'Услуга',
        'Онлайн-запись',
        'Цена',
        'Длительность (мин)',
        'Описание',
      ],
      ...serviceGroups.flatMap((group) =>
        group.services.map((item) => [
          group.category.name,
          item.name,
          item.isActive ? 'Да' : 'Нет',
          item.priceMin,
          Math.round(item.durationSec / 60),
          item.description || '',
        ]),
      ),
    ]);
    setExportMenuOpen(false);
    setMobileToolsOpen(false);
  };

  return (
    <>
      <div className="pb-4 pt-[calc(env(safe-area-inset-top)+160px)] md:hidden">
        <div className="fixed left-1/2 top-0 z-30 w-full -translate-x-1/2 bg-screen px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-[24px] font-extrabold text-ink">Услуги</h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMobileToolsOpen(true)}
                className="rounded-lg p-2 text-ink"
                aria-label="Открыть сводку и экспорт"
              >
                <MoreVertical className="h-6 w-6" />
              </button>
              <button type="button" onClick={onCreateCategory} className="rounded-lg p-2 text-ink">
                <Plus className="h-7 w-7" />
              </button>
            </div>
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
          {serviceGroups.map((group) => (
            <li key={group.category.id} className="border-b border-line py-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOpenCategory(group.category.id)}
                  className="flex min-w-0 flex-1 items-center justify-between text-left"
                >
                  <span className="truncate text-[20px] font-medium text-ink">{group.category.name}</span>
                  <div className="ml-3 flex items-center gap-2">
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#e6e9ef] px-2 text-[16px] font-medium text-[#7a828f]">
                      {group.totalCount}
                    </span>
                    <ChevronRight className="h-6 w-6 text-[#9ca5b2]" />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onEditCategory(group.category.id)}
                  className="rounded-lg p-1 text-[#7a828f]"
                >
                  <Pencil className="h-6 w-6" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <span className="mt-4 block text-sm font-semibold text-[#6f7682]">Всего услуг: {totalCount}</span>

        {loading ? (
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загружаю услуги...
          </div>
        ) : null}

        {!loading && serviceGroups.length === 0 ? (
          <p className="mt-4 text-sm font-semibold text-muted">Категории не найдены</p>
        ) : null}
      </div>

      <PageSheet
        open={mobileToolsOpen}
        onDismiss={() => setMobileToolsOpen(false)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight, 480)]}
        defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? 0}
      >
        <div className="bg-white px-4 pb-6 pt-2 md:hidden">
          <div className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Сводка</p>
            <h2 className="mt-2 text-[24px] font-extrabold leading-none text-ink">Услуги</h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-[#e5e9f0] bg-[#fcfcfd] px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">Категорий</p>
              <p className="mt-3 text-[24px] font-extrabold leading-none text-ink">{categories.length}</p>
            </div>
            <div className="rounded-[24px] border border-[#e5e9f0] bg-[#fcfcfd] px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">Услуг</p>
              <p className="mt-3 text-[24px] font-extrabold leading-none text-ink">{totalServices}</p>
            </div>
            <div className="rounded-[24px] border border-[#e5e9f0] bg-[#fcfcfd] px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">Онлайн</p>
              <p className="mt-3 text-[24px] font-extrabold leading-none text-ink">{onlineServicesCount}</p>
            </div>

            <button
              type="button"
              onClick={exportServicesCsv}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[24px] border border-line bg-[#fcfcfd] px-4 text-[14px] font-extrabold text-ink"
            >
              <Download className="h-4 w-4" />
              Экспорт услуг CSV
            </button>
            <button
              type="button"
              onClick={exportCategoriesCsv}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[24px] border border-line bg-[#fcfcfd] px-4 text-[14px] font-extrabold text-ink"
            >
              <Download className="h-4 w-4" />
              Экспорт категорий CSV
            </button>
          </div>
        </div>
      </PageSheet>

      <div className="hidden pb-6 md:block">
        <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Настройки</p>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                Категории услуг
              </h1>
              <p className="mt-4 max-w-[700px] text-[15px] font-semibold leading-6 text-[#7c8491]">
                Управление категориями и услугами в одном месте: поиск, раскрытие категорий,
                inline-переключение онлайн-записи и быстрый переход в редактор.
              </p>
            </div>

            <div ref={exportMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen((prev) => !prev)}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-semibold text-ink"
              >
                <Download className="h-4 w-4 text-[#8892a2]" />
                Операции с Excel
                <ChevronDown className="h-4 w-4 text-[#8892a2]" />
              </button>

              {exportMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-[240px] rounded-[24px] border border-[#dde3eb] bg-white p-2 shadow-[0_24px_60px_rgba(42,49,56,0.14)]">
                  <button
                    type="button"
                    onClick={exportServicesCsv}
                    className="flex w-full items-center rounded-[18px] px-4 py-3 text-left text-sm font-semibold text-ink transition hover:bg-[#f5f8fb]"
                  >
                    Экспорт услуг CSV
                  </button>
                  <button
                    type="button"
                    onClick={exportCategoriesCsv}
                    className="flex w-full items-center rounded-[18px] px-4 py-3 text-left text-sm font-semibold text-ink transition hover:bg-[#f5f8fb]"
                  >
                    Экспорт категорий CSV
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <label className="flex items-center gap-3 rounded-2xl border border-[#dce2ea] bg-white px-4 py-3 text-muted">
              <Search className="h-5 w-5 text-[#97a0ad]" />
              <input
                type="text"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Введите название услуги или категории"
                className="w-full bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:text-[#9aa2af]"
              />
            </label>
            <button
              type="button"
              onClick={onCreateCategory}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)]"
            >
              <Plus className="h-4 w-4" />
              Создать
            </button>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-4">
            <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Категорий</p>
              <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{categories.length}</p>
            </div>
            <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Услуг</p>
              <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{totalServices}</p>
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

        {loading ? (
          <div className="mt-5 animate-pulse space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[96px] rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] shadow-[0_18px_40px_rgba(42,49,56,0.08)]"
              />
            ))}
          </div>
        ) : null}

        {!loading ? (
          <div className="mt-5 space-y-4">
            {serviceGroups.map((group) => {
              const expanded = expandedCategoryIds.includes(group.category.id);
              return (
                <section
                  key={group.category.id}
                  className="overflow-hidden rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] shadow-[0_18px_40px_rgba(42,49,56,0.08)]"
                >
                  <div className="flex items-center gap-4 bg-[#f6f8fb] px-5 py-5">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(group.category.id)}
                      className="flex min-w-0 flex-1 items-center gap-4 text-left"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7d8693] shadow-[0_8px_20px_rgba(42,49,56,0.08)]">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[28px] font-extrabold leading-none text-ink">{group.category.name}</p>
                        <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                          Содержит услуг: {group.totalCount}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditCategory(group.category.id)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dde3eb] bg-white text-[#6e7784] transition hover:text-ink"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(group.category.id)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dde3eb] bg-white text-[#6e7784] transition hover:text-ink"
                      >
                        <ChevronDown
                          className={clsx('h-5 w-5 transition-transform', expanded ? 'rotate-180' : undefined)}
                        />
                      </button>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="px-5 pb-5 pt-2">
                      <div className="overflow-x-auto overscroll-x-contain">
                        <div style={{ minWidth: DESKTOP_SERVICES_TABLE_MIN_WIDTH }}>
                          <div
                            className="grid items-center gap-4 border-b border-[#edf1f5] px-4 py-4 text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]"
                            style={{ gridTemplateColumns: DESKTOP_SERVICES_TABLE_COLUMNS }}
                          >
                            <div>Имя</div>
                            <div>Онлайн-запись</div>
                            <div>Цена</div>
                            <div>Длительность</div>
                            <div>Тех. перерыв</div>
                            <div>Тех. карта</div>
                            <div>Сотрудники</div>
                            <div />
                          </div>

                          {group.services.length > 0 ? (
                            group.services.map((service, index) => {
                              const isPending = pendingServiceIds.includes(service.id);
                              return (
                                <div
                                  key={service.id}
                                  className={clsx(
                                    'grid items-center gap-4 px-4 py-4 text-sm font-semibold text-[#55606f]',
                                    index > 0 ? 'border-t border-[#edf1f5]' : undefined,
                                  )}
                                  style={{ gridTemplateColumns: DESKTOP_SERVICES_TABLE_COLUMNS }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => onOpenService(service.id)}
                                    className="truncate text-left text-[18px] font-extrabold text-ink transition hover:text-[#2d5fd6]"
                                  >
                                    {service.name}
                                  </button>

                                  <div className="flex items-center justify-between gap-3">
                                    <PrimeSwitch
                                      checked={service.isActive}
                                      disabled={isPending}
                                      onChange={(enabled) => {
                                        void handleToggleService(service.id, enabled);
                                      }}
                                      size="lg"
                                      ariaLabel={`Онлайн-запись для услуги ${service.name}`}
                                    />
                                  </div>

                                  <div className="text-[18px] font-bold text-ink">
                                    {formatGroupedRub(service.priceMin)}
                                  </div>

                                  <div>{formatDuration(service.durationSec)}</div>

                                  <div className="text-[#7d8693]">Без перерыва</div>

                                  <button
                                    type="button"
                                    onClick={() => onOpenService(service.id)}
                                    className="truncate text-left font-bold text-[#2d5fd6] transition hover:text-[#2148a3]"
                                  >
                                    {service.description ? 'Описание заполнено' : 'Открыть редактор'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onConfigureService(service.id)}
                                    className="truncate text-left font-bold text-[#2d5fd6] transition hover:text-[#2148a3]"
                                  >
                                    Назначить
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onOpenService(service.id)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dde3eb] bg-white text-[#6e7784] transition hover:text-ink"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-4 py-8 text-center">
                              <p className="text-lg font-extrabold text-ink">В этой категории пока нет услуг</p>
                              <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                                Создай первую услугу прямо из списка.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-[#edf1f5] px-4 py-4">
                        <button
                          type="button"
                          onClick={() => onCreateServiceInCategory(group.category.id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-4 py-3 text-sm font-extrabold text-ink transition hover:border-[#f4c900] hover:bg-[#fffbee]"
                        >
                          <Plus className="h-4 w-4" />
                          Создать услугу в категории
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })}

            {!loading && serviceGroups.length === 0 ? (
              <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] px-6 py-14 text-center shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
                <p className="text-[28px] font-extrabold text-ink">Ничего не найдено</p>
                <p className="mt-3 text-base font-semibold text-[#7d8693]">
                  Попробуй другой запрос или создай новую категорию.
                </p>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
