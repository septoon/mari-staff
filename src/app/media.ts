import { ApiError, api } from '../api';
import { toRecord, toString } from './helpers';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'https://api.maribeauty.ru').replace(/\/+$/, '');
const MEDIA_PUBLIC_BASE_URL = `${API_BASE_URL}/media`;

export const MEDIA_STORAGE_ROOT_DOC = '/var/lib/mari-server/media';
export const STAFF_AVATAR_MEDIA_DIR = 'specialists';
export const SERVICE_IMAGE_MEDIA_DIR = 'content/services';

type UploadScope = 'staff-avatar' | 'service-image';

export type UploadImageResult = {
  url: string;
  endpoint: string;
  objectPath: string;
  serverDirPath: string;
};

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

export function getServerMediaDirHint(scope: UploadScope, entityId: string) {
  const dir = scope === 'staff-avatar' ? STAFF_AVATAR_MEDIA_DIR : SERVICE_IMAGE_MEDIA_DIR;
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${MEDIA_STORAGE_ROOT_DOC}/${dir}/${year}/${month}/${sanitizeSegment(entityId)}/`;
}

function buildObjectPath(scope: UploadScope, entityId: string, fileNameWithoutExt: string) {
  const dir = scope === 'staff-avatar' ? STAFF_AVATAR_MEDIA_DIR : SERVICE_IMAGE_MEDIA_DIR;
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const safeEntity = sanitizeSegment(entityId);
  const safeName = sanitizeSegment(fileNameWithoutExt);
  const ts = Date.now();
  return `${dir}/${year}/${month}/${safeEntity}/${safeName}-${ts}.webp`;
}

function derivePublicUrl(pathOrUrl: string) {
  if (!pathOrUrl) {
    return '';
  }
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const cleaned = pathOrUrl.replace(/^\/+/, '');
  if (cleaned.startsWith('media/')) {
    return `${API_BASE_URL}/${cleaned}`;
  }
  return `${MEDIA_PUBLIC_BASE_URL}/${cleaned}`;
}

function extractUploadedUrl(payload: unknown, fallbackObjectPath: string) {
  const record = toRecord(payload);
  const directUrl =
    toString(record?.url) ||
    toString(record?.imageUrl) ||
    toString(record?.fileUrl) ||
    toString(record?.publicUrl);
  if (directUrl) {
    return derivePublicUrl(directUrl);
  }

  const fileRecord = toRecord(record?.file);
  const nestedUrl =
    toString(fileRecord?.url) ||
    toString(fileRecord?.publicUrl) ||
    toString(fileRecord?.imageUrl) ||
    toString(fileRecord?.path);
  if (nestedUrl) {
    return derivePublicUrl(nestedUrl);
  }

  const path =
    toString(record?.path) ||
    toString(record?.objectPath) ||
    toString(record?.key) ||
    fallbackObjectPath;

  return derivePublicUrl(path);
}

export async function convertImageFileToWebp(file: File) {
  const imageByType = file.type.startsWith('image/');
  const imageByName = /\.(png|jpe?g|gif|bmp|webp|avif|svg|tiff?|heic|heif)$/i.test(file.name);
  if (!imageByType && !imageByName) {
    throw new Error('Поддерживаются только изображения');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('Размер файла должен быть не больше 12 МБ');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      img.src = objectUrl;
    });

    const maxSize = 2200;
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas не поддерживается в браузере');
    }

    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => {
          if (!value) {
            reject(new Error('Не удалось сконвертировать изображение в WEBP'));
            return;
          }
          resolve(value);
        },
        'image/webp',
        0.9,
      );
    });

    return {
      blob,
      previewUrl: URL.createObjectURL(blob),
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function buildCandidateEndpoints(scope: UploadScope, entityId: string) {
  if (scope === 'staff-avatar') {
    return [
      `/staff/${entityId}/avatar`,
      '/media/upload',
      '/uploads/image',
    ];
  }
  return [
    `/services/${entityId}/image`,
    '/media/upload',
    '/uploads/image',
  ];
}

export async function uploadWebpImage({
  scope,
  entityId,
  webpBlob,
  originalName,
}: {
  scope: UploadScope;
  entityId: string;
  webpBlob: Blob;
  originalName: string;
}): Promise<UploadImageResult> {
  const baseName = originalName.replace(/\.[^/.]+$/, '') || 'image';
  const objectPath = buildObjectPath(scope, entityId, baseName);
  const serverDirPath = getServerMediaDirHint(scope, entityId);

  const file = new File([webpBlob], `${sanitizeSegment(baseName)}.webp`, {
    type: 'image/webp',
  });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', objectPath);
  formData.append('objectPath', objectPath);
  formData.append('folder', objectPath.split('/').slice(0, -1).join('/'));
  formData.append('scope', scope);
  formData.append('entityId', entityId);
  formData.append('format', 'webp');

  const endpoints = buildCandidateEndpoints(scope, entityId);
  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const response = await api.postForm<unknown>(endpoint, formData);
      return {
        url: extractUploadedUrl(response, objectPath),
        endpoint,
        objectPath,
        serverDirPath,
      };
    } catch (error) {
      lastError = error;
      if (
        error instanceof ApiError &&
        (error.code === 'NOT_FOUND' || error.status === 404)
      ) {
        continue;
      }
      throw error;
    }
  }

  if (
    lastError instanceof ApiError &&
    (lastError.code === 'NOT_FOUND' || lastError.status === 404)
  ) {
    throw new Error(`UPLOAD_ENDPOINT_NOT_FOUND:${serverDirPath}`);
  }

  throw lastError instanceof Error ? lastError : new Error('Не удалось загрузить изображение');
}
