import { useEffect, useMemo, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeft, Check, ChevronRight, ImagePlus, Loader2, Trash2, UserRound } from 'lucide-react';
import { PageSheet } from '../components/shared/PageSheet';
import type { ServiceCategoryItem, ServiceDraft, StaffItem } from '../types';

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
    <div className="pb-6 pt-4">
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileChange}
          className="hidden"
        />
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

      <PageSheet
        open={assignSheetOpen}
        onDismiss={() => setAssignSheetOpen(false)}
        snapPoints={({ maxHeight }) => [Math.min(540, maxHeight - 48)]}
      >
        <div className="space-y-4 pb-4">
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
    </div>
  );
}
