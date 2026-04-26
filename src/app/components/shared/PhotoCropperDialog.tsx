import { useEffect, useState, type ReactNode } from 'react';
import { Check, Image as ImageIcon, Loader2, Move, X } from 'lucide-react';

export type PhotoCropAspect = {
  ratio: number;
  label: string;
  outputWidth?: number;
};

export const PHOTO_CROP_ASPECTS = {
  clientPortrait: { ratio: 4 / 5, label: 'Формат клиента 4:5', outputWidth: 1600 },
  specialistList: { ratio: 4 / 4.6, label: 'Карточка специалиста', outputWidth: 1400 },
  square: { ratio: 1, label: 'Квадратный аватар', outputWidth: 1000 },
} satisfies Record<string, PhotoCropAspect>;

type PhotoCropperOptions = {
  title: string;
  aspect: PhotoCropAspect;
  onCrop: (file: File) => void;
};

type CropRequest = PhotoCropperOptions & {
  file: File;
};

type CropSettings = {
  x: number;
  y: number;
  zoom: number;
};

function baseFileName(fileName: string) {
  return (fileName.replace(/\.[^/.]+$/, '') || 'image').replace(/[^a-z0-9_-]+/gi, '-');
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать изображение'));
    };
    image.src = url;
  });
}

function canvasToWebpBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('Не удалось подготовить изображение'));
      },
      'image/webp',
      0.92,
    );
  });
}

async function cropImageFile(file: File, aspect: PhotoCropAspect, settings: CropSettings) {
  const image = await loadImageFromFile(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error('Не удалось определить размер изображения');
  }

  const sourceRatio = sourceWidth / sourceHeight;
  const baseCrop =
    sourceRatio > aspect.ratio
      ? { width: sourceHeight * aspect.ratio, height: sourceHeight }
      : { width: sourceWidth, height: sourceWidth / aspect.ratio };
  const cropWidth = Math.min(sourceWidth, baseCrop.width / settings.zoom);
  const cropHeight = Math.min(sourceHeight, baseCrop.height / settings.zoom);
  const sourceX = Math.max(0, Math.min(sourceWidth - cropWidth, (sourceWidth - cropWidth) * (settings.x / 100)));
  const sourceY = Math.max(0, Math.min(sourceHeight - cropHeight, (sourceHeight - cropHeight) * (settings.y / 100)));
  const outputWidth = aspect.outputWidth ?? 1600;
  const outputHeight = Math.round(outputWidth / aspect.ratio);
  const canvas = document.createElement('canvas');

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Не удалось подготовить изображение');
  }

  context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);

  const blob = await canvasToWebpBlob(canvas);
  return new File([blob], `${baseFileName(file.name)}.webp`, { type: 'image/webp' });
}

function PhotoCropperDialog({
  request,
  onClose,
}: {
  request: CropRequest;
  onClose: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [settings, setSettings] = useState<CropSettings>({ x: 50, y: 50, zoom: 1 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const nextUrl = URL.createObjectURL(request.file);
    setPreviewUrl(nextUrl);
    setSettings({ x: 50, y: 50, zoom: 1 });
    setError('');
    return () => URL.revokeObjectURL(nextUrl);
  }, [request.file]);

  const applyCrop = async () => {
    setBusy(true);
    setError('');
    try {
      const cropped = await cropImageFile(request.file, request.aspect, settings);
      request.onCrop(cropped);
      onClose();
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : 'Не удалось обрезать изображение');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(20,26,34,0.48)] px-4 py-6">
      <div className="w-full max-w-[560px] rounded-[28px] border border-[#dfe4ec] bg-[#f8fafc] p-5 shadow-[0_30px_90px_rgba(20,26,34,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">{request.aspect.label}</p>
            <h3 className="mt-2 text-[26px] font-extrabold leading-none text-ink">{request.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dde3eb] bg-white text-[#6e7784]"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_180px]">
          <div
            className="relative overflow-hidden rounded-[24px] border border-[#dce2ea] bg-white"
            style={{ aspectRatio: `${request.aspect.ratio} / 1` }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={request.title}
                className="h-full w-full object-cover"
                style={{
                  objectPosition: `${settings.x}% ${settings.y}%`,
                  transform: `scale(${settings.zoom})`,
                  transformOrigin: `${settings.x}% ${settings.y}%`,
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[#8d95a1]">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 border-2 border-white/80" />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#687383]">
              Так будет видна область фото после сохранения в клиентском mari.
            </div>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-bold text-[#687383]">
                <Move className="h-4 w-4" />
                По горизонтали
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.x}
                onChange={(event) => setSettings((prev) => ({ ...prev, x: Number(event.target.value) }))}
                className="w-full accent-[#f4c900]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#687383]">По вертикали</span>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.y}
                onChange={(event) => setSettings((prev) => ({ ...prev, y: Number(event.target.value) }))}
                className="w-full accent-[#f4c900]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#687383]">Масштаб</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={settings.zoom}
                onChange={(event) => setSettings((prev) => ({ ...prev, zoom: Number(event.target.value) }))}
                className="w-full accent-[#f4c900]"
              />
            </label>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-[#f1d0c8] bg-[#fff4f0] px-4 py-3 text-sm font-semibold text-[#bc5941]">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#dde3eb] bg-white px-4 text-sm font-semibold text-ink disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              void applyCrop();
            }}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}

export function usePhotoCropper() {
  const [request, setRequest] = useState<CropRequest | null>(null);

  const openPhotoCropper = (file: File, options: PhotoCropperOptions) => {
    setRequest({ ...options, file });
  };

  const cropperDialog: ReactNode = request ? (
    <PhotoCropperDialog request={request} onClose={() => setRequest(null)} />
  ) : null;

  return { openPhotoCropper, cropperDialog };
}
