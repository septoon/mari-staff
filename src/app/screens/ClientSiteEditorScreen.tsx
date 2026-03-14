import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgePercent,
  ChevronRight,
  FileText,
  Image,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Upload,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { ApiError, api } from '../../api';
import { convertImageFileToWebp, uploadWebpImage } from '../media';
import { PageSheet } from '../components/shared/PageSheet';

type ClientSiteEditorScreenProps = {
  onBack: () => void;
  onOpenServices: () => void;
};

type CategoryKey =
  | 'general'
  | 'services'
  | 'specialists'
  | 'contacts'
  | 'page'
  | 'promo'
  | 'advanced'
  | 'publish';

type PlatformInput = 'all' | 'ios' | 'android' | 'web';
type BlockType = 'BANNER' | 'TEXT' | 'BUTTONS' | 'FAQ' | 'PROMO' | 'OFFERS' | 'CONTACTS' | 'CUSTOM';

type CategoryMeta = {
  key: CategoryKey;
  title: string;
  description: string;
  note: string;
  tags: string[];
  icon: LucideIcon;
};

type BannerMessage = {
  tone: 'success' | 'error' | 'info';
  text: string;
} | null;

type AddressRecord = {
  label: string;
  line1: string;
  line2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  comment?: string;
};

type PhoneRecord = {
  label: string;
  e164: string;
  display?: string;
  ext?: string;
  primary?: boolean;
  whatsapp?: boolean;
  telegram?: boolean;
  viber?: boolean;
};

type WorkingHoursRecord = {
  dayOfWeek: number;
  open: string;
  close: string;
};

type ContactPointRecord = {
  id: string;
  name: string;
  publicName?: string;
  legalName?: string;
  aliases?: string[];
  addresses: AddressRecord[];
  phones: PhoneRecord[];
  emails?: string[];
  website?: string;
  mapUrl?: string;
  workingHours?: WorkingHoursRecord[];
  orderIndex?: number;
  isPrimary?: boolean;
  startAt?: string;
  endAt?: string;
  tags?: string[];
  note?: string;
};

type FeatureFlag = {
  defaultEnabled?: boolean;
  rules?: unknown[];
};

type ClientConfigRecord = {
  brandName: string | null;
  legalName: string | null;
  minAppVersionIos: string | null;
  minAppVersionAndroid: string | null;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  featureFlags: Record<string, FeatureFlag>;
  contacts: ContactPointRecord[];
  extra: Record<string, unknown>;
  publishedVersion: number;
  publishedAt: string | null;
};

type SpecialistPhotoRecord = {
  assetId?: string | null;
  preferredUrl?: string | null;
  originalUrl?: string | null;
};

type SpecialistServiceRecord = {
  id: string;
  name: string;
  category: {
    id: string;
    name: string;
  };
};

type SpecialistRecord = {
  staffId: string;
  name: string;
  specialty: string | null;
  info: string | null;
  ctaText: string | null;
  isVisible: boolean;
  sortOrder: number;
  photoAssetId: string | null;
  photo: SpecialistPhotoRecord | null;
  services: SpecialistServiceRecord[];
  isActive?: boolean;
};

type BlockRecord = {
  id: string;
  blockKey: string;
  blockType: BlockType;
  payload: Record<string, unknown>;
  sortOrder: number;
  isEnabled: boolean;
  platform?: PlatformInput | null;
  minAppVersion?: string | null;
  maxAppVersion?: string | null;
  startAt?: string | null;
  endAt?: string | null;
};

type ServiceRecord = {
  id: string;
  name: string;
  nameOnline: string | null;
  description: string | null;
  isActive: boolean;
  durationSec: number;
  priceMin: number;
  priceMax: number | null;
  category: {
    id: string;
    name: string;
  };
};

type ReleaseRecord = {
  id: string;
  version: number;
  blocksCount: number;
  publishedAt: string;
  publishedByStaff?: {
    id: string;
    name: string;
    role: string;
  };
};

type MediaVariantRecord = {
  id: string;
  width: number;
  url?: string;
  urlPath?: string;
};

type MediaAssetRecord = {
  id: string;
  entity: string;
  originalFileName: string;
  originalWidth: number;
  originalHeight: number;
  originalUrl?: string;
  originalUrlPath?: string;
  variants: MediaVariantRecord[];
  usagesCount?: number;
};

type MediaPickerState = {
  entity: 'specialists' | 'client-front';
  target: 'specialist-photo' | 'block-image' | 'offer-image';
  title: string;
  currentAssetId?: string | null;
  offerIndex?: number;
  search: string;
  items: MediaAssetRecord[];
  loading: boolean;
  error: string | null;
};

type PreviewRecord = {
  stage: string;
  version: number;
  config: {
    brandName?: string | null;
    legalName?: string | null;
    maintenanceMode?: boolean;
    maintenanceMessage?: string | null;
    contacts?: ContactPointRecord[];
    featureFlags?: Record<string, FeatureFlag>;
    extra?: Record<string, unknown>;
  };
  blocks: BlockRecord[];
  specialists: SpecialistRecord[];
};

type ListResponse<T> = {
  items: T[];
};

type Loadable<T> = {
  data: T | null;
  error: string | null;
};

type ScreenData = {
  config: Loadable<ClientConfigRecord>;
  blocks: Loadable<ListResponse<BlockRecord>>;
  specialists: Loadable<ListResponse<SpecialistRecord>>;
  services: Loadable<ListResponse<ServiceRecord>>;
  releases: Loadable<ListResponse<ReleaseRecord>>;
};

type CategorySnapshot = CategoryMeta & {
  stat: string;
  details: string[];
  warning?: string;
};

const CLIENT_SITE_EDITOR_BASE_ROUTE = '/online-booking';

const CATEGORY_ROUTE_SEGMENTS: Record<CategoryKey, string> = {
  general: 'osnovnoe',
  services: 'uslugi',
  specialists: 'specialisty',
  contacts: 'kontakty',
  page: 'stranica',
  promo: 'akcii',
  advanced: 'sluzhebnye-nastroyki',
  publish: 'publikatsiya',
};

type GeneralDraft = {
  brandName: string;
  legalName: string;
  minAppVersionIos: string;
  minAppVersionAndroid: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

type AdvancedDraft = {
  featureFlagsJson: string;
  extraJson: string;
};

type WorkingHoursDraft = {
  dayOfWeek: number;
  enabled: boolean;
  open: string;
  close: string;
};

type ContactEditorState = {
  mode: 'create' | 'edit';
  source: ContactPointRecord | null;
  draft: {
    id: string;
    name: string;
    publicName: string;
    legalName: string;
    aliasesText: string;
    addressLabel: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    addressComment: string;
    phoneLabel: string;
    phoneE164: string;
    phoneDisplay: string;
    phoneExt: string;
    email: string;
    website: string;
    mapUrl: string;
    orderIndex: string;
    isPrimary: boolean;
    note: string;
    tagsText: string;
    startAt: string;
    endAt: string;
    workingHours: WorkingHoursDraft[];
  };
};

type SpecialistEditorState = {
  source: SpecialistRecord;
  draft: {
    specialty: string;
    info: string;
    ctaText: string;
    isVisible: boolean;
    sortOrder: string;
    photoAssetId: string;
    photoPreviewUrl: string;
  };
};

type BlockEditorState = {
  mode: 'create' | 'edit';
  source: BlockRecord | null;
  allowedTypes: BlockType[];
  scopeTitle: string;
  draft: {
    blockKey: string;
    blockType: BlockType;
    payloadText: string;
    sortOrder: string;
    platform: PlatformInput;
    minAppVersion: string;
    maxAppVersion: string;
    startAt: string;
    endAt: string;
    isEnabled: boolean;
  };
};

const categories: CategoryMeta[] = [
  {
    key: 'general',
    title: 'Основное',
    description: 'Бренд, техработы и базовые параметры клиентского сайта.',
    note: 'Базовые настройки приложения и сайта без смешивания с контентом страницы.',
    tags: ['бренд', 'техработы', 'версии приложения'],
    icon: Settings2,
  },
  {
    key: 'services',
    title: 'Услуги',
    description: 'Витрина онлайн-записи: как существующие услуги выглядят для клиента.',
    note: 'Здесь видно, как услуги показаны клиенту. Полное редактирование самих услуг остаётся в разделе «Услуги».',
    tags: ['категории', 'название для клиента', 'цены', 'длительность'],
    icon: Wrench,
  },
  {
    key: 'specialists',
    title: 'Специалисты',
    description: 'Карточки мастеров для клиентского сайта и записи.',
    note: 'Фото, специализация, текст кнопки записи, видимость и порядок карточек для клиента.',
    tags: ['фото', 'специализация', 'видимость', 'кнопка записи'],
    icon: Users,
  },
  {
    key: 'contacts',
    title: 'Контакты',
    description: 'Точки контакта, филиалы, адреса, телефоны и часы работы.',
    note: 'Здесь же логично держать и контактные блоки страницы, если они выводятся клиенту.',
    tags: ['адреса', 'телефоны', 'карта', 'часы работы'],
    icon: MapPin,
  },
  {
    key: 'page',
    title: 'Блоки страницы',
    description: 'Обычное содержимое страницы: баннеры, тексты, кнопки и раздел «Вопросы и ответы».',
    note: 'Это основной конструктор страницы записи без промо и технастроек.',
    tags: ['баннеры', 'текстовые блоки', 'кнопки', 'вопросы и ответы'],
    icon: FileText,
  },
  {
    key: 'promo',
    title: 'Акции и предложения',
    description: 'Рекламные блоки, подборки предложений и специальные акции.',
    note: 'Маркетинговые блоки вынесены отдельно от основной структуры страницы.',
    tags: ['акции', 'предложения', 'скидки', 'спецпредложения'],
    icon: BadgePercent,
  },
  {
    key: 'advanced',
    title: 'Служебные настройки',
    description: 'Технические настройки, которые не стоит смешивать с обычным контентом.',
    note: 'Служебные переключатели, дополнительные данные, нестандартные блоки и условия показа.',
    tags: ['служебные переключатели', 'дополнительные данные', 'нестандартные блоки', 'условия показа'],
    icon: SlidersHorizontal,
  },
  {
    key: 'publish',
    title: 'Публикация',
    description: 'Предпросмотр, выпуск черновика и история опубликованных версий.',
    note: 'Финальный этап: проверить черновик, опубликовать и смотреть историю публикаций.',
    tags: ['предпросмотр', 'публикация', 'история изменений'],
    icon: Rocket,
  },
];

const sharedTools = [
  {
    title: 'Медиатека',
    description: 'Общий инструмент внутри всех мест, где выбираются изображения.',
    icon: Image,
  },
  {
    title: 'Условия показа',
    description: 'Платформа, версии приложения, даты показа и переключатель активности.',
    icon: SlidersHorizontal,
  },
] as const;

const EMPTY_SCREEN_DATA: ScreenData = {
  config: { data: null, error: null },
  blocks: { data: null, error: null },
  specialists: { data: null, error: null },
  services: { data: null, error: null },
  releases: { data: null, error: null },
};

const PLATFORM_LABELS: Record<PlatformInput, string> = {
  all: 'Все',
  ios: 'iOS',
  android: 'Android',
  web: 'Сайт',
};

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  BANNER: 'Баннер',
  TEXT: 'Текст',
  BUTTONS: 'Кнопки',
  FAQ: 'Вопросы и ответы',
  PROMO: 'Рекламный блок',
  OFFERS: 'Предложения',
  CONTACTS: 'Контакты',
  CUSTOM: 'Нестандартный блок',
};

const DAYS_ORDERED = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 0, label: 'Вс' },
] as const;

const DEFAULT_CONTACT_WORKING_HOURS: WorkingHoursDraft[] = DAYS_ORDERED.map((item) => ({
  dayOfWeek: item.value,
  enabled: false,
  open: '10:00',
  close: '20:00',
}));

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return 'Нет доступа';
    }
    if (error.status === 404) {
      return 'Раздел на сервере не найден';
    }
    return error.message || 'Ошибка API';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Не удалось выполнить действие';
}

async function safeGet<T>(path: string): Promise<Loadable<T>> {
  try {
    const data = await api.get<T>(path);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: getErrorMessage(error) };
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'не опубликовано';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'неизвестно';
  }
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  return `${Math.round(value)} ₽`;
}

function formatVersionNumber(value: number | null | undefined) {
  return `Версия ${value ?? 0}`;
}

function buildCategoryRoute(category: CategoryKey) {
  return `${CLIENT_SITE_EDITOR_BASE_ROUTE}/${CATEGORY_ROUTE_SEGMENTS[category]}`;
}

function resolveCategoryFromPath(pathname: string): CategoryKey | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === CLIENT_SITE_EDITOR_BASE_ROUTE) {
    return null;
  }
  if (!normalized.startsWith(`${CLIENT_SITE_EDITOR_BASE_ROUTE}/`)) {
    return null;
  }

  const routeSegment = normalized.slice(CLIENT_SITE_EDITOR_BASE_ROUTE.length + 1);
  const foundEntry = Object.entries(CATEGORY_ROUTE_SEGMENTS).find(([, segment]) => segment === routeSegment);
  return (foundEntry?.[0] as CategoryKey | undefined) ?? null;
}

function bannerClassName(message: BannerMessage) {
  if (!message) {
    return '';
  }
  if (message.tone === 'success') {
    return 'rounded-2xl border border-[#cfe6cf] bg-[#eef8ee] px-4 py-3 text-[15px] font-semibold text-[#2d6b34]';
  }
  if (message.tone === 'error') {
    return 'rounded-2xl border border-[#f1d1d1] bg-[#fff0f0] px-4 py-3 text-[15px] font-semibold text-[#9d3333]';
  }
  return 'rounded-2xl border border-[#d6deea] bg-[#eff4fb] px-4 py-3 text-[15px] font-semibold text-[#39516d]';
}

function formatDuration(durationSec: number | null | undefined) {
  if (typeof durationSec !== 'number' || Number.isNaN(durationSec)) {
    return '—';
  }
  return `${Math.round(durationSec / 60)} мин`;
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const offset = date.getTimezoneOffset();
  const shifted = new Date(date.getTime() - offset * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}

function toJsonText(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJsonRecord(text: string, label: string) {
  try {
    const parsed = JSON.parse(text || '{}') as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${label} должен быть JSON-объектом`);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${label}: ${error.message}`);
    }
    throw new Error(`${label}: неверный JSON`);
  }
}

function tryParseJsonRecord(text: string) {
  try {
    return parseJsonRecord(text, 'payload');
  } catch {
    return null;
  }
}

function asObjectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => asObjectRecord(item));
}

function asStringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asNumberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getMediaAssetPreviewUrl(asset: MediaAssetRecord | null | undefined) {
  if (!asset) {
    return '';
  }
  const orderedVariants = [...asset.variants].sort((left, right) => left.width - right.width);
  const preferred = orderedVariants[orderedVariants.length - 1];
  return preferred?.url || preferred?.urlPath || asset.originalUrl || asset.originalUrlPath || '';
}

function collectAssetIdsFromPayload(blockType: BlockType, payload: Record<string, unknown>) {
  const ids: string[] = [];
  const rootImageAssetId = asStringValue(payload.imageAssetId);
  if (rootImageAssetId && ['BANNER', 'PROMO'].includes(blockType)) {
    ids.push(rootImageAssetId);
  }
  if (blockType === 'OFFERS') {
    asRecordArray(payload.items).forEach((item) => {
      const assetId = asStringValue(item.imageAssetId);
      if (assetId) {
        ids.push(assetId);
      }
    });
  }
  return ids;
}

function supportsRootImage(blockType: BlockType) {
  return blockType === 'BANNER' || blockType === 'PROMO';
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9а-я_-]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'item'
  );
}

function createDefaultContactTemplate(): ContactPointRecord {
  return {
    id: `contact-${Date.now()}`,
    name: 'Новая точка',
    publicName: '',
    legalName: '',
    aliases: [],
    addresses: [
      {
        label: 'Основной адрес',
        line1: 'Улица, дом',
      },
    ],
    phones: [
      {
        label: 'Основной телефон',
        e164: '+70000000000',
      },
    ],
    emails: [],
    website: '',
    mapUrl: '',
    workingHours: [],
    orderIndex: 0,
    isPrimary: false,
    note: '',
    tags: [],
  };
}

