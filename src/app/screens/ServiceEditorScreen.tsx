import { useEffect, useMemo, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import clsx from 'clsx';
import { ArrowLeft, Check, ChevronRight, ImagePlus, Loader2, Trash2, UserRound, X } from 'lucide-react';
import { PageSheet } from '../components/shared/PageSheet';
import type { ServiceCategoryItem, ServiceDraft, StaffItem } from '../types';

const DESKTOP_PANEL_CLASS =
  'rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]';
const DESKTOP_INPUT_CLASS =
  'h-14 w-full rounded-2xl border border-[#dce2ea] bg-white px-4 text-base font-semibold text-ink outline-none transition placeholder:text-[#9aa2af] focus:border-[#b7c0cd]';

type ServiceEditorScreenProps = {
  draft: ServiceDraft;
  categories: ServiceCategoryItem[];
  providers: StaffItem[];
  assignableStaff: StaffItem[];
  providersLoading: boolean;
  loading: boolean;
  canDelete: boolean;
  onBack: () => void;
  onDraftChange: Dispatch<SetStateAction<ServiceDraft>>;
  onSave: () => void;
  onDelete: () => void;
  onAssignProviders: (staffIds: string[]) => void;
  onRemoveProvider: (staffId: string) => void;
  imagePreviewUrl: string;
  onImageFilePick: (file: File) => void;
};

export function ServiceEditorScreen({
  draft,
  categories,
  providers,
  assignableStaff,
  providersLoading,
  loading,
  canDelete,
  onBack,
  onDraftChange,
  onSave,
  onDelete,
  onAssignProviders,
  onRemoveProvider,
  imagePreviewUrl,
  onImageFilePick,
}: ServiceEditorScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [assignSheetOpen, setAssignSheetOpen] = useState(false);
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);

  const durationMin = useMemo(
    () => Math.max(5, Math.round(draft.durationSec / 60) || 5),
    [draft.durationSec],
  );

  useEffect(() => {
    if (!assignSheetOpen) {
      return;
    }
    setSelectedProviderIds(providers.map((item) => item.id));
  }, [assignSheetOpen, providers]);

  const pickImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    onImageFilePick(file);
    event.target.value = '';
  };

  const toggleProviderId = (staffId: string) => {
    setSelectedProviderIds((prev) =>
      prev.includes(staffId) ? prev.filter((item) => item !== staffId) : [...prev, staffId],
    );
  };

  const applyProviders = () => {
    onAssignProviders(selectedProviderIds);
    setAssignSheetOpen(false);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      <div className="pb-6 pt-4 md:hidden">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-[26px] font-extrabold text-ink">Услуга</h1>
          <button
            type="button"
            onClick={onDelete}
            disabled={!canDelete || loading}
            className="rounded-lg p-2 text-[#7d8491] disabled:opacity-40"
          >
            <Trash2 className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          <label className="block">
            <span className="mb-1 block text-[14px] font-semibold text-muted">Название услуги</span>
            <input
              value={draft.name}
              onChange={(event) => onDraftChange((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-3xl border-[2px] border-line bg-screen px-4 py-3 text-[22px] font-medium text-ink outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[14px] font-semibold text-muted">Категория</span>
            <div className="relative">
              <select
                value={draft.categoryId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  const nextCategory = categories.find((item) => item.id === nextId);
                  onDraftChange((prev) => ({
                    ...prev,
                    categoryId: nextId,
                    categoryName: nextCategory?.name || '',
                  }));
                }}
                className="w-full appearance-none rounded-3xl border-[2px] border-line bg-screen px-4 py-3 text-[22px] font-medium text-ink outline-none"
              >
                <option value="">Выберите категорию</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 rotate-90 text-[#8f97a3]" />
            </div>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onDraftChange((prev) => ({ ...prev, isActive: !prev.isActive }))}
              className={
                draft.isActive
                  ? 'relative h-10 w-24 rounded-full bg-accent'
                  : 'relative h-10 w-24 rounded-full bg-[#d7dce5]'
              }
            >
              <span
                className={
                  draft.isActive
                    ? 'absolute left-[54px] top-1 h-8 w-8 rounded-full bg-white'
                    : 'absolute left-1 top-1 h-8 w-8 rounded-full bg-white'
                }
              />
            </button>
            <span className="text-[22px] font-medium text-ink">Доступна для онлайн-записи</span>
          </div>

          <label className="block">
            <span className="mb-1 block text-[14px] font-semibold text-muted">Описание</span>
            <textarea
              value={draft.description}
              onChange={(event) =>
                onDraftChange((prev) => ({ ...prev, description: event.target.value }))
              }
              className="h-40 w-full rounded-3xl border-[2px] border-line bg-screen px-4 py-3 text-[20px] font-medium text-ink outline-none"
            />
          </label>

          <section className="space-y-4">
            <h2 className="text-[22px] font-extrabold text-ink">Параметры услуги</h2>
            <label className="block">
              <span className="mb-1 block text-[14px] font-semibold text-muted">Базовая цена, ₽</span>
              <input
                type="number"
                value={draft.priceMin}
                onChange={(event) => {
                  const next = Math.max(0, Number(event.target.value) || 0);
                  onDraftChange((prev) => ({ ...prev, priceMin: next, priceMax: next }));
                }}
                className="w-full rounded-2xl border-[2px] border-line bg-screen px-4 py-3 text-[20px] font-medium text-ink outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[14px] font-semibold text-muted">Длительность (мин)</span>
              <input
                type="number"
                value={durationMin}
                onChange={(event) =>
                  onDraftChange((prev) => ({
                    ...prev,
                    durationSec: Math.max(300, (Number(event.target.value) || 5) * 60),
                  }))
                }
                className="w-full rounded-2xl border-[2px] border-line bg-screen px-4 py-3 text-[20px] font-medium text-ink outline-none"
              />
            </label>
          </section>

          <button
            type="button"
            onClick={pickImage}
            className="flex h-44 w-full items-center justify-center rounded-3xl border-[2px] border-line bg-[#eceff5] text-[#7b8290]"
          >
            {imagePreviewUrl ? (
              <div className="h-full w-full overflow-hidden rounded-3xl">
                <img src={imagePreviewUrl} alt="Изображение услуги" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="text-center">
                <ImagePlus className="mx-auto h-10 w-10" />
                <div className="mt-1 text-[18px] font-semibold">Загрузить изображение</div>
                <div className="text-[14px] font-medium">Размер до 12 МБ</div>
              </div>
            )}
          </button>

          {draft.id ? (
            <section className="space-y-4 border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[22px] font-extrabold text-ink">Услугу оказывают</h2>
                {providersLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted" /> : null}
              </div>

              {providers.length === 0 && !providersLoading ? (
                <p className="text-[15px] font-medium text-muted">Нет назначенных мастеров</p>
              ) : null}

              {providers.map((person) => (
                <div key={person.id} className="space-y-3 border-b border-line pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e4e8ee]">
                      {person.avatarUrl ? (
                        <img src={person.avatarUrl} alt={person.name} className="h-full w-full object-cover" />
                      ) : (
                        <UserRound className="h-6 w-6 text-[#68768a]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-[22px] font-semibold text-ink">{person.name}</div>
                    <button
                      type="button"
                      onClick={() => onRemoveProvider(person.id)}
                      className="rounded-2xl border border-line p-3 text-[#7d8491]"
                      aria-label={`Убрать сотрудника ${person.name}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-[14px] font-semibold text-muted">Индивидуальная цена, ₽</span>
                      <input
                        readOnly
                        value={draft.priceMin}
                        className="w-full rounded-2xl border-[2px] border-line bg-screen px-4 py-3 text-[20px] font-medium text-ink outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[14px] font-semibold text-muted">Длительность</span>
                      <input
                        readOnly
                        value={`${durationMin} мин`}
                        className="w-full rounded-2xl border-[2px] border-line bg-screen px-4 py-3 text-[20px] font-medium text-ink outline-none"
                      />
                    </label>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setAssignSheetOpen(true)}
                className="w-full rounded-3xl border-2 border-accent bg-screen py-4 text-[20px] font-semibold text-[#3b4048]"
              >
                Назначить сотрудников
              </button>
            </section>
          ) : null}

          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="w-full rounded-3xl bg-accent py-4 text-[22px] font-extrabold text-[#222b33] disabled:opacity-50"
          >
            Сохранить
          </button>
        </div>
      </div>

      <div className="hidden pb-6 pt-6 md:block">
        <section className={DESKTOP_PANEL_CLASS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Услуги</p>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                {draft.name || (draft.id ? 'Редактор услуги' : 'Новая услуга')}
              </h1>
              <p className="mt-4 max-w-[760px] text-[15px] font-semibold leading-6 text-[#7c8491]">
                Настрой описание, категорию, длительность, цену и сотрудников, которые могут
                оказывать услугу.
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
              {canDelete ? (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={loading}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#f2d4d4] bg-white px-4 text-sm font-semibold text-[#a14d4d] disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </button>
              ) : null}
              <button
                type="button"
                onClick={onSave}
                disabled={loading}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)] disabled:opacity-60"
              >
                Сохранить
              </button>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
          <section className={DESKTOP_PANEL_CLASS}>
            <div className="grid gap-5 xl:grid-cols-2">
              <label className="block xl:col-span-2">
                <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                  Название услуги
                </span>
                <input
                  value={draft.name}
                  onChange={(event) => onDraftChange((prev) => ({ ...prev, name: event.target.value }))}
                  className={DESKTOP_INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                  Категория
                </span>
                <div className="relative">
                  <select
                    value={draft.categoryId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      const nextCategory = categories.find((item) => item.id === nextId);
                      onDraftChange((prev) => ({
                        ...prev,
                        categoryId: nextId,
                        categoryName: nextCategory?.name || '',
                      }));
                    }}
                    className={`${DESKTOP_INPUT_CLASS} appearance-none pr-11`}
                  >
                    <option value="">Выберите категорию</option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 rotate-90 text-[#8f97a3]" />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                  Базовая цена, ₽
                </span>
                <input
                  type="number"
                  value={draft.priceMin}
                  onChange={(event) => {
                    const next = Math.max(0, Number(event.target.value) || 0);
                    onDraftChange((prev) => ({ ...prev, priceMin: next, priceMax: next }));
                  }}
                  className={DESKTOP_INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                  Длительность, мин
                </span>
                <input
                  type="number"
                  value={durationMin}
                  onChange={(event) =>
                    onDraftChange((prev) => ({
                      ...prev,
                      durationSec: Math.max(300, (Number(event.target.value) || 5) * 60),
                    }))
                  }
                  className={DESKTOP_INPUT_CLASS}
                />
              </label>

              <label className="block xl:col-span-2">
                <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                  Описание
                </span>
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    onDraftChange((prev) => ({ ...prev, description: event.target.value }))
                  }
                  className="h-44 w-full rounded-[24px] border border-[#dce2ea] bg-white px-4 py-4 text-base font-semibold text-ink outline-none transition placeholder:text-[#9aa2af] focus:border-[#b7c0cd]"
                />
              </label>
            </div>
          </section>

          <div className="space-y-5">
            <section className={DESKTOP_PANEL_CLASS}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Изображение</p>
              <button
                type="button"
                onClick={pickImage}
                className="mt-4 flex h-[240px] w-full items-center justify-center overflow-hidden rounded-[28px] border border-[#e1e6ee] bg-[#eef2f7] text-[#7b8290]"
              >
                {imagePreviewUrl ? (
                  <img src={imagePreviewUrl} alt="Изображение услуги" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center">
                    <ImagePlus className="mx-auto h-10 w-10" />
                    <div className="mt-2 text-[18px] font-extrabold text-ink">Загрузить изображение</div>
                    <div className="mt-1 text-sm font-semibold text-[#7d8693]">Размер до 12 МБ</div>
                  </div>
                )}
              </button>
            </section>

            <section className={DESKTOP_PANEL_CLASS}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Публикация</p>
              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <div className='flex justify-between items-center'>
                    <p className="text-[24px] font-extrabold text-ink">Онлайн-запись</p>
                    <button
                      type="button"
                      onClick={() => onDraftChange((prev) => ({ ...prev, isActive: !prev.isActive }))}
                      className={clsx(
                        'relative h-8 w-16 rounded-full transition-colors',
                        draft.isActive ? 'bg-accent' : 'bg-[#d7dce5]',
                      )}
                    >
                      <span
                        className={clsx(
                          'absolute top-1 h-6 w-6 rounded-full bg-white transition-transform',
                          draft.isActive ? 'left-[36px]' : 'left-1',
                        )}
                      />
                    </button>
                  </div>
                  
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#7c8491]">
                    Управляет видимостью услуги для клиентов при самостоятельной записи.
                  </p>
                </div>
              </div>
            </section>

            {draft.id ? (
              <section className={DESKTOP_PANEL_CLASS}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Команда</p>
                    <p className="mt-3 text-[24px] font-extrabold text-ink">Исполнители услуги</p>
                  </div>
                  {providersLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted" /> : null}
                </div>

                <div className="mt-4 space-y-3">
                  {providers.length > 0 ? (
                    providers.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center gap-3 rounded-[24px] border border-[#e5e9f0] bg-white px-4 py-3"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e4e8ee]">
                          {person.avatarUrl ? (
                            <img src={person.avatarUrl} alt={person.name} className="h-full w-full object-cover" />
                          ) : (
                            <UserRound className="h-5 w-5 text-[#68768a]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-extrabold text-ink">{person.name}</p>
                          <p className="mt-1 text-sm font-semibold text-[#7d8693]">
                            {draft.priceMin} ₽, {durationMin} мин
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveProvider(person.id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] text-[#7d8491]"
                          aria-label={`Убрать сотрудника ${person.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-[#7d8693]">Нет назначенных мастеров</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setAssignSheetOpen(true)}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-extrabold text-ink transition hover:border-[#f4c900] hover:bg-[#fffbee]"
                >
                  Назначить сотрудников
                </button>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {assignSheetOpen ? (
        <div
          className="fixed inset-0 z-50 hidden items-center justify-center bg-[rgba(34,43,51,0.28)] px-6 md:flex"
          onClick={() => setAssignSheetOpen(false)}
        >
          <div
            className="w-full max-w-[640px] rounded-[32px] border border-[#dfe4ec] bg-[#f8fafc] p-6 shadow-[0_30px_80px_rgba(34,43,51,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Команда</p>
                <h3 className="mt-3 text-[34px] font-extrabold leading-none text-ink">
                  Назначить сотрудников
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignSheetOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dde3eb] bg-white text-[#6e7784]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 max-h-[52vh] space-y-2 overflow-y-auto pr-1">
              {assignableStaff.map((person) => {
                const checked = selectedProviderIds.includes(person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => toggleProviderId(person.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#e2e6ed] bg-white px-4 py-4 text-left"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e4e8ee]">
                      {person.avatarUrl ? (
                        <img src={person.avatarUrl} alt={person.name} className="h-full w-full object-cover" />
                      ) : (
                        <UserRound className="h-5 w-5 text-[#68768a]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 truncate text-base font-extrabold text-ink">{person.name}</div>
                    <div
                      className={
                        checked
                          ? 'inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-[#222b33]'
                          : 'inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#dde3eb] text-transparent'
                      }
                    >
                      <Check className="h-4 w-4" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAssignSheetOpen(false)}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#dde3eb] bg-white px-5 text-sm font-semibold text-ink"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={applyProviders}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] disabled:opacity-50"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <PageSheet
        open={assignSheetOpen}
        onDismiss={() => setAssignSheetOpen(false)}
        snapPoints={({ maxHeight }) => [Math.min(540, maxHeight - 48)]}
      >
        <div className="space-y-4 pb-4 md:hidden">
          <h3 className="text-[24px] font-extrabold text-ink">Назначить сотрудников</h3>
          <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
            {assignableStaff.map((person) => {
              const checked = selectedProviderIds.includes(person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => toggleProviderId(person.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-screen px-3 py-3 text-left"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e4e8ee]">
                    {person.avatarUrl ? (
                      <img src={person.avatarUrl} alt={person.name} className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-5 w-5 text-[#68768a]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-[18px] font-semibold text-ink">{person.name}</div>
                  <div
                    className={
                      checked
                        ? 'inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[#222b33]'
                        : 'inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-transparent'
                    }
                  >
                    <Check className="h-4 w-4" />
                  </div>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={applyProviders}
            disabled={loading}
            className="w-full rounded-3xl bg-accent py-4 text-[20px] font-extrabold text-[#222b33] disabled:opacity-50"
          >
            Применить
          </button>
        </div>
      </PageSheet>
    </>
  );
}
