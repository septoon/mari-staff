import { useRef, type ChangeEvent } from 'react';
import { ArrowLeft, ImagePlus, Trash2, X } from 'lucide-react';

const DESKTOP_PANEL_CLASS =
  'rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]';
const DESKTOP_INPUT_CLASS =
  'h-16 w-full rounded-[24px] border border-[#dce2ea] bg-white px-5 text-[20px] font-semibold text-ink outline-none transition placeholder:text-[#9aa2af] focus:border-[#b7c0cd]';

type ServiceCategoryEditorScreenProps = {
  title: string;
  name: string;
  imagePreviewUrl: string;
  loading: boolean;
  canDelete: boolean;
  onBack: () => void;
  onNameChange: (value: string) => void;
  onImageFilePick: (file: File) => void;
  onImageClear: () => void;
  onSave: () => void;
  onDelete: () => void;
};

export function ServiceCategoryEditorScreen({
  title,
  name,
  imagePreviewUrl,
  loading,
  canDelete,
  onBack,
  onNameChange,
  onImageFilePick,
  onImageClear,
  onSave,
  onDelete,
}: ServiceCategoryEditorScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    onImageFilePick(file);
    event.target.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
      />

      <div className="pb-6 pt-4 md:hidden">
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="truncate text-[26px] font-extrabold text-ink">{title}</h1>
          <button
            type="button"
            onClick={onDelete}
            disabled={!canDelete || loading}
            className="rounded-lg p-2 text-[#e16647] disabled:opacity-40"
          >
            <Trash2 className="h-6 w-6" />
          </button>
        </div>

        <label className="block rounded-3xl border-[2px] border-line bg-screen px-4 py-3">
          <span className="mb-1 block text-[14px] font-semibold text-muted">Название категории услуг</span>
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            className="w-full bg-transparent text-[22px] font-medium text-ink outline-none"
          />
        </label>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-44 w-full items-center justify-center overflow-hidden rounded-3xl border-[2px] border-line bg-[#eceff5] text-[#7b8290]"
          >
            {imagePreviewUrl ? (
              <img src={imagePreviewUrl} alt="Изображение категории" className="h-full w-full object-cover" />
            ) : (
              <div className="text-center">
                <ImagePlus className="mx-auto h-10 w-10" />
                <div className="mt-1 text-[16px] font-semibold">Загрузить изображение категории</div>
              </div>
            )}
          </button>
          {imagePreviewUrl ? (
            <button
              type="button"
              onClick={onImageClear}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-line px-4 py-3 text-sm font-semibold text-ink"
            >
              <X className="h-4 w-4" />
              Убрать изображение
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="mt-6 w-full rounded-3xl bg-accent py-4 text-[22px] font-extrabold text-[#222b33] disabled:opacity-50"
        >
          Сохранить
        </button>
      </div>

      <div className="hidden pb-8 pt-6 md:block">
        <section className={DESKTOP_PANEL_CLASS}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Категории услуг</p>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                {title}
              </h1>
              <p className="mt-4 max-w-[760px] text-[15px] font-semibold leading-6 text-[#7c8491]">
                Здесь задается название группы услуг. Это имя помогает быстро находить услуги и держать каталог в порядке.
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
                className="inline-flex h-12 items-center rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)] disabled:opacity-60"
              >
                Сохранить
              </button>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className={DESKTOP_PANEL_CLASS}>
            <label className="block">
              <span className="mb-3 block text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                Название категории
              </span>
              <input
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                className={DESKTOP_INPUT_CLASS}
                placeholder="Например: Маникюр"
              />
            </label>

            <div className="mt-5">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-[#8d95a1]">
                Изображение категории
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-64 w-full items-center justify-center overflow-hidden rounded-[28px] border border-[#dce2ea] bg-[#f6f8fb] text-[#7b8290]"
              >
                {imagePreviewUrl ? (
                  <img src={imagePreviewUrl} alt="Изображение категории" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center">
                    <ImagePlus className="mx-auto h-10 w-10" />
                    <div className="mt-3 text-base font-semibold">Загрузить изображение категории</div>
                  </div>
                )}
              </button>
              {imagePreviewUrl ? (
                <button
                  type="button"
                  onClick={onImageClear}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-4 py-3 text-sm font-semibold text-ink"
                >
                  <X className="h-4 w-4" />
                  Убрать изображение
                </button>
              ) : null}
            </div>

            <div className="mt-5 rounded-[24px] bg-[#f6f8fb] px-5 py-4 text-[15px] font-semibold leading-relaxed text-[#5f6773]">
              Используйте понятное название, по которому администратор сразу поймет, какие услуги лежат внутри категории.
            </div>
          </section>

          <section className={DESKTOP_PANEL_CLASS}>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Проверка перед сохранением</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[24px] bg-[#f6f8fb] px-5 py-4">
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Текущее название</p>
                <p className="mt-2 text-[28px] font-extrabold leading-none text-ink">
                  {name.trim() || 'Название не заполнено'}
                </p>
              </div>
              <div className="rounded-[24px] bg-[#fffaf0] px-5 py-4 text-[15px] font-semibold leading-relaxed text-[#6f5a23]">
                Если категория уже используется, новое название сразу отобразится в списке услуг.
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