function createDefaultBlockPayload(type: BlockType, contacts: ContactPointRecord[]) {
  switch (type) {
    case 'BANNER':
      return {
        title: 'Новый баннер',
        subtitle: 'Короткий подзаголовок',
        ctaText: 'Записаться',
        ctaUrl: 'https://example.com',
        imageAssetId: '',
      };
    case 'TEXT':
      return {
        title: 'Текстовый блок',
        body: 'Опишите, что должен увидеть клиент.',
      };
    case 'BUTTONS':
      return {
        title: 'Полезные кнопки',
        items: [
          {
            label: 'Открыть',
            url: 'https://example.com',
            style: 'primary',
          },
        ],
      };
    case 'FAQ':
      return {
        title: 'Частые вопросы',
        items: [
          {
            question: 'Как записаться?',
            answer: 'Выберите услугу, специалиста и удобное время.',
          },
        ],
      };
    case 'PROMO':
      return {
        title: 'Рекламный блок',
        description: 'Описание предложения',
        badge: 'Акция',
        ctaText: 'Получить',
        ctaUrl: 'https://example.com',
        imageAssetId: '',
      };
    case 'OFFERS':
      return {
        title: 'Подборка предложений',
        items: [
          {
            id: `offer-${Date.now()}`,
            title: 'Новое предложение',
            subtitle: 'Короткое пояснение',
            description: 'Подробнее о предложении',
            currency: 'RUB',
            originalPrice: 3500,
            finalPrice: 2900,
            ctaText: 'Записаться',
            ctaUrl: 'https://example.com',
          },
        ],
      };
    case 'CONTACTS':
      return {
        title: 'Контакты',
        items: contacts.length > 0 ? contacts : [createDefaultContactTemplate()],
      };
    case 'CUSTOM':
      return {
        code: 'custom',
      };
    default:
      return {};
  }
}

function buildWorkingHoursDraft(items: WorkingHoursRecord[] | undefined) {
  const byDay = new Map((items ?? []).map((item) => [item.dayOfWeek, item]));
  return DEFAULT_CONTACT_WORKING_HOURS.map((item) => {
    const current = byDay.get(item.dayOfWeek);
    return current
      ? {
          dayOfWeek: current.dayOfWeek,
          enabled: true,
          open: current.open,
          close: current.close,
        }
      : item;
  });
}

function createContactEditorState(contact: ContactPointRecord | null): ContactEditorState {
  const source = contact ?? createDefaultContactTemplate();
  const firstAddress = source.addresses[0] ?? createDefaultContactTemplate().addresses[0];
  const firstPhone = source.phones[0] ?? createDefaultContactTemplate().phones[0];
  return {
    mode: contact ? 'edit' : 'create',
    source: contact,
    draft: {
      id: source.id,
      name: source.name || '',
      publicName: source.publicName || '',
      legalName: source.legalName || '',
      aliasesText: (source.aliases ?? []).join(', '),
      addressLabel: firstAddress.label || '',
      addressLine1: firstAddress.line1 || '',
      addressLine2: firstAddress.line2 || '',
      city: firstAddress.city || '',
      region: firstAddress.region || '',
      postalCode: firstAddress.postalCode || '',
      country: firstAddress.country || '',
      addressComment: firstAddress.comment || '',
      phoneLabel: firstPhone.label || '',
      phoneE164: firstPhone.e164 || '',
      phoneDisplay: firstPhone.display || '',
      phoneExt: firstPhone.ext || '',
      email: source.emails?.[0] || '',
      website: source.website || '',
      mapUrl: source.mapUrl || '',
      orderIndex: String(source.orderIndex ?? 0),
      isPrimary: Boolean(source.isPrimary),
      note: source.note || '',
      tagsText: (source.tags ?? []).join(', '),
      startAt: toDateTimeLocal(source.startAt),
      endAt: toDateTimeLocal(source.endAt),
      workingHours: buildWorkingHoursDraft(source.workingHours),
    },
  };
}

function buildContactPayload(editor: ContactEditorState): ContactPointRecord {
  const draft = editor.draft;
  const source = editor.source;
  const extraAddresses = source?.addresses?.slice(1) ?? [];
  const extraPhones = source?.phones?.slice(1) ?? [];
  const extraEmails = source?.emails?.slice(1) ?? [];
  const aliases = draft.aliasesText
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const tags = draft.tagsText
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const workingHours = draft.workingHours
    .filter((item) => item.enabled && item.open && item.close)
    .map((item) => ({
      dayOfWeek: item.dayOfWeek,
      open: item.open,
      close: item.close,
    }));

  return {
    ...(source ?? {}),
    id: draft.id.trim(),
    name: draft.name.trim(),
    publicName: draft.publicName.trim() || undefined,
    legalName: draft.legalName.trim() || undefined,
    aliases: aliases.length > 0 ? aliases : undefined,
    addresses: [
      {
        ...(source?.addresses?.[0] ?? {}),
        label: draft.addressLabel.trim(),
        line1: draft.addressLine1.trim(),
        line2: draft.addressLine2.trim() || undefined,
        city: draft.city.trim() || undefined,
        region: draft.region.trim() || undefined,
        postalCode: draft.postalCode.trim() || undefined,
        country: draft.country.trim() || undefined,
        comment: draft.addressComment.trim() || undefined,
      },
      ...extraAddresses,
    ],
    phones: [
      {
        ...(source?.phones?.[0] ?? {}),
        label: draft.phoneLabel.trim(),
        e164: draft.phoneE164.trim(),
        display: draft.phoneDisplay.trim() || undefined,
        ext: draft.phoneExt.trim() || undefined,
      },
      ...extraPhones,
    ],
    emails: draft.email.trim() ? [draft.email.trim(), ...extraEmails] : extraEmails.length > 0 ? extraEmails : undefined,
    website: draft.website.trim() || undefined,
    mapUrl: draft.mapUrl.trim() || undefined,
    workingHours: workingHours.length > 0 ? workingHours : undefined,
    orderIndex: Number(draft.orderIndex) || 0,
    isPrimary: draft.isPrimary,
    startAt: fromDateTimeLocal(draft.startAt),
    endAt: fromDateTimeLocal(draft.endAt),
    tags: tags.length > 0 ? tags : undefined,
    note: draft.note.trim() || undefined,
  };
}

function createBlockEditorState(
  block: BlockRecord | null,
  allowedTypes: BlockType[],
  scopeTitle: string,
  contacts: ContactPointRecord[],
): BlockEditorState {
  const nextType = block?.blockType ?? allowedTypes[0];
  const defaultPayload = createDefaultBlockPayload(nextType, contacts);
  return {
    mode: block ? 'edit' : 'create',
    source: block,
    allowedTypes,
    scopeTitle,
    draft: {
      blockKey: block?.blockKey ?? `${nextType.toLowerCase()}-${Date.now()}`,
      blockType: nextType,
      payloadText: toJsonText(block?.payload ?? defaultPayload),
      sortOrder: String(block?.sortOrder ?? 0),
      platform: block?.platform ?? 'all',
      minAppVersion: block?.minAppVersion ?? '',
      maxAppVersion: block?.maxAppVersion ?? '',
      startAt: toDateTimeLocal(block?.startAt),
      endAt: toDateTimeLocal(block?.endAt),
      isEnabled: block?.isEnabled ?? true,
    },
  };
}

function blockTitle(block: BlockRecord) {
  const title = typeof block.payload.title === 'string' ? block.payload.title : '';
  if (title) {
    return title;
  }
  if (block.blockType === 'FAQ') {
    const items = Array.isArray(block.payload.items) ? block.payload.items : [];
    return items.length > 0 ? `Вопросы и ответы (${items.length})` : block.blockKey;
  }
  return block.blockKey;
}

function blockSubtitle(block: BlockRecord) {
  const payload = block.payload;
  if (block.blockType === 'BUTTONS') {
    const items = Array.isArray(payload.items) ? payload.items : [];
    return `Кнопок: ${items.length}`;
  }
  if (block.blockType === 'OFFERS') {
    const items = Array.isArray(payload.items) ? payload.items : [];
    return `Предложений: ${items.length}`;
  }
  if (block.blockType === 'CONTACTS') {
    const items = Array.isArray(payload.items) ? payload.items : [];
    return `Контактов в блоке: ${items.length}`;
  }
  if (typeof payload.body === 'string') {
    return payload.body.slice(0, 90);
  }
  if (typeof payload.description === 'string') {
    return payload.description.slice(0, 90);
  }
  if (typeof payload.subtitle === 'string') {
    return payload.subtitle.slice(0, 90);
  }
  return `${BLOCK_TYPE_LABELS[block.blockType]} • ${block.blockKey}`;
}

