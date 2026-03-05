import { useRef, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeft, ChevronRight, ImagePlus, Trash2 } from 'lucide-react';
import type { ServiceCategoryItem, ServiceDraft } from '../types';

type ServiceEditorScreenProps = {
  draft: ServiceDraft;
  categories: ServiceCategoryItem[];
  loading: boolean;
  canDelete: boolean;
  onBack: () => void;
  onDraftChange: Dispatch<SetStateAction<ServiceDraft>>;
  onSave: () => void;
  onDelete: () => void;
  imagePreviewUrl: string;
  serverDirHint: string;
  onImageFilePick: (file: File) => void;
};

export function ServiceEditorScreen({
  draft,
  categories,
  loading,
  canDelete,
  onBack,
  onDraftChange,
  onSave,
  onDelete,
  imagePreviewUrl,
  serverDirHint,
  onImageFilePick,
}: ServiceEditorScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

      <div className="space-y-5">
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

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[14px] font-semibold text-muted">Цена от</span>
            <input
              type="number"
              value={draft.priceMin}
              onChange={(event) =>
                onDraftChange((prev) => ({ ...prev, priceMin: Number(event.target.value) || 0 }))
              }
              className="w-full rounded-2xl border-[2px] border-line bg-screen px-4 py-3 text-[20px] font-medium text-ink outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[14px] font-semibold text-muted">Цена до</span>
            <input
              type="number"
              value={draft.priceMax}
              onChange={(event) =>
                onDraftChange((prev) => ({ ...prev, priceMax: Number(event.target.value) || 0 }))
              }
              className="w-full rounded-2xl border-[2px] border-line bg-screen px-4 py-3 text-[20px] font-medium text-ink outline-none"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-[14px] font-semibold text-muted">Длительность (мин)</span>
          <input
            type="number"
            value={Math.max(0, Math.round(draft.durationSec / 60))}
            onChange={(event) =>
              onDraftChange((prev) => ({
                ...prev,
                durationSec: Math.max(0, (Number(event.target.value) || 0) * 60),
              }))
            }
            className="w-full rounded-2xl border-[2px] border-line bg-screen px-4 py-3 text-[20px] font-medium text-ink outline-none"
          />
        </label>

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
        <p className="text-[11px] font-medium text-[#8a929f]">Путь на сервере: {serverDirHint}</p>

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
  );
}