function CategorySummaryCard({
  item,
  onOpen,
}: {
  item: CategorySnapshot;
  onOpen: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group h-full w-full rounded-[28px] border border-line bg-screen p-5 text-left shadow-[0_10px_24px_rgba(42,49,56,0.06)] transition md:bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,253,0.98))] md:p-6 md:hover:-translate-y-0.5 md:hover:shadow-[0_18px_40px_rgba(42,49,56,0.12)] xl:min-h-[360px] xl:rounded-[32px] xl:p-7"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4 md:gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-ink shadow-[0_6px_16px_rgba(42,49,56,0.08)] md:h-16 md:w-16 xl:h-[72px] xl:w-[72px] xl:rounded-[24px]">
              <Icon className="h-7 w-7 md:h-8 md:w-8" strokeWidth={2.1} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-[22px] font-extrabold leading-tight text-ink xl:text-[26px]">{item.title}</h2>
              <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">
                Отвечает за
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1">
            <span className="rounded-full border border-[#d7dce5] bg-white px-3 py-1 text-[13px] font-bold text-[#586271] xl:px-3.5 xl:py-1.5">
              {item.stat}
            </span>
            <ChevronRight className="h-5 w-5 text-[#808a98] transition group-hover:translate-x-0.5" />
          </div>
        </div>

        <p className="mt-4 text-[16px] font-medium leading-relaxed text-[#5f6773] xl:mt-5 xl:text-[17px]">
          {item.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 xl:mt-5 xl:gap-2.5">
          {item.tags.map((tag) => (
            <span
              key={`${item.title}-${tag}`}
              className="rounded-full border border-[#d7dce5] bg-white px-3 py-1 text-[13px] font-bold text-[#586271]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto space-y-2 pt-4 xl:space-y-3 xl:pt-6">
          {item.details.slice(0, 2).map((line) => (
            <div
              key={`${item.title}-${line}`}
              className="rounded-2xl bg-white px-4 py-3 text-[14px] font-semibold leading-relaxed text-[#56606e] xl:px-5 xl:py-3.5"
            >
              {line}
            </div>
          ))}
        </div>

        {item.warning ? (
          <div className="mt-3 rounded-2xl border border-[#efd6b5] bg-[#fff6ea] px-4 py-3 text-[14px] font-semibold text-[#8a5f1d] xl:mt-4 xl:px-5 xl:py-3.5">
            {item.warning}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-line bg-screen p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[22px] font-extrabold text-ink">{title}</h2>
          {subtitle ? <p className="mt-1 text-[15px] font-medium leading-relaxed text-[#5f6773]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[14px] font-semibold text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border-[2px] border-line bg-white px-4 py-3 text-[17px] font-medium text-ink outline-none"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[14px] font-semibold text-muted">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border-[2px] border-line bg-white px-4 py-3 text-[16px] font-medium text-ink outline-none"
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className="flex items-center gap-3 text-left">
      <span
        className={
          checked
            ? 'relative h-9 w-20 rounded-full bg-accent'
            : 'relative h-9 w-20 rounded-full bg-[#d7dce5]'
        }
      >
        <span
          className={
            checked
              ? 'absolute left-[46px] top-1 h-7 w-7 rounded-full bg-white'
              : 'absolute left-1 top-1 h-7 w-7 rounded-full bg-white'
          }
        />
      </span>
      <span className="text-[16px] font-semibold text-ink">{label}</span>
    </button>
  );
}

export function ClientSiteEditorScreen({ onBack, onOpenServices }: ClientSiteEditorScreenProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [message, setMessage] = useState<BannerMessage>(null);
  const [screenData, setScreenData] = useState<ScreenData>(EMPTY_SCREEN_DATA);
  const [previewState, setPreviewState] = useState<Loadable<PreviewRecord>>({ data: null, error: null });
  const [generalDraft, setGeneralDraft] = useState<GeneralDraft>({
    brandName: '',
    legalName: '',
    minAppVersionIos: '',
    minAppVersionAndroid: '',
    maintenanceMode: false,
    maintenanceMessage: '',
  });
  const [advancedDraft, setAdvancedDraft] = useState<AdvancedDraft>({
    featureFlagsJson: '{}',
    extraJson: '{}',
  });
  const [contactEditor, setContactEditor] = useState<ContactEditorState | null>(null);
  const [specialistEditor, setSpecialistEditor] = useState<SpecialistEditorState | null>(null);
  const [blockEditor, setBlockEditor] = useState<BlockEditorState | null>(null);
  const [mediaPicker, setMediaPicker] = useState<MediaPickerState | null>(null);
  const [assetUrlMap, setAssetUrlMap] = useState<Record<string, string>>({});

  const config = screenData.config.data;
  const contacts = useMemo(() => config?.contacts ?? [], [config]);
  const blocks = useMemo(() => screenData.blocks.data?.items ?? [], [screenData.blocks.data]);
  const specialists = useMemo(() => screenData.specialists.data?.items ?? [], [screenData.specialists.data]);
  const services = useMemo(() => screenData.services.data?.items ?? [], [screenData.services.data]);
  const releases = useMemo(() => screenData.releases.data?.items ?? [], [screenData.releases.data]);
  const mediaPickerEntity = mediaPicker?.entity ?? null;
  const mediaPickerSearch = mediaPicker?.search ?? '';
  const activeCategory = useMemo(
    () => resolveCategoryFromPath(location.pathname),
    [location.pathname],
  );

  const setBanner = useCallback((tone: 'success' | 'error' | 'info', text: string) => {
    setMessage({ tone, text });
  }, []);

  const openCategoryPage = useCallback(
    (category: CategoryKey) => {
      navigate(buildCategoryRoute(category));
    },
    [navigate],
  );

  const closeCategoryPage = useCallback(() => {
    navigate(CLIENT_SITE_EDITOR_BASE_ROUTE);
  }, [navigate]);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    const [nextConfig, nextBlocks, nextSpecialists, nextServices, nextReleases] = await Promise.all([
      safeGet<ClientConfigRecord>('/client-front/staff/config'),
      safeGet<ListResponse<BlockRecord>>('/client-front/staff/blocks'),
      safeGet<ListResponse<SpecialistRecord>>('/client-front/staff/specialists'),
      safeGet<ListResponse<ServiceRecord>>('/services'),
      safeGet<ListResponse<ReleaseRecord>>('/client-front/staff/releases?page=1&limit=20'),
    ]);
    setScreenData({
      config: nextConfig,
      blocks: nextBlocks,
      specialists: nextSpecialists,
      services: nextServices,
      releases: nextReleases,
    });
    setLastLoadedAt(new Date());
    setLoading(false);
  }, []);

  const loadPreview = useCallback(async () => {
    setBusyKey('preview');
    const preview = await safeGet<PreviewRecord>('/client-front/staff/preview?platform=web');
    setPreviewState(preview);
    setBusyKey(null);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
    if (
      activeCategory === null &&
      normalizedPath !== CLIENT_SITE_EDITOR_BASE_ROUTE &&
      normalizedPath.startsWith(`${CLIENT_SITE_EDITOR_BASE_ROUTE}/`)
    ) {
      navigate(CLIENT_SITE_EDITOR_BASE_ROUTE, { replace: true });
    }
  }, [activeCategory, location.pathname, navigate]);

  useEffect(() => {
    if (!config) {
      return;
    }
    setGeneralDraft({
      brandName: config.brandName ?? '',
      legalName: config.legalName ?? '',
      minAppVersionIos: config.minAppVersionIos ?? '',
      minAppVersionAndroid: config.minAppVersionAndroid ?? '',
      maintenanceMode: config.maintenanceMode,
      maintenanceMessage: config.maintenanceMessage ?? '',
    });
    setAdvancedDraft({
      featureFlagsJson: toJsonText(config.featureFlags ?? {}),
      extraJson: toJsonText(config.extra ?? {}),
    });
  }, [config]);

  useEffect(() => {
    if (activeCategory === 'publish') {
      void loadPreview();
    }
  }, [activeCategory, loadPreview]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(min-width: 768px)').matches) {
      return;
    }
    if (previewState.data || previewState.error || busyKey === 'preview') {
      return;
    }
    void loadPreview();
  }, [busyKey, loadPreview, previewState.data, previewState.error]);

  useEffect(() => {
    if (!mediaPickerEntity) {
      return;
    }

    let cancelled = false;
    setMediaPicker((prev) => (prev ? { ...prev, loading: true, error: null } : prev));

    void (async () => {
      const params = new URLSearchParams({
        page: '1',
        limit: '30',
        entity: mediaPickerEntity,
      });
      if (mediaPickerSearch.trim()) {
        params.set('search', mediaPickerSearch.trim());
      }

      const response = await safeGet<ListResponse<MediaAssetRecord>>(`/client-front/staff/media?${params.toString()}`);
      if (cancelled) {
        return;
      }

      setMediaPicker((prev) =>
        prev
          ? {
              ...prev,
              items: response.data?.items ?? [],
              loading: false,
              error: response.error,
            }
          : prev,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [mediaPickerEntity, mediaPickerSearch]);

  useEffect(() => {
    const ids = new Set<string>();

    if (blockEditor) {
      const payload =
        tryParseJsonRecord(blockEditor.draft.payloadText) ??
        asObjectRecord(createDefaultBlockPayload(blockEditor.draft.blockType, contacts));
      collectAssetIdsFromPayload(blockEditor.draft.blockType, payload).forEach((id) => ids.add(id));
    }

    previewState.data?.blocks.forEach((block) => {
      collectAssetIdsFromPayload(block.blockType, asObjectRecord(block.payload)).forEach((id) => ids.add(id));
    });

    const missingIds = Array.from(ids).filter((id) => !(id in assetUrlMap));
    if (missingIds.length === 0) {
      return;
    }

    let cancelled = false;

    void Promise.all(
      missingIds.map(async (assetId) => {
        try {
          const asset = await api.get<MediaAssetRecord>(`/client-front/staff/media/${assetId}`);
          return [assetId, getMediaAssetPreviewUrl(asset)] as const;
        } catch {
          return [assetId, ''] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }
      setAssetUrlMap((prev) => {
        const next = { ...prev };
        let changed = false;
        entries.forEach(([assetId, url]) => {
          if (!(assetId in next)) {
            next[assetId] = url;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [assetUrlMap, blockEditor, contacts, previewState.data]);

  const handleRefresh = async () => {
    setMessage(null);
    await loadData();
    if (activeCategory === 'publish') {
      await loadPreview();
    }
  };

  const categorySnapshots = useMemo<CategorySnapshot[]>(() => {
    const pageBlocks = blocks.filter((block) => ['BANNER', 'TEXT', 'BUTTONS', 'FAQ'].includes(block.blockType));
    const promoBlocks = blocks.filter((block) => ['PROMO', 'OFFERS'].includes(block.blockType));
    const contactBlocks = blocks.filter((block) => block.blockType === 'CONTACTS');
    const customBlocks = blocks.filter((block) => block.blockType === 'CUSTOM');
    const blocksWithConditions = blocks.filter(
      (block) =>
        Boolean(block.platform && block.platform !== 'all') ||
        Boolean(block.minAppVersion) ||
        Boolean(block.maxAppVersion) ||
        Boolean(block.startAt) ||
        Boolean(block.endAt) ||
        !block.isEnabled,
    );
    const featureFlags = Object.entries(config?.featureFlags ?? {});
    const featureRules = featureFlags.reduce((sum, [, item]) => sum + (item.rules?.length ?? 0), 0);
    const servicesCategoriesCount = new Set(services.map((item) => item.category.id)).size;
    const activeServices = services.filter((item) => item.isActive);
    const visibleSpecialists = specialists.filter((item) => item.isVisible);
    const contactsWithHours = contacts.filter((item) => (item.workingHours?.length ?? 0) > 0);

    return categories.map((category) => {
      switch (category.key) {
        case 'general':
          return {
            ...category,
            stat: screenData.config.error ? screenData.config.error : formatVersionNumber(config?.publishedVersion),
            details: config
              ? [
                  `Бренд: ${config.brandName?.trim() || 'не задан'}`,
                  `Техработы: ${config.maintenanceMode ? 'включены' : 'выключены'}`,
                  `Минимальная версия iOS: ${config.minAppVersionIos || 'не задана'}`,
                ]
              : ['Конфигурация пока недоступна.'],
            warning: config?.maintenanceMode ? config.maintenanceMessage || 'Техработы включены без текста.' : screenData.config.error || undefined,
          };
        case 'services':
          return {
            ...category,
            stat: screenData.services.error ? screenData.services.error : `${activeServices.length}/${services.length}`,
            details: services.length
              ? [
                  `Активных услуг: ${activeServices.length}`,
                  `Категорий в витрине: ${servicesCategoriesCount}`,
                  `С отдельным названием для клиента: ${services.filter((item) => item.nameOnline).length}`,
                ]
              : ['Услуги пока не загружены.'],
            warning: screenData.services.error || undefined,
          };
        case 'specialists':
          return {
            ...category,
            stat: screenData.specialists.error ? screenData.specialists.error : `${visibleSpecialists.length}/${specialists.length}`,
            details: specialists.length
              ? [
                  `Видимых карточек: ${visibleSpecialists.length}`,
                  `С фото: ${specialists.filter((item) => item.photoAssetId).length}`,
                  `С привязанными услугами: ${specialists.filter((item) => item.services.length > 0).length}`,
                ]
              : ['Карточки специалистов пока не загружены.'],
            warning: screenData.specialists.error || undefined,
          };
        case 'contacts':
          return {
            ...category,
            stat: screenData.config.error ? screenData.config.error : `${contacts.length} точек`,
            details: contacts.length
              ? [
                  `Главных точек: ${contacts.filter((item) => item.isPrimary).length}`,
                  `С графиком работы: ${contactsWithHours.length}`,
                  `Контактных блоков: ${contactBlocks.length}`,
                ]
              : ['Контакты пока не заполнены.'],
            warning: screenData.config.error || undefined,
          };
        case 'page':
          return {
            ...category,
            stat: screenData.blocks.error ? screenData.blocks.error : `${pageBlocks.filter((item) => item.isEnabled).length}/${pageBlocks.length}`,
            details: [
              `Баннеров: ${pageBlocks.filter((item) => item.blockType === 'BANNER').length}`,
              `Текстов: ${pageBlocks.filter((item) => item.blockType === 'TEXT').length}`,
              `Блоков «Вопросы и ответы»: ${pageBlocks.filter((item) => item.blockType === 'FAQ').length}`,
            ],
            warning: screenData.blocks.error || undefined,
          };
        case 'promo':
          return {
            ...category,
            stat: screenData.blocks.error ? screenData.blocks.error : `${promoBlocks.filter((item) => item.isEnabled).length}/${promoBlocks.length}`,
            details: [
              `Рекламных блоков: ${promoBlocks.filter((item) => item.blockType === 'PROMO').length}`,
              `Подборок предложений: ${promoBlocks.filter((item) => item.blockType === 'OFFERS').length}`,
              `Активных: ${promoBlocks.filter((item) => item.isEnabled).length}`,
            ],
            warning: screenData.blocks.error || undefined,
          };
        case 'advanced':
          return {
            ...category,
            stat: screenData.config.error || screenData.blocks.error ? 'частично' : `${featureFlags.length + customBlocks.length}`,
            details: [
              `Служебных переключателей: ${featureFlags.length}`,
              `Правил показа: ${featureRules}`,
              `Нестандартных блоков: ${customBlocks.length}`,
              `Блоков с условиями: ${blocksWithConditions.length}`,
            ],
            warning: screenData.config.error || screenData.blocks.error ? 'Часть технических данных недоступна.' : undefined,
          };
        case 'publish':
          return {
            ...category,
            stat: formatVersionNumber(config?.publishedVersion),
            details: [
              `Последняя публикация: ${formatDate(config?.publishedAt)}`,
              `Публикаций в истории: ${releases.length}`,
              `Черновых блоков: ${blocks.length}`,
            ],
            warning: screenData.releases.error || undefined,
          };
        default:
          return {
            ...category,
            stat: '—',
            details: ['Нет данных'],
          };
      }
    });
  }, [blocks, config, contacts, releases, screenData.blocks.error, screenData.config.error, screenData.releases.error, screenData.services.error, screenData.specialists.error, services, specialists]);

  const activeMeta = useMemo(
    () => categories.find((item) => item.key === activeCategory) ?? null,
    [activeCategory],
  );

  const totalErrors = useMemo(
    () =>
      [
        screenData.config.error,
        screenData.blocks.error,
        screenData.specialists.error,
        screenData.services.error,
        screenData.releases.error,
      ].filter(Boolean).length,
    [screenData],
  );

  const blockPayloadDraft = useMemo<Record<string, unknown> | null>(() => {
    if (!blockEditor) {
      return null;
    }
    return (
      tryParseJsonRecord(blockEditor.draft.payloadText) ??
      asObjectRecord(createDefaultBlockPayload(blockEditor.draft.blockType, contacts))
    );
  }, [blockEditor, contacts]);

  const updateBlockPayload = useCallback(
    (updater: (payload: Record<string, unknown>) => Record<string, unknown>) => {
      setBlockEditor((prev) => {
        if (!prev) {
          return prev;
        }
        const currentPayload =
          tryParseJsonRecord(prev.draft.payloadText) ??
          asObjectRecord(createDefaultBlockPayload(prev.draft.blockType, contacts));
        return {
          ...prev,
          draft: {
            ...prev.draft,
            payloadText: toJsonText(updater(currentPayload)),
          },
        };
      });
    },
    [contacts],
  );

  const saveConfigPatch = async (payload: Record<string, unknown>, successMessage: string) => {
    setBusyKey('config');
    setMessage(null);
    try {
      await api.patch('/client-front/staff/config', payload);
      await loadData({ silent: true });
      setBanner('success', successMessage);
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const saveGeneral = async () => {
    if (
      generalDraft.minAppVersionIos.trim() &&
      !/^\d+(?:\.\d+){0,3}$/.test(generalDraft.minAppVersionIos.trim())
    ) {
      setBanner('error', 'Мин. версия iOS должна быть в формате 1.0.0');
      return;
    }
    if (
      generalDraft.minAppVersionAndroid.trim() &&
      !/^\d+(?:\.\d+){0,3}$/.test(generalDraft.minAppVersionAndroid.trim())
    ) {
      setBanner('error', 'Мин. версия Android должна быть в формате 1.0.0');
      return;
    }

    await saveConfigPatch(
      {
        brandName: generalDraft.brandName.trim(),
        legalName: generalDraft.legalName.trim(),
        maintenanceMode: generalDraft.maintenanceMode,
        maintenanceMessage: generalDraft.maintenanceMessage.trim(),
        ...(generalDraft.minAppVersionIos.trim()
          ? { minAppVersionIos: generalDraft.minAppVersionIos.trim() }
          : {}),
        ...(generalDraft.minAppVersionAndroid.trim()
          ? { minAppVersionAndroid: generalDraft.minAppVersionAndroid.trim() }
          : {}),
      },
      'Основные настройки сохранены',
    );
  };

  const saveAdvanced = async () => {
    try {
      const featureFlags = parseJsonRecord(advancedDraft.featureFlagsJson, 'Служебные переключатели');
      const extra = parseJsonRecord(advancedDraft.extraJson, 'Дополнительные данные');
      await saveConfigPatch(
        {
          featureFlags,
          extra,
        },
        'Технические настройки сохранены',
      );
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    }
  };

  const openContactEditor = (contact: ContactPointRecord | null) => {
    setMessage(null);
    setContactEditor(createContactEditorState(contact));
  };

  const saveContactEditor = async () => {
    if (!contactEditor) {
      return;
    }
    const draft = contactEditor.draft;
    if (!draft.id.trim()) {
      setBanner('error', 'У контакта должен быть id');
      return;
    }
    if (!draft.name.trim()) {
      setBanner('error', 'У контакта должно быть имя');
      return;
    }
    if (!draft.addressLabel.trim() || !draft.addressLine1.trim()) {
      setBanner('error', 'Для контакта нужен хотя бы один адрес');
      return;
    }
    if (!draft.phoneLabel.trim() || !draft.phoneE164.trim()) {
      setBanner('error', 'Для контакта нужен хотя бы один телефон');
      return;
    }
    if (!/^\+[1-9]\d{6,14}$/.test(draft.phoneE164.trim())) {
      setBanner('error', 'Телефон должен быть в формате E.164');
      return;
    }

    const nextContact = buildContactPayload(contactEditor);
    const nextContactsBase = contacts.filter((item) => item.id !== nextContact.id);
    const nextContacts = [...nextContactsBase, nextContact].sort(
      (left, right) => (left.orderIndex ?? 0) - (right.orderIndex ?? 0),
    );

    setBusyKey('contacts-save');
    setMessage(null);
    try {
      await api.patch('/client-front/staff/config', { contacts: nextContacts });
      setContactEditor(null);
      await loadData({ silent: true });
      setBanner('success', 'Контакты сохранены');
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const deleteContact = async (contactId: string) => {
    const confirmed = window.confirm('Удалить контакт?');
    if (!confirmed) {
      return;
    }
    setBusyKey(`contact-delete:${contactId}`);
    setMessage(null);
    try {
      await api.patch('/client-front/staff/config', {
        contacts: contacts.filter((item) => item.id !== contactId),
      });
      await loadData({ silent: true });
      setBanner('success', 'Контакт удалён');
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const openSpecialistEditor = (specialist: SpecialistRecord) => {
    setMessage(null);
    setSpecialistEditor({
      source: specialist,
      draft: {
        specialty: specialist.specialty ?? '',
        info: specialist.info ?? '',
        ctaText: specialist.ctaText ?? 'Записаться',
        isVisible: specialist.isVisible,
        sortOrder: String(specialist.sortOrder ?? 0),
        photoAssetId: specialist.photoAssetId ?? '',
        photoPreviewUrl: specialist.photo?.preferredUrl || specialist.photo?.originalUrl || '',
      },
    });
  };

  const openMediaPicker = (picker: Omit<MediaPickerState, 'search' | 'items' | 'loading' | 'error'>) => {
    setMessage(null);
    setMediaPicker({
      ...picker,
      search: '',
      items: [],
      loading: true,
      error: null,
    });
  };

  const saveSpecialistEditor = async () => {
    if (!specialistEditor) {
      return;
    }
    const { source, draft } = specialistEditor;
    setBusyKey(`specialist-save:${source.staffId}`);
    setMessage(null);
    try {
      await api.patch(`/client-front/staff/specialists/${source.staffId}`, {
        specialty: draft.specialty.trim() || null,
        info: draft.info.trim() || null,
        ctaText: draft.ctaText.trim() || null,
        isVisible: draft.isVisible,
        sortOrder: Number(draft.sortOrder) || 0,
        photoAssetId: draft.photoAssetId.trim() || null,
      });
      setSpecialistEditor(null);
      await loadData({ silent: true });
      setBanner('success', 'Карточка специалиста сохранена');
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const handleSpecialistPhotoSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !specialistEditor) {
      return;
    }
    setBusyKey(`specialist-photo:${specialistEditor.source.staffId}`);
    setMessage(null);
    try {
      const converted = await convertImageFileToWebp(file);
      const uploaded = await uploadWebpImage({
        scope: 'staff-avatar',
        entityId: specialistEditor.source.staffId,
        webpBlob: converted.blob,
        originalName: file.name,
      });
      const uploadedAssetId = uploaded.assetId;
      if (typeof uploadedAssetId === 'string' && uploadedAssetId) {
        setAssetUrlMap((prev) => ({ ...prev, [uploadedAssetId]: uploaded.url }));
      }
      setSpecialistEditor((prev) =>
        prev
          ? {
              ...prev,
              draft: {
                ...prev.draft,
                photoAssetId: uploaded.assetId ?? '',
                photoPreviewUrl: uploaded.url,
              },
            }
          : prev,
      );
      setBanner('success', 'Фото загружено. Не забудьте сохранить карточку.');
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const pickMediaAsset = (asset: MediaAssetRecord) => {
    if (!mediaPicker) {
      return;
    }

    const previewUrl = getMediaAssetPreviewUrl(asset);
    setAssetUrlMap((prev) => ({ ...prev, [asset.id]: previewUrl }));

    if (mediaPicker.target === 'specialist-photo') {
      setSpecialistEditor((prev) =>
        prev
          ? {
              ...prev,
              draft: {
                ...prev.draft,
                photoAssetId: asset.id,
                photoPreviewUrl: previewUrl,
              },
            }
          : prev,
      );
      setBanner('success', 'Фото выбрано. Не забудьте сохранить карточку.');
      setMediaPicker(null);
      return;
    }

    if (mediaPicker.target === 'block-image') {
      updateBlockPayload((payload) => ({
        ...payload,
        imageAssetId: asset.id,
      }));
      setBanner('success', 'Изображение выбрано. Не забудьте сохранить блок.');
      setMediaPicker(null);
      return;
    }

    updateBlockPayload((payload) => {
      const items = asRecordArray(payload.items);
      const offerIndex = mediaPicker.offerIndex ?? 0;
      const currentItem = items[offerIndex] ?? {};
      items[offerIndex] = {
        ...currentItem,
        imageAssetId: asset.id,
      };
      return {
        ...payload,
        items,
      };
    });
    setBanner('success', 'Изображение оффера выбрано. Не забудьте сохранить блок.');
    setMediaPicker(null);
  };

  const openBlockEditor = (allowedTypes: BlockType[], scopeTitle: string, block: BlockRecord | null) => {
    setMessage(null);
    setBlockEditor(createBlockEditorState(block, allowedTypes, scopeTitle, contacts));
  };

  const saveBlockEditor = async () => {
    if (!blockEditor) {
      return;
    }
    if (!blockEditor.draft.blockKey.trim()) {
      setBanner('error', 'У блока должен быть blockKey');
      return;
    }
    setBusyKey(blockEditor.mode === 'create' ? 'block-create' : `block-save:${blockEditor.source?.id ?? 'draft'}`);
    setMessage(null);
    try {
      const payload = parseJsonRecord(blockEditor.draft.payloadText, 'payload');
      const body = {
        ...(blockEditor.mode === 'create' ? { blockKey: blockEditor.draft.blockKey.trim() } : {}),
        blockType: blockEditor.draft.blockType,
        payload,
        sortOrder: Number(blockEditor.draft.sortOrder) || 0,
        platform: blockEditor.draft.platform,
        minAppVersion: blockEditor.draft.minAppVersion.trim() || undefined,
        maxAppVersion: blockEditor.draft.maxAppVersion.trim() || undefined,
        startAt: fromDateTimeLocal(blockEditor.draft.startAt),
        endAt: fromDateTimeLocal(blockEditor.draft.endAt),
        isEnabled: blockEditor.draft.isEnabled,
      };

      if (blockEditor.mode === 'create') {
        await api.post('/client-front/staff/blocks', body);
      } else if (blockEditor.source) {
        await api.patch(`/client-front/staff/blocks/${blockEditor.source.id}`, body);
      }

      setBlockEditor(null);
      await loadData({ silent: true });
      setBanner('success', 'Блок сохранён');
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const deleteBlock = async (block: BlockRecord) => {
    const confirmed = window.confirm(`Удалить блок ${block.blockKey}?`);
    if (!confirmed) {
      return;
    }
    setBusyKey(`block-delete:${block.id}`);
    setMessage(null);
    try {
      await api.delete(`/client-front/staff/blocks/${block.id}`);
      await loadData({ silent: true });
      setBanner('success', 'Блок удалён');
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const applyBlockTemplate = () => {
    setBlockEditor((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        draft: {
          ...prev.draft,
          payloadText: toJsonText(createDefaultBlockPayload(prev.draft.blockType, contacts)),
        },
      };
    });
  };

  const uploadBlockImage = async (file: File, options?: { offerIndex?: number }) => {
    if (!blockEditor) {
      return;
    }
    if (options?.offerIndex === undefined && !supportsRootImage(blockEditor.draft.blockType)) {
      setBanner('info', 'Главное изображение доступно только для баннера и рекламного блока.');
      return;
    }

    const busyState =
      options?.offerIndex === undefined ? 'block-image' : `offer-image:${options.offerIndex}`;

    setBusyKey(busyState);
    setMessage(null);
    try {
      const converted = await convertImageFileToWebp(file);
      const uploaded = await uploadWebpImage({
        scope: 'client-content',
        entityId: blockEditor.draft.blockKey || blockEditor.draft.blockType.toLowerCase(),
        webpBlob: converted.blob,
        originalName: file.name,
      });
      const uploadedAssetId = uploaded.assetId;
      if (typeof uploadedAssetId === 'string' && uploadedAssetId) {
        setAssetUrlMap((prev) => ({ ...prev, [uploadedAssetId]: uploaded.url }));
      }
      updateBlockPayload((payload) => {
        if (options?.offerIndex === undefined) {
          return {
            ...payload,
            imageAssetId: uploaded.assetId ?? '',
          };
        }

        const items = asRecordArray(payload.items);
        const currentItem = items[options.offerIndex] ?? {};
        items[options.offerIndex] = {
          ...currentItem,
          imageAssetId: uploaded.assetId ?? '',
        };
        return {
          ...payload,
          items,
        };
      });
      setBanner('success', 'Изображение загружено. Не забудьте сохранить блок.');
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const handleBlockImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    await uploadBlockImage(file);
  };

  const handleOfferImageSelect = async (event: ChangeEvent<HTMLInputElement>, offerIndex: number) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    await uploadBlockImage(file, { offerIndex });
  };

  const publishDraft = async () => {
    const confirmed = window.confirm('Опубликовать текущий черновик клиентского сайта?');
    if (!confirmed) {
      return;
    }
    setBusyKey('publish');
    setMessage(null);
    try {
      const result = await api.post<{ version: number; blocksCount: number; publishedAt: string }>(
        '/client-front/staff/publish',
        {},
      );
      await loadData({ silent: true });
      await loadPreview();
      setBanner('success', `Опубликована версия v${result.version}`);
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const renderBlockPayloadEditor = () => {
    if (!blockEditor || !blockPayloadDraft) {
      return null;
    }

    const payload = blockPayloadDraft;
    const rawJsonEditor = (
      <details
        open={blockEditor.draft.blockType === 'CUSTOM'}
        className="rounded-2xl border border-line bg-[#f4f6f9] px-4 py-4"
      >
        <summary className="cursor-pointer list-none text-[16px] font-extrabold text-ink">Технические данные (JSON)</summary>
        <textarea
          rows={blockEditor.draft.blockType === 'CUSTOM' ? 16 : 10}
          value={blockEditor.draft.payloadText}
          onChange={(event) =>
            setBlockEditor((prev) =>
              prev ? { ...prev, draft: { ...prev.draft, payloadText: event.target.value } } : prev,
            )
          }
          className="mt-3 w-full rounded-2xl border-[2px] border-line bg-white px-4 py-3 text-[14px] font-medium text-ink outline-none"
        />
      </details>
    );

    const renderRootImageCard = (title: string) => {
      const imageAssetId = asStringValue(payload.imageAssetId);
      const previewUrl = assetUrlMap[imageAssetId] ?? '';

      return (
        <div className="rounded-2xl border border-line bg-[#f4f6f9] px-4 py-4">
          <div className="flex items-start gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
              {previewUrl ? (
                <img src={previewUrl} alt={title} className="h-full w-full object-cover" />
              ) : (
                <Image className="h-8 w-8 text-[#68768a]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-extrabold text-ink">{title}</p>
              <p className="mt-1 text-[13px] font-semibold text-[#8590a0]">
                assetId: {imageAssetId || 'не выбран'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openMediaPicker({
                      entity: 'client-front',
                      target: 'block-image',
                      title,
                      currentAssetId: imageAssetId || null,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[13px] font-extrabold text-ink"
                >
                  <Image className="h-4 w-4" />
                  Медиатека
                </button>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[13px] font-extrabold text-ink">
                  <Upload className="h-4 w-4" />
                  Загрузить
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      void handleBlockImageSelect(event);
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateBlockPayload((current) => ({
                      ...current,
                      imageAssetId: '',
                    }))
                  }
                  className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[13px] font-extrabold text-ink"
                >
                  <Trash2 className="h-4 w-4" />
                  Убрать
                </button>
              </div>
              {busyKey === 'block-image' ? (
                <p className="mt-2 text-[13px] font-semibold text-[#8590a0]">Идёт загрузка изображения...</p>
              ) : null}
            </div>
          </div>
        </div>
      );
    };

    const wrapEditor = (content: React.ReactNode) => (
      <div className="space-y-4">
        {content}
        {rawJsonEditor}
      </div>
    );

    switch (blockEditor.draft.blockType) {
      case 'BANNER':
        return wrapEditor(
          <>
            <TextField
              label="Заголовок"
              value={asStringValue(payload.title)}
              onChange={(value) =>
                updateBlockPayload((current) => ({
                  ...current,
                  title: value,
                }))
              }
            />
            <TextAreaField
              label="Подзаголовок"
              value={asStringValue(payload.subtitle)}
              onChange={(value) =>
                updateBlockPayload((current) => ({
                  ...current,
                  subtitle: value,
                }))
              }
              rows={3}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Текст кнопки"
                value={asStringValue(payload.ctaText)}
                onChange={(value) =>
                  updateBlockPayload((current) => ({
                    ...current,
                    ctaText: value,
                  }))
                }
              />
              <TextField
                label="Ссылка кнопки"
                value={asStringValue(payload.ctaUrl)}
                onChange={(value) =>
                  updateBlockPayload((current) => ({
                    ...current,
                    ctaUrl: value,
                  }))
                }
                placeholder="https://example.com"
              />
            </div>
            {renderRootImageCard('Изображение баннера')}
          </>,
        );
      case 'TEXT':
        return wrapEditor(
          <>
            <TextField
              label="Заголовок"
              value={asStringValue(payload.title)}
              onChange={(value) =>
                updateBlockPayload((current) => ({
                  ...current,
                  title: value,
                }))
              }
            />
            <TextAreaField
              label="Текст"
              value={asStringValue(payload.body)}
              onChange={(value) =>
                updateBlockPayload((current) => ({
                  ...current,
                  body: value,
                }))
              }
              rows={8}
            />
          </>,
        );
      case 'BUTTONS': {
        const items = asRecordArray(payload.items);

        return wrapEditor(
          <>
            <TextField
              label="Заголовок"
              value={asStringValue(payload.title)}
              onChange={(value) =>
                updateBlockPayload((current) => ({
                  ...current,
                  title: value,
                }))
              }
            />
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={`button-${index}`} className="rounded-2xl border border-line bg-[#f4f6f9] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[16px] font-extrabold text-ink">Кнопка {index + 1}</p>
                    <button
                      type="button"
                      onClick={() =>
                        updateBlockPayload((current) => ({
                          ...current,
                          items: asRecordArray(current.items).filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                      disabled={items.length <= 1}
                      className="rounded-2xl border border-line bg-white p-3 text-[#6c7685] disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    <TextField
                      label="Текст кнопки"
                      value={asStringValue(item.label)}
                      onChange={(value) =>
                        updateBlockPayload((current) => {
                          const nextItems = asRecordArray(current.items);
                          nextItems[index] = { ...nextItems[index], label: value };
                          return { ...current, items: nextItems };
                        })
                      }
                    />
                    <TextField
                      label="Ссылка"
                      value={asStringValue(item.url)}
                      onChange={(value) =>
                        updateBlockPayload((current) => {
                          const nextItems = asRecordArray(current.items);
                          nextItems[index] = { ...nextItems[index], url: value };
                          return { ...current, items: nextItems };
                        })
                      }
                      placeholder="https://example.com"
                    />
                    <label className="block">
                      <span className="mb-1 block text-[14px] font-semibold text-muted">Стиль</span>
                      <select
                        value={asStringValue(item.style) || 'primary'}
                        onChange={(event) =>
                          updateBlockPayload((current) => {
                            const nextItems = asRecordArray(current.items);
                            nextItems[index] = { ...nextItems[index], style: event.target.value };
                            return { ...current, items: nextItems };
                          })
                        }
                        className="w-full rounded-2xl border-[2px] border-line bg-white px-4 py-3 text-[17px] font-medium text-ink outline-none"
                      >
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="ghost">Ghost</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                updateBlockPayload((current) => ({
                  ...current,
                  items: [
                    ...asRecordArray(current.items),
                    {
                      label: 'Новая кнопка',
                      url: 'https://example.com',
                      style: 'primary',
                    },
                  ],
                }))
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink"
            >
              <Plus className="h-4 w-4" />
              Добавить кнопку
            </button>
          </>,
        );
      }
      case 'FAQ': {
        const items = asRecordArray(payload.items);

        return wrapEditor(
          <>
            <TextField
              label="Заголовок"
              value={asStringValue(payload.title)}
              onChange={(value) =>
                updateBlockPayload((current) => ({
                  ...current,
                  title: value,
                }))
              }
            />
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={`faq-${index}`} className="rounded-2xl border border-line bg-[#f4f6f9] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[16px] font-extrabold text-ink">Вопрос {index + 1}</p>
                    <button
                      type="button"
                      onClick={() =>
                        updateBlockPayload((current) => ({
                          ...current,
                          items: asRecordArray(current.items).filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                      disabled={items.length <= 1}
                      className="rounded-2xl border border-line bg-white p-3 text-[#6c7685] disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    <TextField
                      label="Вопрос"
                      value={asStringValue(item.question)}
                      onChange={(value) =>
                        updateBlockPayload((current) => {
                          const nextItems = asRecordArray(current.items);
                          nextItems[index] = { ...nextItems[index], question: value };
                          return { ...current, items: nextItems };
                        })
                      }
                    />
                    <TextAreaField
                      label="Ответ"
                      value={asStringValue(item.answer)}
                      onChange={(value) =>
                        updateBlockPayload((current) => {
                          const nextItems = asRecordArray(current.items);
                          nextItems[index] = { ...nextItems[index], answer: value };
                          return { ...current, items: nextItems };
                        })
                      }
                      rows={4}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                updateBlockPayload((current) => ({
                  ...current,
                  items: [
                    ...asRecordArray(current.items),
                    {
                      question: 'Новый вопрос',
                      answer: 'Короткий ответ',
                    },
                  ],
                }))
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink"
            >
              <Plus className="h-4 w-4" />
              Добавить вопрос
            </button>
          </>,
        );
      }
      case 'PROMO':
        return wrapEditor(
          <>
            <TextField
              label="Заголовок"
              value={asStringValue(payload.title)}
              onChange={(value) =>
                updateBlockPayload((current) => ({
                  ...current,
                  title: value,
                }))
              }
            />
            <TextAreaField
              label="Описание"
              value={asStringValue(payload.description)}
              onChange={(value) =>
                updateBlockPayload((current) => ({
                  ...current,
                  description: value,
                }))
              }
              rows={5}
            />
            <TextField
              label="Бейдж"
              value={asStringValue(payload.badge)}
              onChange={(value) =>
                updateBlockPayload((current) => ({
                  ...current,
                  badge: value,
                }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Текст кнопки"
                value={asStringValue(payload.ctaText)}
                onChange={(value) =>
                  updateBlockPayload((current) => ({
                    ...current,
                    ctaText: value,
                  }))
                }
              />
              <TextField
                label="Ссылка кнопки"
                value={asStringValue(payload.ctaUrl)}
                onChange={(value) =>
                  updateBlockPayload((current) => ({
                    ...current,
                    ctaUrl: value,
                  }))
                }
                placeholder="https://example.com"
              />
            </div>
            {renderRootImageCard('Изображение promo-блока')}
          </>,
        );
      case 'OFFERS': {
        const items = asRecordArray(payload.items);

        return wrapEditor(
          <>
            <TextField
              label="Заголовок"
              value={asStringValue(payload.title)}
              onChange={(value) =>
                updateBlockPayload((current) => ({
                  ...current,
                  title: value,
                }))
              }
            />
            <div className="space-y-3">
              {items.map((item, index) => {
                const imageAssetId = asStringValue(item.imageAssetId);
                const previewUrl = assetUrlMap[imageAssetId] ?? '';
                return (
                  <div key={`offer-${index}`} className="rounded-2xl border border-line bg-[#f4f6f9] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[16px] font-extrabold text-ink">Предложение {index + 1}</p>
                      <button
                        type="button"
                        onClick={() =>
                          updateBlockPayload((current) => ({
                            ...current,
                            items: asRecordArray(current.items).filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                        disabled={items.length <= 1}
                        className="rounded-2xl border border-line bg-white p-3 text-[#6c7685] disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextField
                          label="ID"
                          value={asStringValue(item.id)}
                          onChange={(value) =>
                            updateBlockPayload((current) => {
                              const nextItems = asRecordArray(current.items);
                              nextItems[index] = { ...nextItems[index], id: slugify(value) };
                              return { ...current, items: nextItems };
                            })
                          }
                        />
                        <TextField
                          label="Заголовок"
                          value={asStringValue(item.title)}
                          onChange={(value) =>
                            updateBlockPayload((current) => {
                              const nextItems = asRecordArray(current.items);
                              nextItems[index] = { ...nextItems[index], title: value };
                              return { ...current, items: nextItems };
                            })
                          }
                        />
                      </div>

                      <TextField
                        label="Подзаголовок"
                        value={asStringValue(item.subtitle)}
                        onChange={(value) =>
                          updateBlockPayload((current) => {
                            const nextItems = asRecordArray(current.items);
                            nextItems[index] = { ...nextItems[index], subtitle: value };
                            return { ...current, items: nextItems };
                          })
                        }
                      />
                      <TextAreaField
                        label="Описание"
                        value={asStringValue(item.description)}
                        onChange={(value) =>
                          updateBlockPayload((current) => {
                            const nextItems = asRecordArray(current.items);
                            nextItems[index] = { ...nextItems[index], description: value };
                            return { ...current, items: nextItems };
                          })
                        }
                        rows={4}
                      />

                      <div className="grid gap-3 sm:grid-cols-3">
                        <TextField
                          label="Валюта"
                          value={asStringValue(item.currency) || 'RUB'}
                          onChange={(value) =>
                            updateBlockPayload((current) => {
                              const nextItems = asRecordArray(current.items);
                              nextItems[index] = { ...nextItems[index], currency: value.toUpperCase() || 'RUB' };
                              return { ...current, items: nextItems };
                            })
                          }
                        />
                        <TextField
                          label="Старая цена"
                          value={asNumberValue(item.originalPrice)?.toString() ?? ''}
                          onChange={(value) =>
                            updateBlockPayload((current) => {
                              const nextItems = asRecordArray(current.items);
                              nextItems[index] = {
                                ...nextItems[index],
                                originalPrice: value.trim() ? Number(value) : undefined,
                              };
                              return { ...current, items: nextItems };
                            })
                          }
                          type="number"
                        />
                        <TextField
                          label="Новая цена"
                          value={asNumberValue(item.finalPrice)?.toString() ?? ''}
                          onChange={(value) =>
                            updateBlockPayload((current) => {
                              const nextItems = asRecordArray(current.items);
                              nextItems[index] = {
                                ...nextItems[index],
                                finalPrice: value.trim() ? Number(value) : undefined,
                              };
                              return { ...current, items: nextItems };
                            })
                          }
                          type="number"
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextField
                          label="Текст кнопки"
                          value={asStringValue(item.ctaText)}
                          onChange={(value) =>
                            updateBlockPayload((current) => {
                              const nextItems = asRecordArray(current.items);
                              nextItems[index] = { ...nextItems[index], ctaText: value };
                              return { ...current, items: nextItems };
                            })
                          }
                        />
                        <TextField
                          label="Ссылка кнопки"
                          value={asStringValue(item.ctaUrl)}
                          onChange={(value) =>
                            updateBlockPayload((current) => {
                              const nextItems = asRecordArray(current.items);
                              nextItems[index] = { ...nextItems[index], ctaUrl: value };
                              return { ...current, items: nextItems };
                            })
                          }
                          placeholder="https://example.com"
                        />
                      </div>

                      <div className="rounded-2xl border border-line bg-white px-4 py-4">
                        <div className="flex items-start gap-4">
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#f4f6f9]">
                            {previewUrl ? (
                              <img src={previewUrl} alt={asStringValue(item.title) || `Предложение ${index + 1}`} className="h-full w-full object-cover" />
                            ) : (
                              <Image className="h-7 w-7 text-[#68768a]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-extrabold text-ink">Изображение предложения</p>
                            <p className="mt-1 text-[13px] font-semibold text-[#8590a0]">
                              assetId: {imageAssetId || 'не выбран'}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openMediaPicker({
                                    entity: 'client-front',
                                    target: 'offer-image',
                                    title: `Изображение оффера ${index + 1}`,
                                    offerIndex: index,
                                    currentAssetId: imageAssetId || null,
                                  })
                                }
                                className="inline-flex items-center gap-2 rounded-2xl border border-line bg-[#f4f6f9] px-3 py-2 text-[13px] font-extrabold text-ink"
                              >
                                <Image className="h-4 w-4" />
                                Медиатека
                              </button>
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-line bg-[#f4f6f9] px-3 py-2 text-[13px] font-extrabold text-ink">
                                <Upload className="h-4 w-4" />
                                Загрузить
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(event) => {
                                    void handleOfferImageSelect(event, index);
                                  }}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateBlockPayload((current) => {
                                    const nextItems = asRecordArray(current.items);
                                    nextItems[index] = { ...nextItems[index], imageAssetId: '' };
                                    return { ...current, items: nextItems };
                                  })
                                }
                                className="inline-flex items-center gap-2 rounded-2xl border border-line bg-[#f4f6f9] px-3 py-2 text-[13px] font-extrabold text-ink"
                              >
                                <Trash2 className="h-4 w-4" />
                                Убрать
                              </button>
                            </div>
                            {busyKey === `offer-image:${index}` ? (
                              <p className="mt-2 text-[13px] font-semibold text-[#8590a0]">Идёт загрузка изображения...</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                updateBlockPayload((current) => ({
                  ...current,
                  items: [
                    ...asRecordArray(current.items),
                    {
                      id: `offer-${Date.now()}`,
                      title: 'Новое предложение',
                      subtitle: '',
                      description: '',
                      currency: 'RUB',
                      originalPrice: undefined,
                      finalPrice: undefined,
                      ctaText: 'Записаться',
                      ctaUrl: 'https://example.com',
                      imageAssetId: '',
                    },
                  ],
                }))
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink"
            >
              <Plus className="h-4 w-4" />
              Добавить оффер
            </button>
          </>,
        );
      }
      case 'CONTACTS': {
        const items = asRecordArray(payload.items);
        const selectedIds = new Set(items.map((item) => asStringValue(item.id)).filter(Boolean));
        const availableContacts = contacts.filter((contact) => !selectedIds.has(contact.id));

        return wrapEditor(
          <>
            <TextField
              label="Заголовок"
              value={asStringValue(payload.title)}
              onChange={(value) =>
                updateBlockPayload((current) => ({
                  ...current,
                  title: value,
                }))
              }
            />
            <div className="rounded-2xl border border-line bg-[#f4f6f9] px-4 py-4">
              <p className="text-[16px] font-extrabold text-ink">Состав блока</p>
              <p className="mt-2 text-[13px] font-semibold leading-relaxed text-[#7c8593]">
                Блок хранит snapshot контактов. Для быстрого обновления можно подтянуть текущие точки контакта из конфигурации.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateBlockPayload((current) => ({
                      ...current,
                      items: contacts.map((contact) => ({ ...contact })),
                    }))
                  }
                  disabled={contacts.length === 0}
                  className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[13px] font-extrabold text-ink disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Подтянуть все точки
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const address = asRecordArray(item.addresses)[0] ?? {};
                const phone = asRecordArray(item.phones)[0] ?? {};
                return (
                  <div key={`contact-block-${asStringValue(item.id) || index}`} className="rounded-2xl border border-line bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[17px] font-extrabold text-ink">{asStringValue(item.name) || `Контакт ${index + 1}`}</p>
                        <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                          {asStringValue(address.line1) || 'Адрес не задан'} • {asStringValue(phone.e164) || 'Телефон не задан'}
                        </p>
                        <p className="mt-2 text-[13px] font-semibold text-[#8590a0]">id: {asStringValue(item.id) || '—'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateBlockPayload((current) => ({
                            ...current,
                            items: asRecordArray(current.items).filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                        disabled={items.length <= 1}
                        className="rounded-2xl border border-line p-3 text-[#6c7685] disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {availableContacts.length > 0 ? (
              <div className="rounded-2xl border border-line bg-[#f4f6f9] px-4 py-4">
                <p className="text-[16px] font-extrabold text-ink">Добавить из точек контакта</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() =>
                        updateBlockPayload((current) => ({
                          ...current,
                          items: [...asRecordArray(current.items), { ...contact }],
                        }))
                      }
                      className="rounded-2xl border border-line bg-white px-3 py-2 text-[13px] font-extrabold text-ink"
                    >
                      {contact.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>,
        );
      }
      case 'CUSTOM':
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-[#f4f6f9] px-4 py-4 text-[14px] font-semibold leading-relaxed text-[#5f6773]">
              Для нестандартных блоков сохраняем прямое редактирование данных в формате JSON.
            </div>
            {rawJsonEditor}
          </div>
        );
      default:
        return rawJsonEditor;
    }
  };

  const renderBlockManager = (items: BlockRecord[], allowedTypes: BlockType[], title: string, subtitle: string) => (
    <SectionCard
      title={title}
      subtitle={subtitle}
      action={
        <button
          type="button"
          onClick={() => openBlockEditor(allowedTypes, title, null)}
          className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink"
        >
          <Plus className="h-4 w-4" />
          Добавить
        </button>
      }
    >
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-4 text-[15px] font-semibold text-[#5f6773]">Блоков пока нет.</div>
        ) : (
          items
            .slice()
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((block) => (
              <div key={block.id} className="rounded-2xl bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#eef2f7] px-2 py-1 text-[12px] font-bold text-[#596373]">
                        {BLOCK_TYPE_LABELS[block.blockType]}
                      </span>
                      <span className="rounded-full bg-[#eef2f7] px-2 py-1 text-[12px] font-bold text-[#596373]">
                        #{block.sortOrder}
                      </span>
                      <span className="rounded-full bg-[#eef2f7] px-2 py-1 text-[12px] font-bold text-[#596373]">
                        {PLATFORM_LABELS[block.platform ?? 'all']}
                      </span>
                    </div>
                    <p className="mt-2 text-[18px] font-extrabold text-ink">{blockTitle(block)}</p>
                    <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">{blockSubtitle(block)}</p>
                    <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#8891a0]">
                      {block.blockKey}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openBlockEditor(allowedTypes, title, block)}
                      className="rounded-2xl border border-line p-3 text-[#6c7685]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void deleteBlock(block);
                      }}
                      disabled={busyKey === `block-delete:${block.id}`}
                      className="rounded-2xl border border-line p-3 text-[#6c7685] disabled:opacity-50"
                    >
                      {busyKey === `block-delete:${block.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    </SectionCard>
  );

  const renderOverview = () => (
    <>
      <div className="mb-5 flex items-center gap-3 border-b border-line pb-3 md:hidden">
        <button type="button" onClick={onBack} className="rounded-lg p-2 text-ink">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-extrabold text-ink">Онлайн-запись</h1>
          <p className="mt-1 text-[14px] font-semibold text-muted">Главная страница управления клиентским сайтом и онлайн-записью</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleRefresh();
          }}
          disabled={loading}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-screen text-ink disabled:opacity-50"
          aria-label="Обновить данные"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
        </button>
      </div>

      <section className="rounded-[30px] border border-line bg-gradient-to-br from-white via-[#f7f7fb] to-[#edf1f7] p-5 shadow-[0_14px_36px_rgba(42,49,56,0.08)]">
        <p className="text-[24px] font-extrabold leading-tight text-ink">Категории управления клиентским сайтом</p>
        <p className="mt-3 text-[16px] font-medium leading-relaxed text-[#5f6773]">
          Здесь собраны все разделы, которые влияют на то, что увидит клиент на сайте онлайн-записи.
          Каждая карточка ниже открывает отдельную страницу нужного раздела.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/90 px-4 py-3">
            <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#8590a0]">Категорий</div>
            <div className="mt-1 text-[24px] font-extrabold text-ink">{categorySnapshots.length}</div>
          </div>
          <div className="rounded-2xl bg-white/90 px-4 py-3">
            <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#8590a0]">Ошибок доступа</div>
            <div className="mt-1 text-[24px] font-extrabold text-ink">{totalErrors}</div>
          </div>
          <div className="rounded-2xl bg-white/90 px-4 py-3">
            <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#8590a0]">Обновлено</div>
            <div className="mt-1 text-[16px] font-extrabold text-ink">{lastLoadedAt ? formatDate(lastLoadedAt.toISOString()) : 'загрузка'}</div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-white/90 px-4 py-3 text-[15px] font-semibold leading-relaxed text-[#5f6773]">
          Здесь удобно сначала понять, за что отвечает каждый раздел, а потом перейти внутрь и изменить нужный блок.
          Редактор услуг остаётся отдельным разделом, а здесь показано, как услуги выглядят для клиента.
        </div>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-2 xl:gap-6">
        {categorySnapshots.map((item) => (
          <CategorySummaryCard key={item.key} item={item} onOpen={() => openCategoryPage(item.key)} />
        ))}
      </section>

      <SectionCard title="Общие инструменты" subtitle="Сквозные инструменты, которые используются в нескольких категориях.">
        <div className="space-y-3">
          {sharedTools.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3">
                <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef2f7] text-ink">
                  <Icon className="h-5 w-5" strokeWidth={2.1} />
                </div>
                <div>
                  <p className="text-[17px] font-bold text-ink">{item.title}</p>
                  <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </>
  );

  const renderGeneralDetail = () => (
    <div className="space-y-5">
      <SectionCard title="Основные настройки" subtitle="Управляют базовыми данными клиентского сайта: названием, техработами и ограничениями по версиям приложения.">
        <div className="grid gap-4">
          <TextField label="Бренд" value={generalDraft.brandName} onChange={(value) => setGeneralDraft((prev) => ({ ...prev, brandName: value }))} />
          <TextField label="Юр. название" value={generalDraft.legalName} onChange={(value) => setGeneralDraft((prev) => ({ ...prev, legalName: value }))} />
          <TextField
            label="Мин. версия iOS"
            value={generalDraft.minAppVersionIos}
            onChange={(value) => setGeneralDraft((prev) => ({ ...prev, minAppVersionIos: value }))}
            placeholder="1.0.0"
          />
          <TextField
            label="Мин. версия Android"
            value={generalDraft.minAppVersionAndroid}
            onChange={(value) => setGeneralDraft((prev) => ({ ...prev, minAppVersionAndroid: value }))}
            placeholder="1.0.0"
          />
          <ToggleField
            label="Режим техработ"
            checked={generalDraft.maintenanceMode}
            onToggle={() => setGeneralDraft((prev) => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
          />
          <TextAreaField
            label="Сообщение о техработах"
            value={generalDraft.maintenanceMessage}
            onChange={(value) => setGeneralDraft((prev) => ({ ...prev, maintenanceMessage: value }))}
            rows={4}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            void saveGeneral();
          }}
          disabled={busyKey === 'config'}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
        >
          {busyKey === 'config' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Сохранить
        </button>
      </SectionCard>
    </div>
  );

  const renderServicesDetail = () => {
    const visibleServices = services.filter((item) => item.isActive).slice(0, 8);
    return (
      <div className="space-y-5">
        <SectionCard
          title="Витрина услуг"
          subtitle="Здесь видно, как услуги показаны клиенту. Полное редактирование самих услуг остаётся в отдельном разделе."
          action={
            <button
              type="button"
              onClick={onOpenServices}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink"
            >
              Открыть услуги
              <ChevronRight className="h-4 w-4" />
            </button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#8590a0]">Всего услуг</div>
              <div className="mt-1 text-[24px] font-extrabold text-ink">{services.length}</div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#8590a0]">Активны</div>
              <div className="mt-1 text-[24px] font-extrabold text-ink">{services.filter((item) => item.isActive).length}</div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#8590a0]">С названием для клиента</div>
              <div className="mt-1 text-[24px] font-extrabold text-ink">{services.filter((item) => item.nameOnline).length}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Что увидит клиент первым" subtitle="Первые активные услуги, которые попадут в витрину записи.">
          <div className="space-y-3">
            {visibleServices.length === 0 ? (
              <div className="rounded-2xl bg-white px-4 py-4 text-[15px] font-semibold text-[#5f6773]">Активных услуг пока нет.</div>
            ) : (
              visibleServices.map((service) => (
                <div key={service.id} className="rounded-2xl bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[18px] font-extrabold text-ink">{service.nameOnline || service.name}</p>
                      <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                        {service.category.name} • {formatDuration(service.durationSec)} • {formatMoney(service.priceMin)}
                        {service.priceMax && service.priceMax !== service.priceMin ? ` – ${formatMoney(service.priceMax)}` : ''}
                      </p>
                      {service.description ? (
                        <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">{service.description}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    );
  };

  const renderSpecialistsDetail = () => (
    <div className="space-y-5">
      <SectionCard title="Карточки специалистов" subtitle="Редактируются отдельно от общего списка сотрудников.">
        <div className="space-y-3">
          {specialists.length === 0 ? (
            <div className="rounded-2xl bg-white px-4 py-4 text-[15px] font-semibold text-[#5f6773]">Нет карточек специалистов.</div>
          ) : (
            specialists.map((item) => (
              <div key={item.staffId} className="rounded-2xl bg-white px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#eef2f7]">
                    {item.photo?.preferredUrl || item.photo?.originalUrl ? (
                      <img
                        src={item.photo?.preferredUrl || item.photo?.originalUrl || ''}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Users className="h-6 w-6 text-[#68768a]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[18px] font-extrabold text-ink">{item.name}</p>
                        <p className="mt-1 text-[14px] font-medium text-[#5f6773]">
                          {item.specialty || 'Без специализации'} • {item.isVisible ? 'Виден клиенту' : 'Скрыт'}
                        </p>
                        <p className="mt-1 text-[13px] font-semibold text-[#8590a0]">
                          Кнопка записи: {item.ctaText || 'Записаться'} • Услуг: {item.services.length}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openSpecialistEditor(item)}
                        className="rounded-2xl border border-line p-3 text-[#6c7685]"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );

  const renderContactsDetail = () => {
    const contactBlocks = blocks.filter((block) => block.blockType === 'CONTACTS');

    return (
      <div className="space-y-5">
        <SectionCard
          title="Точки контакта"
          subtitle="Храним публичные контакты клиентского сайта. Дополнительные адреса и телефоны существующих точек сохраняются как есть."
          action={
            <button
              type="button"
              onClick={() => openContactEditor(null)}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink"
            >
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          }
        >
          <div className="space-y-3">
            {contacts.length === 0 ? (
              <div className="rounded-2xl bg-white px-4 py-4 text-[15px] font-semibold text-[#5f6773]">Контактов пока нет.</div>
            ) : (
              contacts
                .slice()
                .sort((left, right) => (left.orderIndex ?? 0) - (right.orderIndex ?? 0))
                .map((contact) => (
                  <div key={contact.id} className="rounded-2xl bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[18px] font-extrabold text-ink">{contact.name}</p>
                        <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                          {contact.addresses[0]?.line1 || 'Адрес не задан'} • {contact.phones[0]?.e164 || 'Телефон не задан'}
                        </p>
                        <p className="mt-2 text-[13px] font-semibold text-[#8590a0]">
                          #{contact.orderIndex ?? 0} {contact.isPrimary ? '• Основная точка' : ''}{' '}
                          {(contact.workingHours?.length ?? 0) > 0 ? '• Есть часы работы' : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => openContactEditor(contact)}
                          className="rounded-2xl border border-line p-3 text-[#6c7685]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void deleteContact(contact.id);
                          }}
                          disabled={busyKey === `contact-delete:${contact.id}`}
                          className="rounded-2xl border border-line p-3 text-[#6c7685] disabled:opacity-50"
                        >
                          {busyKey === `contact-delete:${contact.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </SectionCard>

        {renderBlockManager(contactBlocks, ['CONTACTS'], 'Контактные блоки', 'Если контакты выводятся отдельным блоком на клиентской странице.')}
      </div>
    );
  };

  const renderPageBlocksDetail = () =>
    renderBlockManager(
      blocks.filter((block) => ['BANNER', 'TEXT', 'BUTTONS', 'FAQ'].includes(block.blockType)),
      ['BANNER', 'TEXT', 'BUTTONS', 'FAQ'],
      'Основные блоки страницы',
      'Редактор баннеров, текстовых блоков, кнопок и раздела «Вопросы и ответы» для страницы записи.',
    );

  const renderPromoDetail = () =>
    renderBlockManager(
      blocks.filter((block) => ['PROMO', 'OFFERS'].includes(block.blockType)),
      ['PROMO', 'OFFERS'],
      'Акции и предложения',
      'Редактор маркетинговых блоков и подборок предложений.',
    );

  const renderAdvancedDetail = () => (
    <div className="space-y-5">
      <SectionCard title="Служебные настройки" subtitle="Служебные данные сохраняются в техническом формате JSON.">
        <div className="space-y-4">
          <TextAreaField
            label="Служебные переключатели (JSON)"
            value={advancedDraft.featureFlagsJson}
            onChange={(value) => setAdvancedDraft((prev) => ({ ...prev, featureFlagsJson: value }))}
            rows={12}
          />
          <TextAreaField
            label="Дополнительные данные (JSON)"
            value={advancedDraft.extraJson}
            onChange={(value) => setAdvancedDraft((prev) => ({ ...prev, extraJson: value }))}
            rows={10}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            void saveAdvanced();
          }}
          disabled={busyKey === 'config'}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
        >
          {busyKey === 'config' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Сохранить служебные данные
        </button>
      </SectionCard>

      {renderBlockManager(
        blocks.filter((block) => block.blockType === 'CUSTOM'),
        ['CUSTOM'],
        'Нестандартные блоки',
        'Служебные блоки для нестандартного поведения клиентского сайта.',
      )}
    </div>
  );

  const renderPreviewButtons = (items: Record<string, unknown>[]) => (
    <div className="mt-4 flex flex-wrap gap-3">
      {items.map((item, index) => {
        const style = asStringValue(item.style) || 'primary';
        const label = asStringValue(item.label) || `Кнопка ${index + 1}`;
        const className =
          style === 'secondary'
            ? 'rounded-2xl border border-[#d4dbe6] bg-white px-4 py-3 text-[14px] font-extrabold text-ink'
            : style === 'ghost'
              ? 'rounded-2xl px-4 py-3 text-[14px] font-extrabold text-[#596373]'
              : 'rounded-2xl bg-ink px-4 py-3 text-[14px] font-extrabold text-white';

        return (
          <button key={`preview-button-${index}`} type="button" className={className}>
            {label}
          </button>
        );
      })}
    </div>
  );

  const renderPreviewContactsSection = (items: Record<string, unknown>[], title: string) => (
    <section className="rounded-[28px] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(42,49,56,0.06)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef2f7] text-ink">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-[20px] font-extrabold text-ink">{title}</h3>
          <p className="text-[14px] font-medium text-[#5f6773]">Контактные точки для клиента</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item, index) => {
          const address = asRecordArray(item.addresses)[0] ?? {};
          const phone = asRecordArray(item.phones)[0] ?? {};
          return (
            <div key={`preview-contact-${asStringValue(item.id) || index}`} className="rounded-2xl border border-line bg-[#f8fafc] px-4 py-4">
              <p className="text-[17px] font-extrabold text-ink">{asStringValue(item.name) || `Контакт ${index + 1}`}</p>
              <p className="mt-2 text-[14px] font-medium text-[#5f6773]">{asStringValue(address.line1) || 'Адрес не задан'}</p>
              <p className="mt-1 text-[14px] font-medium text-[#5f6773]">{asStringValue(phone.display) || asStringValue(phone.e164) || 'Телефон не задан'}</p>
              {asStringValue(item.website) ? (
                <p className="mt-2 text-[13px] font-semibold text-[#8590a0]">{asStringValue(item.website)}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );

  const renderPreviewBlock = (block: BlockRecord) => {
    const payload = asObjectRecord(block.payload);

    if (block.blockType === 'BANNER') {
      const imageAssetId = asStringValue(payload.imageAssetId);
      const imageUrl = assetUrlMap[imageAssetId] ?? '';
      return (
        <section key={block.id} className="grid gap-5 rounded-[28px] bg-[#f5eadf] px-5 py-5 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#916539]">Главный баннер</p>
            <h3 className="mt-3 text-[30px] font-extrabold leading-tight text-ink">{asStringValue(payload.title) || block.blockKey}</h3>
            {asStringValue(payload.subtitle) ? (
              <p className="mt-3 text-[16px] font-medium leading-relaxed text-[#5f6773]">{asStringValue(payload.subtitle)}</p>
            ) : null}
            {asStringValue(payload.ctaText) ? (
              <div className="mt-5">
                <button type="button" className="rounded-2xl bg-ink px-5 py-3 text-[15px] font-extrabold text-white">
                  {asStringValue(payload.ctaText)}
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-[24px] bg-white">
            {imageUrl ? (
              <img src={imageUrl} alt={asStringValue(payload.title) || block.blockKey} className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[#7c8593]">
                <Image className="h-10 w-10" />
                <span className="text-[13px] font-semibold">Нет изображения</span>
              </div>
            )}
          </div>
        </section>
      );
    }

    if (block.blockType === 'TEXT') {
      return (
        <section key={block.id} className="rounded-[28px] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(42,49,56,0.06)]">
          {asStringValue(payload.title) ? <h3 className="text-[24px] font-extrabold text-ink">{asStringValue(payload.title)}</h3> : null}
          <p className="mt-3 whitespace-pre-wrap text-[16px] font-medium leading-relaxed text-[#4e5866]">{asStringValue(payload.body)}</p>
        </section>
      );
    }

    if (block.blockType === 'BUTTONS') {
      return (
        <section key={block.id} className="rounded-[28px] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(42,49,56,0.06)]">
          {asStringValue(payload.title) ? <h3 className="text-[22px] font-extrabold text-ink">{asStringValue(payload.title)}</h3> : null}
          {renderPreviewButtons(asRecordArray(payload.items))}
        </section>
      );
    }

    if (block.blockType === 'FAQ') {
      return (
        <section key={block.id} className="rounded-[28px] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(42,49,56,0.06)]">
          {asStringValue(payload.title) ? <h3 className="text-[22px] font-extrabold text-ink">{asStringValue(payload.title)}</h3> : null}
          <div className="mt-4 space-y-3">
            {asRecordArray(payload.items).map((item, index) => (
              <div key={`preview-faq-${index}`} className="rounded-2xl border border-line bg-[#f8fafc] px-4 py-4">
                <p className="text-[16px] font-extrabold text-ink">{asStringValue(item.question) || `Вопрос ${index + 1}`}</p>
                <p className="mt-2 whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-[#5f6773]">{asStringValue(item.answer)}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (block.blockType === 'PROMO') {
      const imageAssetId = asStringValue(payload.imageAssetId);
      const imageUrl = assetUrlMap[imageAssetId] ?? '';
      return (
        <section key={block.id} className="grid gap-5 rounded-[28px] bg-[#dfe9db] px-5 py-5 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            {asStringValue(payload.badge) ? (
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#41634b]">
                {asStringValue(payload.badge)}
              </span>
            ) : null}
            <h3 className="mt-3 text-[28px] font-extrabold leading-tight text-ink">{asStringValue(payload.title) || block.blockKey}</h3>
            {asStringValue(payload.description) ? (
              <p className="mt-3 whitespace-pre-wrap text-[16px] font-medium leading-relaxed text-[#4f5d55]">{asStringValue(payload.description)}</p>
            ) : null}
            {asStringValue(payload.ctaText) ? (
              <div className="mt-5">
                <button type="button" className="rounded-2xl bg-[#244231] px-5 py-3 text-[15px] font-extrabold text-white">
                  {asStringValue(payload.ctaText)}
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-[24px] bg-white">
            {imageUrl ? (
              <img src={imageUrl} alt={asStringValue(payload.title) || block.blockKey} className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[#66806d]">
                <Image className="h-10 w-10" />
                <span className="text-[13px] font-semibold">Нет изображения</span>
              </div>
            )}
          </div>
        </section>
      );
    }

    if (block.blockType === 'OFFERS') {
      return (
        <section key={block.id} className="rounded-[28px] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(42,49,56,0.06)]">
          {asStringValue(payload.title) ? <h3 className="text-[22px] font-extrabold text-ink">{asStringValue(payload.title)}</h3> : null}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {asRecordArray(payload.items).map((item, index) => {
              const imageAssetId = asStringValue(item.imageAssetId);
              const imageUrl = assetUrlMap[imageAssetId] ?? '';
              return (
                <div key={`preview-offer-${asStringValue(item.id) || index}`} className="overflow-hidden rounded-[24px] border border-line bg-[#fbfbfd]">
                  <div className="flex h-44 items-center justify-center bg-[#eef2f7]">
                    {imageUrl ? (
                      <img src={imageUrl} alt={asStringValue(item.title) || `Предложение ${index + 1}`} className="h-full w-full object-cover" />
                    ) : (
                      <Image className="h-9 w-9 text-[#7d8795]" />
                    )}
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-[18px] font-extrabold text-ink">{asStringValue(item.title) || `Предложение ${index + 1}`}</p>
                    {asStringValue(item.subtitle) ? (
                      <p className="mt-1 text-[14px] font-semibold text-[#7d8795]">{asStringValue(item.subtitle)}</p>
                    ) : null}
                    {asStringValue(item.description) ? (
                      <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">{asStringValue(item.description)}</p>
                    ) : null}
                    <div className="mt-4 flex items-end gap-2">
                      {typeof asNumberValue(item.finalPrice) === 'number' ? (
                        <span className="text-[22px] font-extrabold text-ink">
                          {formatMoney(asNumberValue(item.finalPrice))}
                        </span>
                      ) : null}
                      {typeof asNumberValue(item.originalPrice) === 'number' ? (
                        <span className="text-[14px] font-bold text-[#8f98a5] line-through">
                          {formatMoney(asNumberValue(item.originalPrice))}
                        </span>
                      ) : null}
                    </div>
                    {asStringValue(item.ctaText) ? (
                      <button type="button" className="mt-4 rounded-2xl bg-ink px-4 py-3 text-[14px] font-extrabold text-white">
                        {asStringValue(item.ctaText)}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    if (block.blockType === 'CONTACTS') {
      return (
        <div key={block.id}>
          {renderPreviewContactsSection(asRecordArray(payload.items), asStringValue(payload.title) || 'Контакты')}
        </div>
      );
    }

    return (
      <section key={block.id} className="rounded-[28px] border border-dashed border-line bg-white px-5 py-5">
        <p className="text-[16px] font-extrabold text-ink">Нестандартный блок: {block.blockKey}</p>
        <pre className="mt-3 overflow-auto rounded-2xl bg-[#f4f6f9] px-4 py-4 text-[13px] font-medium text-[#5f6773]">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </section>
    );
  };

  const renderVisualPreview = () => {
    if (!previewState.data) {
      return null;
    }

    const previewBlocks = previewState.data.blocks;
    const previewContacts = (previewState.data.config.contacts ?? []).map((item) => asObjectRecord(item));
    const previewSpecialists = previewState.data.specialists;
    const hasContactsBlock = previewBlocks.some((block) => block.blockType === 'CONTACTS');

    return (
      <div className="rounded-[32px] border border-line bg-[#e8edf4] p-3">
        <div className="mx-auto max-w-[920px] rounded-[28px] bg-[#fcfbf8] px-4 py-4 shadow-[0_18px_40px_rgba(42,49,56,0.12)] md:px-6 md:py-6">
          <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(42,49,56,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#8a94a2]">Предпросмотр сайта</p>
                <h2 className="mt-1 text-[28px] font-extrabold text-ink">
                  {previewState.data.config.brandName || 'Онлайн-запись'}
                </h2>
                {previewState.data.config.legalName ? (
                  <p className="mt-1 text-[14px] font-medium text-[#5f6773]">{previewState.data.config.legalName}</p>
                ) : null}
              </div>
              <div className="rounded-full border border-line bg-[#f6f8fb] px-4 py-2 text-[13px] font-bold text-[#596373]">
                Черновик, версия {previewState.data.version}
              </div>
            </div>
          </div>

          {previewState.data.config.maintenanceMode ? (
            <div className="mt-5 rounded-[24px] border border-[#efd6b5] bg-[#fff6ea] px-5 py-4 text-[#8a5f1d]">
              <p className="text-[15px] font-extrabold">Техработы включены</p>
              {previewState.data.config.maintenanceMessage ? (
                <p className="mt-2 text-[15px] font-medium leading-relaxed">
                  {previewState.data.config.maintenanceMessage}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 space-y-5">
            {previewBlocks.map((block) => renderPreviewBlock(block))}
          </div>

          {previewSpecialists.length > 0 ? (
            <section className="mt-5 rounded-[28px] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(42,49,56,0.06)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef2f7] text-ink">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[20px] font-extrabold text-ink">Специалисты</h3>
                  <p className="text-[14px] font-medium text-[#5f6773]">Карточки, которые увидит клиент</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {previewSpecialists.map((item) => (
                  <div key={item.staffId} className="rounded-[24px] border border-line bg-[#fbfbfd] p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#eef2f7]">
                        {item.photo?.preferredUrl || item.photo?.originalUrl ? (
                          <img
                            src={item.photo?.preferredUrl || item.photo?.originalUrl || ''}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Users className="h-8 w-8 text-[#68768a]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[18px] font-extrabold text-ink">{item.name}</p>
                        <p className="mt-1 text-[14px] font-medium text-[#5f6773]">{item.specialty || 'Без специализации'}</p>
                        {item.info ? (
                          <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">{item.info}</p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.services.slice(0, 3).map((service) => (
                            <span
                              key={service.id}
                              className="rounded-full border border-line bg-white px-3 py-1 text-[12px] font-bold text-[#596373]"
                            >
                              {service.name}
                            </span>
                          ))}
                        </div>
                        {item.ctaText ? (
                          <button type="button" className="mt-4 rounded-2xl bg-ink px-4 py-3 text-[14px] font-extrabold text-white">
                            {item.ctaText}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {!hasContactsBlock && previewContacts.length > 0 ? (
            <div className="mt-5">{renderPreviewContactsSection(previewContacts, 'Контакты')}</div>
          ) : null}

          {previewBlocks.length === 0 && previewSpecialists.length === 0 && previewContacts.length === 0 ? (
            <div className="mt-5 rounded-[24px] bg-white px-5 py-5 text-[15px] font-semibold text-[#5f6773]">
              В предпросмотре пока нечего показывать.
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderPublishDetail = () => (
    <div className="space-y-5">
      <SectionCard
        title="Предпросмотр черновика"
        subtitle="Показывает, как клиент увидит сайт до публикации."
        action={
          <button
            type="button"
            onClick={() => {
              void loadPreview();
            }}
            disabled={busyKey === 'preview'}
            className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink disabled:opacity-50"
          >
            {busyKey === 'preview' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Обновить предпросмотр
          </button>
        }
      >
        {previewState.error ? (
          <div className="rounded-2xl border border-[#efd6b5] bg-[#fff6ea] px-4 py-4 text-[15px] font-semibold text-[#8a5f1d]">
            {previewState.error}
          </div>
        ) : previewState.data ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#8590a0]">Черновик</div>
                <div className="mt-1 text-[24px] font-extrabold text-ink">{previewState.data.version}</div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#8590a0]">Блоков</div>
                <div className="mt-1 text-[24px] font-extrabold text-ink">{previewState.data.blocks.length}</div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#8590a0]">Специалистов</div>
                <div className="mt-1 text-[24px] font-extrabold text-ink">{previewState.data.specialists.length}</div>
              </div>
            </div>

            {renderVisualPreview()}
          </div>
        ) : (
          <div className="rounded-2xl bg-white px-4 py-4 text-[15px] font-semibold text-[#5f6773]">Предпросмотр ещё не загружен.</div>
        )}
      </SectionCard>

      <SectionCard
        title="Публикация"
        subtitle="После публикации эта версия станет основной для клиентского сайта."
        action={
          <button
            type="button"
            onClick={() => {
              void publishDraft();
            }}
            disabled={busyKey === 'publish'}
            className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink disabled:opacity-50"
          >
            {busyKey === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Опубликовать
          </button>
        }
      >
        <div className="rounded-2xl bg-white px-4 py-4 text-[15px] font-semibold leading-relaxed text-[#5f6773]">
          Текущая опубликованная версия: <span className="text-ink">{config?.publishedVersion ?? 0}</span>. Последняя
          публикация: <span className="text-ink">{formatDate(config?.publishedAt)}</span>.
        </div>
      </SectionCard>

      <SectionCard title="История публикаций" subtitle="Последние опубликованные версии клиентского сайта.">
        <div className="space-y-3">
          {releases.length === 0 ? (
            <div className="rounded-2xl bg-white px-4 py-4 text-[15px] font-semibold text-[#5f6773]">Публикаций пока нет.</div>
          ) : (
            releases.map((release) => (
              <div key={release.id} className="rounded-2xl bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[18px] font-extrabold text-ink">Версия {release.version}</p>
                    <p className="mt-1 text-[14px] font-medium text-[#5f6773]">
                      {formatDate(release.publishedAt)} • Блоков: {release.blocksCount}
                    </p>
                    {release.publishedByStaff ? (
                      <p className="mt-1 text-[13px] font-semibold text-[#8590a0]">
                        {release.publishedByStaff.name} • {release.publishedByStaff.role}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );

  const renderDetail = () => {
    if (!activeMeta) {
      return null;
    }

    return (
      <>
        <div className="mb-5 flex items-center gap-3 border-b border-line pb-3 md:hidden">
          <button type="button" onClick={closeCategoryPage} className="rounded-lg p-2 text-ink">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[26px] font-extrabold text-ink">{activeMeta.title}</h1>
            <p className="mt-1 text-[14px] font-semibold text-muted">{activeMeta.description}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void handleRefresh();
            }}
            disabled={loading}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-screen text-ink disabled:opacity-50"
            aria-label="Обновить данные"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
          </button>
        </div>

        {activeCategory === 'general' ? renderGeneralDetail() : null}
        {activeCategory === 'services' ? renderServicesDetail() : null}
        {activeCategory === 'specialists' ? renderSpecialistsDetail() : null}
        {activeCategory === 'contacts' ? renderContactsDetail() : null}
        {activeCategory === 'page' ? renderPageBlocksDetail() : null}
        {activeCategory === 'promo' ? renderPromoDetail() : null}
        {activeCategory === 'advanced' ? renderAdvancedDetail() : null}
        {activeCategory === 'publish' ? renderPublishDetail() : null}
      </>
    );
  };

  const renderDesktopSidebar = () => {
    const quickItems = activeCategory
      ? categorySnapshots.filter((item) => item.key !== activeCategory).slice(0, 3)
      : categorySnapshots.slice(0, 4);

    return (
      <div className="space-y-5 xl:sticky xl:top-6">
        <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#1d2a37_0%,#20384a_46%,#f4c900_160%)] px-5 py-5 text-white shadow-[0_22px_50px_rgba(29,42,55,0.24)]">
          <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-[rgba(244,201,0,0.28)] blur-2xl" />
          <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-[rgba(127,204,255,0.16)] blur-2xl" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f4c900]">Онлайн-запись</p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-[0.95] tracking-[-0.04em] text-white">
              {config?.brandName || 'Онлайн-запись'}
            </h2>
            <p className="mt-3 text-[15px] font-medium leading-relaxed text-[rgba(255,255,255,0.82)]">
              {activeMeta
                ? activeMeta.note
                : 'Редактор клиентского сайта, витрины записи и публикации. На компьютере основные действия и текущее состояние видны сразу.'}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[20px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.64)]">Опубликовано</p>
                <p className="mt-2 text-[24px] font-extrabold text-white">{config?.publishedVersion ?? 0}</p>
              </div>
              <div className="rounded-[20px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.64)]">Блоков</p>
                <p className="mt-2 text-[24px] font-extrabold text-white">{blocks.length}</p>
              </div>
              <div className="rounded-[20px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.64)]">Специалистов</p>
                <p className="mt-2 text-[24px] font-extrabold text-white">{specialists.filter((item) => item.isVisible).length}</p>
              </div>
              <div className="rounded-[20px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.64)]">Контактов</p>
                <p className="mt-2 text-[24px] font-extrabold text-white">{contacts.length}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleRefresh();
                }}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[14px] font-extrabold text-[#1f2d39] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Обновить
              </button>
              <button
                type="button"
                onClick={onOpenServices}
                className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.08)] px-4 py-3 text-[14px] font-extrabold text-white"
              >
                Услуги
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-line bg-[linear-gradient(180deg,#ffffff,#f7fafc)] p-5 shadow-[0_14px_32px_rgba(42,49,56,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">
                {activeCategory ? 'Следом удобно проверить' : 'Быстрый путь'}
              </p>
              <h3 className="mt-2 text-[24px] font-extrabold leading-none text-ink">
                {activeCategory ? activeMeta?.title : 'Основные разделы'}
              </h3>
            </div>
            {activeCategory ? (
              <button
                type="button"
                onClick={closeCategoryPage}
                className="inline-flex h-11 items-center rounded-2xl border border-line bg-white px-4 text-[13px] font-extrabold text-ink"
              >
                Обзор
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {quickItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => openCategoryPage(item.key)}
                  className="flex w-full items-start gap-4 rounded-[22px] border border-[#dde3eb] bg-white px-4 py-4 text-left transition hover:border-[#cbd3de] hover:bg-[#fbfcfe]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f4c900] text-[#1f2d39] shadow-[0_10px_22px_rgba(244,201,0,0.22)]">
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[17px] font-extrabold text-ink">{item.title}</p>
                      <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#97a0ad]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">{item.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[28px] border border-line bg-[#fffaf0] p-5 shadow-[0_14px_32px_rgba(42,49,56,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b08927]">Предпросмотр сайта</p>
              <h3 className="mt-2 text-[24px] font-extrabold leading-none text-ink">Быстрая проверка</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadPreview();
              }}
              disabled={busyKey === 'preview'}
              className="inline-flex h-11 items-center rounded-2xl border border-[#ead8a8] bg-white px-4 text-[13px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'preview' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Обновить'}
            </button>
          </div>

          {previewState.error ? (
            <div className="mt-4 rounded-2xl border border-[#efd6b5] bg-white px-4 py-4 text-[14px] font-semibold text-[#8a5f1d]">
              {previewState.error}
            </div>
          ) : previewState.data ? (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="break-words text-[11px] font-bold uppercase leading-tight tracking-[0.06em] text-[#9b8858]">
                    Черновик
                  </p>
                  <p className="mt-1 text-[22px] font-extrabold text-ink">{previewState.data.version}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="break-words text-[11px] font-bold uppercase leading-tight tracking-[0.06em] text-[#9b8858]">
                    Блоков
                  </p>
                  <p className="mt-1 text-[22px] font-extrabold text-ink">{previewState.data.blocks.length}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="break-words text-[11px] font-bold uppercase leading-tight tracking-[0.06em] text-[#9b8858]">
                    Специалистов
                  </p>
                  <p className="mt-1 text-[22px] font-extrabold text-ink">{previewState.data.specialists.length}</p>
                </div>
              </div>

              <div className="rounded-[22px] bg-white px-4 py-4">
                <p className="text-[18px] font-extrabold text-ink">
                  {previewState.data.config.brandName || 'Онлайн-запись'}
                </p>
                <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                  {previewState.data.blocks.length > 0
                    ? `Первый блок: ${
                        previewState.data.blocks[0]?.blockKey ||
                        BLOCK_TYPE_LABELS[previewState.data.blocks[0]?.blockType ?? 'TEXT']
                      }`
                    : 'В предпросмотре пока нет блоков. Можно быстро перейти в публикацию и проверить структуру.'}
                </p>
                <button
                  type="button"
                  onClick={() => openCategoryPage('publish')}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#1f2d39] px-4 py-3 text-[14px] font-extrabold text-white"
                >
                  Открыть публикацию
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[22px] bg-white px-4 py-4">
              <p className="text-[16px] font-extrabold text-ink">Предпросмотр ещё не загружен</p>
              <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                Здесь появится быстрый черновой просмотр сайта прямо в боковой панели.
              </p>
            </div>
          )}
        </section>
      </div>
    );
  };

  return (
    <>
      <div className="pb-7 pt-4 md:hidden">
        {message ? <div className={`mb-4 ${bannerClassName(message)}`}>{message.text}</div> : null}
        {activeCategory ? renderDetail() : renderOverview()}
      </div>

      <div className="hidden pb-8 pt-6 md:block">
        {message ? <div className={`mb-5 ${bannerClassName(message)}`}>{message.text}</div> : null}

        <section className="relative overflow-hidden rounded-[36px] border border-[#dfe6ef] bg-[linear-gradient(135deg,#fff7df_0%,#f7fbff_38%,#eef5ff_100%)] px-7 py-7 shadow-[0_22px_52px_rgba(42,49,56,0.1)]">
          <div className="absolute -right-8 top-0 h-40 w-40 rounded-full bg-[rgba(244,201,0,0.22)] blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[rgba(112,182,255,0.16)] blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeCategory) {
                        closeCategoryPage();
                        return;
                      }
                      onBack();
                    }}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/90 text-ink shadow-[0_10px_24px_rgba(42,49,56,0.08)]"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">
                      {activeCategory ? 'Раздел редактора' : 'Конструктор сайта'}
                    </p>
                    <h1 className="mt-2 text-[48px] font-extrabold leading-[0.92] tracking-[-0.05em] text-ink">
                      {activeMeta ? activeMeta.title : 'Онлайн-запись'}
                    </h1>
                  </div>
                </div>
                <p className="mt-5 max-w-[760px] text-[17px] font-medium leading-relaxed text-[#55606e]">
                  {activeMeta
                    ? activeMeta.description
                    : 'Версия для компьютера собрана как рабочая панель: слева основные разделы, справа подсказки, состояние сайта и быстрые переходы. Так проще понять, что именно видит клиент и что вы редактируете сейчас.'}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(activeMeta?.tags ?? ['контент', 'предпросмотр', 'публикация']).slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/80 bg-white/90 px-4 py-2 text-[13px] font-bold text-[#495463] shadow-[0_8px_20px_rgba(42,49,56,0.05)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void handleRefresh();
                  }}
                  disabled={loading}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 text-sm font-extrabold text-ink shadow-[0_10px_24px_rgba(42,49,56,0.08)] disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Обновить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void loadPreview();
                  }}
                  disabled={busyKey === 'preview'}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#e9d79f] bg-[#fff9e5] px-4 text-sm font-extrabold text-[#3f3a24] shadow-[0_10px_24px_rgba(244,201,0,0.12)] disabled:opacity-50"
                >
                  {busyKey === 'preview' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  Предпросмотр
                </button>
                <button
                  type="button"
                  onClick={onOpenServices}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#1f2d39] px-5 text-sm font-extrabold text-white shadow-[0_14px_28px_rgba(31,45,57,0.18)]"
                >
                  Открыть услуги
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-7 xl:grid-cols-[minmax(0,1fr)_350px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">{activeCategory ? renderDetail() : renderOverview()}</div>
          <div className="min-w-0">{renderDesktopSidebar()}</div>
        </div>
      </div>

      <PageSheet
        open={Boolean(contactEditor)}
        onDismiss={() => setContactEditor(null)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight, 760)]}
        defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? 0}
      >
        {contactEditor ? (
          <div className="bg-white px-4 pb-6 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[20px] font-extrabold text-ink">
                  {contactEditor.mode === 'create' ? 'Новая точка контакта' : 'Редактировать контакт'}
                </h3>
                <p className="mt-1 text-[14px] font-semibold text-muted">Минимально редактируем первую пару адрес/телефон и общие поля точки.</p>
              </div>
              <button type="button" onClick={() => setContactEditor(null)} className="rounded-lg p-2 text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <TextField
                label="ID"
                value={contactEditor.draft.id}
                onChange={(value) =>
                  setContactEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, id: slugify(value) } } : prev,
                  )
                }
              />
              <TextField
                label="Название"
                value={contactEditor.draft.name}
                onChange={(value) =>
                  setContactEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, name: value } } : prev,
                  )
                }
              />
              <TextField
                label="Публичное название"
                value={contactEditor.draft.publicName}
                onChange={(value) =>
                  setContactEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, publicName: value } } : prev,
                  )
                }
              />
              <TextField
                label="Юр. название"
                value={contactEditor.draft.legalName}
                onChange={(value) =>
                  setContactEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, legalName: value } } : prev,
                  )
                }
              />
              <TextField
                label="Алиасы через запятую"
                value={contactEditor.draft.aliasesText}
                onChange={(value) =>
                  setContactEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, aliasesText: value } } : prev,
                  )
                }
              />

              <div className="rounded-2xl bg-[#f4f6f9] px-4 py-3">
                <p className="text-[16px] font-extrabold text-ink">Первый адрес</p>
                <div className="mt-3 space-y-3">
                  <TextField
                    label="Метка адреса"
                    value={contactEditor.draft.addressLabel}
                    onChange={(value) =>
                      setContactEditor((prev) =>
                        prev ? { ...prev, draft: { ...prev.draft, addressLabel: value } } : prev,
                      )
                    }
                  />
                  <TextField
                    label="Адрес"
                    value={contactEditor.draft.addressLine1}
                    onChange={(value) =>
                      setContactEditor((prev) =>
                        prev ? { ...prev, draft: { ...prev.draft, addressLine1: value } } : prev,
                      )
                    }
                  />
                  <TextField
                    label="Доп. строка"
                    value={contactEditor.draft.addressLine2}
                    onChange={(value) =>
                      setContactEditor((prev) =>
                        prev ? { ...prev, draft: { ...prev.draft, addressLine2: value } } : prev,
                      )
                    }
                  />
                  <TextField
                    label="Город"
                    value={contactEditor.draft.city}
                    onChange={(value) =>
                      setContactEditor((prev) =>
                        prev ? { ...prev, draft: { ...prev.draft, city: value } } : prev,
                      )
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <TextField
                      label="Регион"
                      value={contactEditor.draft.region}
                      onChange={(value) =>
                        setContactEditor((prev) =>
                          prev ? { ...prev, draft: { ...prev.draft, region: value } } : prev,
                        )
                      }
                    />
                    <TextField
                      label="Индекс"
                      value={contactEditor.draft.postalCode}
                      onChange={(value) =>
                        setContactEditor((prev) =>
                          prev ? { ...prev, draft: { ...prev.draft, postalCode: value } } : prev,
                        )
                      }
                    />
                    <TextField
                      label="Страна"
                      value={contactEditor.draft.country}
                      onChange={(value) =>
                        setContactEditor((prev) =>
                          prev ? { ...prev, draft: { ...prev.draft, country: value } } : prev,
                        )
                      }
                    />
                  </div>
                  <TextAreaField
                    label="Комментарий к адресу"
                    value={contactEditor.draft.addressComment}
                    onChange={(value) =>
                      setContactEditor((prev) =>
                        prev ? { ...prev, draft: { ...prev.draft, addressComment: value } } : prev,
                      )
                    }
                    rows={3}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-[#f4f6f9] px-4 py-3">
                <p className="text-[16px] font-extrabold text-ink">Первый телефон</p>
                <div className="mt-3 space-y-3">
                  <TextField
                    label="Метка телефона"
                    value={contactEditor.draft.phoneLabel}
                    onChange={(value) =>
                      setContactEditor((prev) =>
                        prev ? { ...prev, draft: { ...prev.draft, phoneLabel: value } } : prev,
                      )
                    }
                  />
                  <TextField
                    label="Телефон E.164"
                    value={contactEditor.draft.phoneE164}
                    onChange={(value) =>
                      setContactEditor((prev) =>
                        prev ? { ...prev, draft: { ...prev.draft, phoneE164: value } } : prev,
                      )
                    }
                    placeholder="+79990000000"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      label="Отображаемый телефон"
                      value={contactEditor.draft.phoneDisplay}
                      onChange={(value) =>
                        setContactEditor((prev) =>
                          prev ? { ...prev, draft: { ...prev.draft, phoneDisplay: value } } : prev,
                        )
                      }
                    />
                    <TextField
                      label="Добавочный"
                      value={contactEditor.draft.phoneExt}
                      onChange={(value) =>
                        setContactEditor((prev) =>
                          prev ? { ...prev, draft: { ...prev.draft, phoneExt: value } } : prev,
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Email"
                  value={contactEditor.draft.email}
                  onChange={(value) =>
                    setContactEditor((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, email: value } } : prev,
                    )
                  }
                />
                <TextField
                  label="Порядок"
                  value={contactEditor.draft.orderIndex}
                  onChange={(value) =>
                    setContactEditor((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, orderIndex: value } } : prev,
                    )
                  }
                  type="number"
                />
              </div>

              <TextField
                label="Сайт"
                value={contactEditor.draft.website}
                onChange={(value) =>
                  setContactEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, website: value } } : prev,
                  )
                }
              />
              <TextField
                label="Ссылка на карту"
                value={contactEditor.draft.mapUrl}
                onChange={(value) =>
                  setContactEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, mapUrl: value } } : prev,
                  )
                }
              />
              <TextField
                label="Теги через запятую"
                value={contactEditor.draft.tagsText}
                onChange={(value) =>
                  setContactEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, tagsText: value } } : prev,
                  )
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Показывать с"
                  value={contactEditor.draft.startAt}
                  onChange={(value) =>
                    setContactEditor((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, startAt: value } } : prev,
                    )
                  }
                  type="datetime-local"
                />
                <TextField
                  label="Показывать до"
                  value={contactEditor.draft.endAt}
                  onChange={(value) =>
                    setContactEditor((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, endAt: value } } : prev,
                    )
                  }
                  type="datetime-local"
                />
              </div>
              <ToggleField
                label="Главная точка"
                checked={contactEditor.draft.isPrimary}
                onToggle={() =>
                  setContactEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, isPrimary: !prev.draft.isPrimary } } : prev,
                  )
                }
              />

              <div className="rounded-2xl bg-[#f4f6f9] px-4 py-3">
                <p className="text-[16px] font-extrabold text-ink">Часы работы</p>
                <div className="mt-3 space-y-3">
                  {contactEditor.draft.workingHours.map((row, index) => (
                    <div key={row.dayOfWeek} className="rounded-2xl bg-white px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[16px] font-bold text-ink">
                          {DAYS_ORDERED.find((item) => item.value === row.dayOfWeek)?.label || row.dayOfWeek}
                        </span>
                        <ToggleField
                          label={row.enabled ? 'Открыто' : 'Выходной'}
                          checked={row.enabled}
                          onToggle={() =>
                            setContactEditor((prev) => {
                              if (!prev) {
                                return prev;
                              }
                              const nextRows = [...prev.draft.workingHours];
                              nextRows[index] = { ...nextRows[index], enabled: !nextRows[index].enabled };
                              return { ...prev, draft: { ...prev.draft, workingHours: nextRows } };
                            })
                          }
                        />
                      </div>
                      {row.enabled ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <TextField
                            label="Открытие"
                            value={row.open}
                            onChange={(value) =>
                              setContactEditor((prev) => {
                                if (!prev) {
                                  return prev;
                                }
                                const nextRows = [...prev.draft.workingHours];
                                nextRows[index] = { ...nextRows[index], open: value };
                                return { ...prev, draft: { ...prev.draft, workingHours: nextRows } };
                              })
                            }
                            type="time"
                          />
                          <TextField
                            label="Закрытие"
                            value={row.close}
                            onChange={(value) =>
                              setContactEditor((prev) => {
                                if (!prev) {
                                  return prev;
                                }
                                const nextRows = [...prev.draft.workingHours];
                                nextRows[index] = { ...nextRows[index], close: value };
                                return { ...prev, draft: { ...prev.draft, workingHours: nextRows } };
                              })
                            }
                            type="time"
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <TextAreaField
                label="Примечание"
                value={contactEditor.draft.note}
                onChange={(value) =>
                  setContactEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, note: value } } : prev,
                  )
                }
                rows={3}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                void saveContactEditor();
              }}
              disabled={busyKey === 'contacts-save'}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-screen px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'contacts-save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить контакт
            </button>
          </div>
        ) : null}
      </PageSheet>

      <PageSheet
        open={Boolean(specialistEditor)}
        onDismiss={() => setSpecialistEditor(null)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight, 720)]}
        defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? 0}
      >
        {specialistEditor ? (
          <div className="bg-white px-4 pb-6 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[20px] font-extrabold text-ink">{specialistEditor.source.name}</h3>
                <p className="mt-1 text-[14px] font-semibold text-muted">Редактор карточки специалиста для клиентского сайта.</p>
              </div>
              <button type="button" onClick={() => setSpecialistEditor(null)} className="rounded-lg p-2 text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-[#f4f6f9] px-4 py-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
                    {specialistEditor.draft.photoPreviewUrl ? (
                      <img src={specialistEditor.draft.photoPreviewUrl} alt={specialistEditor.source.name} className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-8 w-8 text-[#68768a]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openMediaPicker({
                            entity: 'specialists',
                            target: 'specialist-photo',
                            title: `Фото специалиста: ${specialistEditor.source.name}`,
                            currentAssetId: specialistEditor.draft.photoAssetId || null,
                          })
                        }
                        className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink"
                      >
                        <Image className="h-4 w-4" />
                        Медиатека
                      </button>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink">
                        <Upload className="h-4 w-4" />
                        Загрузить фото
                        <input type="file" accept="image/*" onChange={handleSpecialistPhotoSelect} className="hidden" />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setSpecialistEditor((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  draft: {
                                    ...prev.draft,
                                    photoAssetId: '',
                                    photoPreviewUrl: '',
                                  },
                                }
                              : prev,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink"
                      >
                        <Trash2 className="h-4 w-4" />
                        Убрать фото
                      </button>
                    </div>
                    <p className="mt-3 text-[13px] font-semibold text-[#8590a0]">
                      assetId: {specialistEditor.draft.photoAssetId || 'не выбран'}
                    </p>
                  </div>
                </div>
              </div>

              <TextField
                label="Специализация"
                value={specialistEditor.draft.specialty}
                onChange={(value) =>
                  setSpecialistEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, specialty: value } } : prev,
                  )
                }
              />
              <TextAreaField
                label="Текст о специалисте"
                value={specialistEditor.draft.info}
                onChange={(value) =>
                  setSpecialistEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, info: value } } : prev,
                  )
                }
                rows={5}
              />
              <TextField
                label="Текст кнопки"
                value={specialistEditor.draft.ctaText}
                onChange={(value) =>
                  setSpecialistEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, ctaText: value } } : prev,
                  )
                }
              />
              <TextField
                label="Порядок"
                value={specialistEditor.draft.sortOrder}
                onChange={(value) =>
                  setSpecialistEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, sortOrder: value } } : prev,
                  )
                }
                type="number"
              />
              <ToggleField
                label="Показывать специалиста"
                checked={specialistEditor.draft.isVisible}
                onToggle={() =>
                  setSpecialistEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, isVisible: !prev.draft.isVisible } } : prev,
                  )
                }
              />
            </div>

            <button
              type="button"
              onClick={() => {
                void saveSpecialistEditor();
              }}
              disabled={busyKey === `specialist-save:${specialistEditor.source.staffId}`}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-screen px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === `specialist-save:${specialistEditor.source.staffId}` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Сохранить карточку
            </button>
          </div>
        ) : null}
      </PageSheet>

      <PageSheet
        open={Boolean(blockEditor)}
        onDismiss={() => setBlockEditor(null)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight, 760)]}
        defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? 0}
      >
        {blockEditor ? (
          <div className="bg-white px-4 pb-6 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[20px] font-extrabold text-ink">
                  {blockEditor.mode === 'create' ? 'Новый блок' : 'Редактировать блок'}
                </h3>
                <p className="mt-1 text-[14px] font-semibold text-muted">{blockEditor.scopeTitle}</p>
              </div>
              <button type="button" onClick={() => setBlockEditor(null)} className="rounded-lg p-2 text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-[14px] font-semibold text-muted">Тип блока</span>
                <select
                  value={blockEditor.draft.blockType}
                  onChange={(event) =>
                    setBlockEditor((prev) =>
                      prev
                        ? {
                            ...prev,
                            draft: {
                              ...prev.draft,
                              blockType: event.target.value as BlockType,
                              payloadText: toJsonText(
                                createDefaultBlockPayload(event.target.value as BlockType, contacts),
                              ),
                            },
                          }
                        : prev,
                    )
                  }
                  className="w-full rounded-2xl border-[2px] border-line bg-white px-4 py-3 text-[17px] font-medium text-ink outline-none"
                >
                  {blockEditor.allowedTypes.map((type) => (
                    <option key={type} value={type}>
                      {BLOCK_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="blockKey"
                  value={blockEditor.draft.blockKey}
                  onChange={(value) =>
                    setBlockEditor((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, blockKey: slugify(value) } } : prev,
                    )
                  }
                />
                <TextField
                  label="sortOrder"
                  value={blockEditor.draft.sortOrder}
                  onChange={(value) =>
                    setBlockEditor((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, sortOrder: value } } : prev,
                    )
                  }
                  type="number"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-[14px] font-semibold text-muted">Платформа</span>
                  <select
                    value={blockEditor.draft.platform}
                    onChange={(event) =>
                      setBlockEditor((prev) =>
                        prev
                          ? {
                              ...prev,
                              draft: {
                                ...prev.draft,
                                platform: event.target.value as PlatformInput,
                              },
                            }
                          : prev,
                      )
                    }
                    className="w-full rounded-2xl border-[2px] border-line bg-white px-4 py-3 text-[17px] font-medium text-ink outline-none"
                  >
                    {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <TextField
                  label="Мин. версия"
                  value={blockEditor.draft.minAppVersion}
                  onChange={(value) =>
                    setBlockEditor((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, minAppVersion: value } } : prev,
                    )
                  }
                />
                <TextField
                  label="Макс. версия"
                  value={blockEditor.draft.maxAppVersion}
                  onChange={(value) =>
                    setBlockEditor((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, maxAppVersion: value } } : prev,
                    )
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Показывать с"
                  value={blockEditor.draft.startAt}
                  onChange={(value) =>
                    setBlockEditor((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, startAt: value } } : prev,
                    )
                  }
                  type="datetime-local"
                />
                <TextField
                  label="Показывать до"
                  value={blockEditor.draft.endAt}
                  onChange={(value) =>
                    setBlockEditor((prev) =>
                      prev ? { ...prev, draft: { ...prev.draft, endAt: value } } : prev,
                    )
                  }
                  type="datetime-local"
                />
              </div>

              <ToggleField
                label="Блок активен"
                checked={blockEditor.draft.isEnabled}
                onToggle={() =>
                  setBlockEditor((prev) =>
                    prev ? { ...prev, draft: { ...prev.draft, isEnabled: !prev.draft.isEnabled } } : prev,
                  )
                }
              />

              <div className="rounded-2xl bg-[#f4f6f9] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[16px] font-extrabold text-ink">Содержимое блока</p>
                    <p className="mt-1 text-[13px] font-semibold leading-relaxed text-[#7c8593]">
                      Для стандартных типов доступны понятные формы. Прямое редактирование данных в формате JSON оставлено для сложных случаев.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={applyBlockTemplate}
                    className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[13px] font-extrabold text-ink"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Шаблон
                  </button>
                </div>
                <div className="mt-4">{renderBlockPayloadEditor()}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void saveBlockEditor();
              }}
              disabled={busyKey === 'block-create' || busyKey === `block-save:${blockEditor.source?.id ?? 'draft'}`}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-screen px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'block-create' || busyKey === `block-save:${blockEditor.source?.id ?? 'draft'}` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Сохранить блок
            </button>
          </div>
        ) : null}
      </PageSheet>

      <PageSheet
        open={Boolean(mediaPicker)}
        onDismiss={() => setMediaPicker(null)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight, 760)]}
        defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? 0}
      >
        {mediaPicker ? (
          <div className="bg-white px-4 pb-6 pt-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[20px] font-extrabold text-ink">{mediaPicker.title}</h3>
                <p className="mt-1 text-[14px] font-semibold text-muted">
                  Выберите уже загруженный asset или найдите его по имени файла.
                </p>
              </div>
              <button type="button" onClick={() => setMediaPicker(null)} className="rounded-lg p-2 text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#97a0ad]" />
              <input
                value={mediaPicker.search}
                onChange={(event) =>
                  setMediaPicker((prev) =>
                    prev
                      ? {
                          ...prev,
                          search: event.target.value,
                        }
                      : prev,
                  )
                }
                placeholder="Поиск по имени файла"
                className="w-full rounded-2xl border-[2px] border-line bg-white py-3 pl-12 pr-4 text-[16px] font-medium text-ink outline-none"
              />
            </label>

            {mediaPicker.error ? (
              <div className="mt-4 rounded-2xl border border-[#efd6b5] bg-[#fff6ea] px-4 py-4 text-[15px] font-semibold text-[#8a5f1d]">
                {mediaPicker.error}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {mediaPicker.loading ? (
                <div className="flex items-center justify-center rounded-2xl bg-[#f4f6f9] px-4 py-8 text-[#68768a]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : mediaPicker.items.length === 0 ? (
                <div className="rounded-2xl bg-[#f4f6f9] px-4 py-4 text-[15px] font-semibold text-[#5f6773]">
                  Подходящих файлов не найдено.
                </div>
              ) : (
                mediaPicker.items.map((asset) => {
                  const previewUrl = getMediaAssetPreviewUrl(asset);
                  const isActive = mediaPicker.currentAssetId === asset.id;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => pickMediaAsset(asset)}
                      className={
                        isActive
                          ? 'flex w-full items-start gap-4 rounded-2xl border-2 border-ink bg-[#f4f6f9] px-4 py-4 text-left'
                          : 'flex w-full items-start gap-4 rounded-2xl border border-line bg-[#f8fafc] px-4 py-4 text-left'
                      }
                    >
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
                        {previewUrl ? (
                          <img src={previewUrl} alt={asset.originalFileName} className="h-full w-full object-cover" />
                        ) : (
                          <Image className="h-7 w-7 text-[#68768a]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-extrabold text-ink">{asset.originalFileName}</p>
                        <p className="mt-1 text-[13px] font-semibold text-[#8590a0]">
                          entity: {asset.entity} • usages: {asset.usagesCount ?? 0}
                        </p>
                        <p className="mt-2 break-all text-[12px] font-semibold text-[#8590a0]">{asset.id}</p>
                        <p className="mt-2 text-[13px] font-medium text-[#5f6773]">
                          {asset.originalWidth}×{asset.originalHeight}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </PageSheet>

    </>
  );
}
