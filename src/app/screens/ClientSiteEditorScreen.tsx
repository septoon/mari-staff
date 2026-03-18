import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgePercent,
  ChevronRight,
  FileText,
  House,
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
  Shield,
  SlidersHorizontal,
  Trash2,
  Upload,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { ApiError, api } from '../../api';
import { buildRuPhoneValue } from '../helpers';
import { convertImageFileToWebp, uploadWebpImage } from '../media';
import { PageSheet } from '../components/shared/PageSheet';
import {
  applyBookingPageTemplate,
  countConfiguredSiteBookingPageSections,
  createSiteBookingPageDraft,
  mergeSiteBookingPageIntoExtra,
  SITE_BOOKING_PAGE_DEFAULTS,
  type SiteBookingPageDraft,
} from '../clientSiteBookingPage';
import {
  SITE_HOME_PAGE_DEFAULTS,
  SITE_HOME_PAGE_SECTION_COUNT,
  countConfiguredSiteHomePageSections,
  createSiteHomePageDraft,
  mergeSiteHomePageIntoExtra,
  type SiteHomePageDraft,
} from '../clientSiteHomePage';
import {
  createSiteCardsDraft,
  mergeSiteCardsIntoExtra,
  type SiteCardsDraft,
  type SiteLocationRecord,
  type SiteNewsRecord,
  type SiteOfferRecord,
  type SitePolicyRecord,
} from '../clientSiteCards';
import {
  SITE_PAGE_HERO_DEFINITIONS,
  countConfiguredSitePageHeroes,
  createSitePageHeroDraft,
  mergeSitePageHeroesIntoExtra,
  resolveSitePageHeroPreview,
  type SitePageHeroDraft,
  type SitePageHeroKey,
} from '../clientSitePageHeroes';

type ClientSiteEditorScreenProps = {
  onBack: () => void;
  onOpenServices: () => void;
};

type CategoryKey =
  | 'home'
  | 'general'
  | 'services'
  | 'specialists'
  | 'contacts'
  | 'page'
  | 'promo'
  | 'legal'
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

type ServiceCategoryRecord = {
  id: string;
  name: string;
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
  serviceCategories: Loadable<ListResponse<ServiceCategoryRecord>>;
  releases: Loadable<ListResponse<ReleaseRecord>>;
};

type CategorySnapshot = CategoryMeta & {
  stat: string;
  details: string[];
  warning?: string;
};

const CLIENT_SITE_EDITOR_BASE_ROUTE = '/online-booking';

const CATEGORY_ROUTE_SEGMENTS: Record<CategoryKey, string> = {
  home: 'glavnaya',
  general: 'osnovnoe',
  services: 'uslugi',
  specialists: 'specialisty',
  contacts: 'kontakty',
  page: 'stranica',
  promo: 'akcii',
  legal: 'politika-konfidentsialnosti',
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

type HomePageObjectSectionKey =
  | 'hero'
  | 'categories'
  | 'featuredServices'
  | 'featuredSpecialists'
  | 'contacts'
  | 'bottomCta';

const STANDARD_FEATURE_FLAGS_EXAMPLE = `{
  "booking.webBeta": {
    "defaultEnabled": false,
    "rules": [
      {
        "platform": "web",
        "enabled": true
      }
    ]
  }
}`;

const STANDARD_EXTRA_EXAMPLE = `{
  "pageHero": {
    "booking": {
      "eyebrow": "Онлайн-запись",
      "title": "Выберите услугу и удобное время",
      "description": "Показываем только актуальные услуги, специалистов и доступные окна."
    }
  },
  "bookingPage": {
    "heroActions": {
      "phoneLabel": "Позвонить",
      "servicesLabel": "Смотреть услуги",
      "contactsLabel": "Контакты"
    },
    "panel": {
      "title": "Соберите визит под свою задачу",
      "description": "Сначала выберите услуги, потом дату и специалиста."
    }
  },
  "siteContent": {
    "policy": {
      "title": "Политика конфиденциальности",
      "summaryTitle": "Что важно знать",
      "sections": [
        {
          "id": "policy-scope",
          "title": "1. Что регулирует этот документ",
          "paragraphs": [
            "Какие данные сайт получает и зачем.",
            "Как это связано с записью, кабинетом и обратной связью."
          ]
        }
      ]
    }
  }
}`;

type BookingPageSectionKey = keyof SiteBookingPageDraft;

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

type ServiceEditorState = {
  mode: 'create' | 'edit';
  source: ServiceRecord | null;
  draft: {
    name: string;
    nameOnline: string;
    description: string;
    categoryId: string;
    durationMinutes: string;
    priceMin: string;
    priceMax: string;
    isActive: boolean;
  };
};

type OfferEditorState = {
  mode: 'create' | 'edit';
  sourceSlug: string | null;
  draft: {
    slug: string;
    title: string;
    subtitle: string;
    description: string;
    badge: string;
    priceNote: string;
    ctaHref: string;
  };
};

type NewsEditorState = {
  mode: 'create' | 'edit';
  sourceSlug: string | null;
  draft: {
    slug: string;
    title: string;
    category: string;
    publishedAt: string;
    excerpt: string;
    bodyText: string;
  };
};

type LocationEditorState = {
  mode: 'create' | 'edit';
  sourceSlug: string | null;
  source: SiteLocationRecord | null;
  draft: {
    slug: string;
    name: string;
    district: string;
    address: string;
    phone: string;
    workingHours: string;
    mapUrl: string;
    description: string;
    note: string;
  };
};

const categories: CategoryMeta[] = [
  {
    key: 'home',
    title: 'Главная страница',
    description: 'Первый экран сайта MARI, смысловые секции, карточки доверия и финальный CTA на маршруте /.',
    note: 'Здесь редактируется именно главная страница сайта. Каталоги услуг и специалистов остаются в профильных разделах ниже.',
    tags: ['hero', 'секции /', 'карточки доверия', 'cta'],
    icon: House,
  },
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
    description: 'Адрес, телефон и почта, которые видит клиент на сайте.',
    note: 'Простой набор контактов без лишних сущностей: только то, что реально показывается клиенту.',
    tags: ['адрес', 'телефон', 'почта'],
    icon: MapPin,
  },
  {
    key: 'page',
    title: 'Страница записи',
    description: 'Шапка /booking, кнопки hero и тексты рабочей панели, которые реально видит клиент на сайте.',
    note: 'Здесь собраны именно те элементы, которые используются в mari на странице /booking. Пустые generic-блоки больше не являются обязательной частью редактирования.',
    tags: ['hero /booking', 'тексты панели', 'подсказки', 'cta'],
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
    key: 'legal',
    title: 'Политика конфиденциальности',
    description: 'Блоки политики, cookie-уведомление и отдельные тексты согласия на обработку данных.',
    note: 'Эта категория управляет страницей /privacy-policy, cookie-баннером и текстами согласия в формах регистрации и записи.',
    tags: ['блоки политики', 'cookie-баннер', 'согласие на ПДн', 'юридический текст'],
    icon: Shield,
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
    title: 'Состояние сайта',
    description: 'Проверка текущего результата и история автопубликаций.',
    note: 'Изменения из редактора публикуются сразу. Этот раздел нужен для контроля результата и истории версий.',
    tags: ['результат', 'автопубликация', 'история изменений'],
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
  serviceCategories: { data: null, error: null },
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

function createPrimaryContactDraft(contact: ContactPointRecord | null): ContactEditorState['draft'] {
  const draft = createContactEditorState(contact).draft;
  if (contact) {
    return draft;
  }

  return {
    ...draft,
    id: 'primary-contact',
    name: '',
    publicName: '',
    legalName: '',
    aliasesText: '',
    addressLabel: 'Адрес',
    addressLine1: '',
    addressLine2: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
    addressComment: '',
    phoneLabel: 'Телефон',
    phoneE164: '',
    phoneDisplay: '',
    email: '',
    website: '',
    mapUrl: '',
    orderIndex: '0',
    isPrimary: true,
    note: '',
    tagsText: '',
    startAt: '',
    endAt: '',
    workingHours: buildWorkingHoursDraft(undefined),
  };
}

function findPrimaryContact(contacts: ContactPointRecord[]): ContactPointRecord | null {
  return contacts.find((item) => item.isPrimary) ?? contacts[0] ?? null;
}

function normalizeContactPhoneValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('+')) {
    const normalized = trimmed.replace(/[^\d+]/g, '');
    return /^\+[1-9]\d{6,14}$/.test(normalized) ? normalized : '';
  }
  return buildRuPhoneValue(trimmed);
}

function getContactPhoneInputValue(draft: ContactEditorState['draft']) {
  return draft.phoneDisplay.trim() || draft.phoneE164.trim();
}

function validateContactDraft(draft: ContactEditorState['draft']): string | null {
  if (!draft.id.trim()) {
    return 'У контакта должен быть id';
  }
  if (!draft.name.trim()) {
    return 'У контакта должно быть имя';
  }
  if (!draft.addressLabel.trim() || !draft.addressLine1.trim()) {
    return 'Для контакта нужен хотя бы один адрес';
  }
  if (!draft.phoneLabel.trim() || !draft.phoneE164.trim()) {
    return 'Для контакта нужен хотя бы один телефон';
  }
  if (!/^\+[1-9]\d{6,14}$/.test(draft.phoneE164.trim())) {
    return 'Телефон должен быть в формате E.164';
  }

  return null;
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

function createServiceEditorState(
  service: ServiceRecord | null,
  categories: ServiceCategoryRecord[],
): ServiceEditorState {
  return {
    mode: service ? 'edit' : 'create',
    source: service,
    draft: {
      name: service?.name ?? '',
      nameOnline: service?.nameOnline ?? '',
      description: service?.description ?? '',
      categoryId: service?.category.id ?? categories[0]?.id ?? '',
      durationMinutes: service ? String(Math.max(1, Math.round(service.durationSec / 60))) : '60',
      priceMin: service ? String(service.priceMin) : '0',
      priceMax: service?.priceMax === null || service?.priceMax === undefined ? '' : String(service.priceMax),
      isActive: service?.isActive ?? true,
    },
  };
}

function createOfferEditorState(offer: SiteOfferRecord | null): OfferEditorState {
  return {
    mode: offer ? 'edit' : 'create',
    sourceSlug: offer?.slug ?? null,
    draft: {
      slug: offer?.slug ?? '',
      title: offer?.title ?? '',
      subtitle: offer?.subtitle ?? '',
      description: offer?.description ?? '',
      badge: offer?.badge ?? '',
      priceNote: offer?.priceNote ?? '',
      ctaHref: offer?.ctaHref ?? '/booking',
    },
  };
}

function createNewsEditorState(article: SiteNewsRecord | null): NewsEditorState {
  return {
    mode: article ? 'edit' : 'create',
    sourceSlug: article?.slug ?? null,
    draft: {
      slug: article?.slug ?? '',
      title: article?.title ?? '',
      category: article?.category ?? '',
      publishedAt: article?.publishedAt ?? '',
      excerpt: article?.excerpt ?? '',
      bodyText: article?.body.join('\n\n') ?? '',
    },
  };
}

function createPolicySectionRecord(index: number): SitePolicyRecord['sections'][number] {
  return {
    id: `policy-section-${Date.now()}-${index}`,
    title: '',
    paragraphs: ['']
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
          <div className="flex w-full items-center justify-between gap-2 pt-1 sm:w-auto sm:shrink-0 sm:justify-start">

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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[22px] font-extrabold text-ink">{title}</h2>
          {subtitle ? <p className="mt-1 text-[15px] font-medium leading-relaxed text-[#5f6773]">{subtitle}</p> : null}
        </div>
        {action ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{action}</div> : null}
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
  const [pageHeroDraft, setPageHeroDraft] = useState<SitePageHeroDraft>(() => createSitePageHeroDraft({}));
  const [bookingPageDraft, setBookingPageDraft] = useState<SiteBookingPageDraft>(() =>
    createSiteBookingPageDraft({})
  );
  const [homePageDraft, setHomePageDraft] = useState<SiteHomePageDraft>(() =>
    createSiteHomePageDraft({})
  );
  const [siteCardsDraft, setSiteCardsDraft] = useState<SiteCardsDraft>(() => createSiteCardsDraft({}));
  const [advancedDraft, setAdvancedDraft] = useState<AdvancedDraft>({
    featureFlagsJson: '{}',
    extraJson: '{}',
  });
  const [contactEditor, setContactEditor] = useState<ContactEditorState | null>(null);
  const [primaryContactDraft, setPrimaryContactDraft] = useState<ContactEditorState['draft']>(
    () => createPrimaryContactDraft(null),
  );
  const [specialistEditor, setSpecialistEditor] = useState<SpecialistEditorState | null>(null);
  const [serviceEditor, setServiceEditor] = useState<ServiceEditorState | null>(null);
  const [offerEditor, setOfferEditor] = useState<OfferEditorState | null>(null);
  const [newsEditor, setNewsEditor] = useState<NewsEditorState | null>(null);
  const [locationEditor, setLocationEditor] = useState<LocationEditorState | null>(null);
  const [blockEditor, setBlockEditor] = useState<BlockEditorState | null>(null);
  const [mediaPicker, setMediaPicker] = useState<MediaPickerState | null>(null);
  const [assetUrlMap, setAssetUrlMap] = useState<Record<string, string>>({});

  const config = screenData.config.data;
  const contacts = useMemo(() => config?.contacts ?? [], [config]);
  const primaryContact = useMemo(() => findPrimaryContact(contacts), [contacts]);
  const blocks = useMemo(() => screenData.blocks.data?.items ?? [], [screenData.blocks.data]);
  const specialists = useMemo(() => screenData.specialists.data?.items ?? [], [screenData.specialists.data]);
  const services = useMemo(() => screenData.services.data?.items ?? [], [screenData.services.data]);
  const serviceCategories = useMemo<ServiceCategoryRecord[]>(
    () =>
      screenData.serviceCategories.data?.items ??
      Array.from(new Map(services.map((item) => [item.category.id, { id: item.category.id, name: item.category.name }])).values()).sort(
        (left, right) => left.name.localeCompare(right.name, 'ru'),
      ),
    [screenData.serviceCategories.data, services],
  );
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

  useEffect(() => {
    setPrimaryContactDraft(createPrimaryContactDraft(primaryContact));
  }, [primaryContact]);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    const [nextConfig, nextBlocks, nextSpecialists, nextServices, nextServiceCategories, nextReleases] = await Promise.all([
      safeGet<ClientConfigRecord>('/client-front/staff/config'),
      safeGet<ListResponse<BlockRecord>>('/client-front/staff/blocks'),
      safeGet<ListResponse<SpecialistRecord>>('/client-front/staff/specialists'),
      safeGet<ListResponse<ServiceRecord>>('/services'),
      safeGet<ListResponse<ServiceCategoryRecord>>('/services/categories'),
      safeGet<ListResponse<ReleaseRecord>>('/client-front/staff/releases?page=1&limit=20'),
    ]);
    setScreenData({
      config: nextConfig,
      blocks: nextBlocks,
      specialists: nextSpecialists,
      services: nextServices,
      serviceCategories: nextServiceCategories,
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
    setPageHeroDraft(createSitePageHeroDraft(config.extra ?? {}));
    setBookingPageDraft(createSiteBookingPageDraft(config.extra ?? {}));
    setHomePageDraft(createSiteHomePageDraft(config.extra ?? {}));
    setSiteCardsDraft(createSiteCardsDraft(config.extra ?? {}));
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
    const configuredPageHeroes = countConfiguredSitePageHeroes(config?.extra ?? {});
    const configuredBookingPageSections = countConfiguredSiteBookingPageSections(config?.extra ?? {});
    const servicesCategoriesCount = serviceCategories.length || new Set(services.map((item) => item.category.id)).size;
    const activeServices = services.filter((item) => item.isActive);
    const visibleSpecialists = specialists.filter((item) => item.isVisible);

    return categories.map((category) => {
      switch (category.key) {
        case 'home':
          return {
            ...category,
            stat: screenData.config.error
              ? screenData.config.error
              : `${countConfiguredSiteHomePageSections(config?.extra ?? {})}/${SITE_HOME_PAGE_SECTION_COUNT}`,
            details: [
              `Преимуществ: ${homePageDraft.valuePillars.items.length}`,
              `Карточек доверия: ${homePageDraft.highlights.length}`,
              'Карточки каталога и специалистов берутся из профильных разделов.',
            ],
            warning: screenData.config.error || undefined,
          };
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
          {
            const primaryPhone =
              primaryContact?.phones.find((item) => item.primary) ?? primaryContact?.phones[0];
            const primaryAddress = primaryContact?.addresses[0];
            const primaryEmail = primaryContact?.emails?.[0];

          return {
            ...category,
            stat: screenData.config.error ? screenData.config.error : primaryContact ? 'заполнено' : 'пусто',
            details: primaryContact
              ? [
                  `Адрес: ${primaryAddress?.line1 || 'не задан'}`,
                  `Телефон: ${primaryPhone?.display || primaryPhone?.e164 || 'не задан'}`,
                  `Email: ${primaryEmail || 'не задан'}`,
                ]
              : ['Контакты пока не заполнены.'],
            warning: screenData.config.error || undefined,
          };
          }
        case 'page':
          return {
            ...category,
            stat:
              screenData.config.error || screenData.blocks.error
                ? screenData.config.error || screenData.blocks.error || 'частично'
                : `${configuredBookingPageSections}/5`,
            details: [
              `Кастомных шапок страниц: ${configuredPageHeroes}`,
              `Секций контента записи: ${configuredBookingPageSections} из 5`,
              `Старых generic-блоков: ${pageBlocks.length}`,
            ],
            warning:
              screenData.config.error || screenData.blocks.error
                ? 'Часть настроек страниц сейчас недоступна.'
                : pageBlocks.length > 0
                  ? 'В конфигурации остались старые generic-блоки. Они вынесены ниже как legacy-слой и не являются основной моделью сайта mari.'
                : undefined,
          };
        case 'promo':
          return {
            ...category,
            stat: screenData.blocks.error ? screenData.blocks.error : `${siteCardsDraft.offers.length + siteCardsDraft.news.length}`,
            details: [
              `Карточек предложений: ${siteCardsDraft.offers.length}`,
              `Карточек статей: ${siteCardsDraft.news.length}`,
              `Маркетинговых блоков: ${promoBlocks.length}`,
            ],
            warning: screenData.blocks.error || undefined,
          };
        case 'legal':
          return {
            ...category,
            stat: screenData.config.error ? screenData.config.error : `${siteCardsDraft.policy.sections.length} блоков`,
            details: [
              `Секций документа: ${siteCardsDraft.policy.sections.length}`,
              `Cookie-баннер: ${siteCardsDraft.policy.cookieBannerTitle.trim() ? 'настроен' : 'пусто'}`,
              `Согласие в записи: ${siteCardsDraft.policy.bookingConsentLabel.trim() ? 'настроено' : 'пусто'}`,
              `Согласие в регистрации: ${siteCardsDraft.policy.accountConsentLabel.trim() ? 'настроено' : 'пусто'}`,
            ],
            warning: screenData.config.error || undefined,
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
              `Legacy-блоков в черновике: ${blocks.length}`,
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
  }, [blocks, config, homePageDraft.highlights.length, homePageDraft.valuePillars.items.length, primaryContact, releases, screenData.blocks.error, screenData.config.error, screenData.releases.error, screenData.services.error, screenData.specialists.error, serviceCategories.length, services, siteCardsDraft.news.length, siteCardsDraft.offers.length, siteCardsDraft.policy.accountConsentLabel, siteCardsDraft.policy.bookingConsentLabel, siteCardsDraft.policy.cookieBannerTitle, siteCardsDraft.policy.sections.length, specialists]);

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
        screenData.serviceCategories.error,
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
      try {
        const result = await api.post<{ version: number }>('/client-front/staff/publish', {});
        await loadData({ silent: true });
        if (previewState.data || previewState.error || activeCategory === 'publish') {
          const preview = await safeGet<PreviewRecord>('/client-front/staff/preview?platform=web');
          setPreviewState(preview);
        }
        setBanner('success', `${successMessage}. Сразу опубликована версия v${result.version}.`);
      } catch (publishError) {
        await loadData({ silent: true });
        setBanner('error', `Изменения сохранены, но автопубликация не удалась: ${getErrorMessage(publishError)}`);
      }
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const updatePageHeroField = (key: SitePageHeroKey, field: keyof SitePageHeroDraft[SitePageHeroKey], value: string) => {
    setPageHeroDraft((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const resetPageHeroFields = (key: SitePageHeroKey) => {
    setPageHeroDraft((prev) => ({
      ...prev,
      [key]: {
        eyebrow: '',
        title: '',
        description: '',
      },
    }));
  };

  const savePageHeroes = async () => {
    await saveConfigPatch(
      {
        extra: mergeSitePageHeroesIntoExtra(config?.extra ?? {}, pageHeroDraft),
      },
      'Шапки страниц сохранены',
    );
  };

  const updateHomePageField = <
    TSection extends HomePageObjectSectionKey,
    TField extends keyof SiteHomePageDraft[TSection]
  >(
    section: TSection,
    field: TField,
    value: string,
  ) => {
    setHomePageDraft((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const resetHomePageSection = (section: HomePageObjectSectionKey) => {
    setHomePageDraft((prev) => ({
      ...prev,
      [section]: {
        ...SITE_HOME_PAGE_DEFAULTS[section],
      },
    }));
  };

  const resetHomePageHeroVisual = () => {
    setHomePageDraft((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        visualLabel: SITE_HOME_PAGE_DEFAULTS.hero.visualLabel,
        visualTitle: SITE_HOME_PAGE_DEFAULTS.hero.visualTitle,
        visualSubtitle: SITE_HOME_PAGE_DEFAULTS.hero.visualSubtitle,
      },
    }));
  };

  const updateHomePageValuePillarsField = (
    field: keyof Omit<SiteHomePageDraft['valuePillars'], 'items'>,
    value: string,
  ) => {
    setHomePageDraft((prev) => ({
      ...prev,
      valuePillars: {
        ...prev.valuePillars,
        [field]: value,
      },
    }));
  };

  const updateHomePageValuePillarItem = (
    index: number,
    field: keyof SiteHomePageDraft['valuePillars']['items'][number],
    value: string,
  ) => {
    setHomePageDraft((prev) => ({
      ...prev,
      valuePillars: {
        ...prev.valuePillars,
        items: prev.valuePillars.items.map((item, currentIndex) =>
          currentIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item,
        ),
      },
    }));
  };

  const resetHomePageValuePillars = () => {
    setHomePageDraft((prev) => ({
      ...prev,
      valuePillars: {
        ...SITE_HOME_PAGE_DEFAULTS.valuePillars,
        items: SITE_HOME_PAGE_DEFAULTS.valuePillars.items.map((item) => ({ ...item })),
      },
    }));
  };

  const updateHomePageHighlightItem = (
    index: number,
    field: keyof SiteHomePageDraft['highlights'][number],
    value: string,
  ) => {
    setHomePageDraft((prev) => ({
      ...prev,
      highlights: prev.highlights.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    }));
  };

  const resetHomePageHighlights = () => {
    setHomePageDraft((prev) => ({
      ...prev,
      highlights: SITE_HOME_PAGE_DEFAULTS.highlights.map((item) => ({ ...item })),
    }));
  };

  const saveHomePage = async () => {
    await saveConfigPatch(
      {
        extra: mergeSiteHomePageIntoExtra(config?.extra ?? {}, homePageDraft),
      },
      'Главная страница сайта сохранена',
    );
  };

  const updateBookingPageField = <
    TSectionKey extends BookingPageSectionKey,
    TFieldKey extends keyof SiteBookingPageDraft[TSectionKey]
  >(
    section: TSectionKey,
    field: TFieldKey,
    value: string
  ) => {
    setBookingPageDraft((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const resetBookingPageSection = (section: BookingPageSectionKey) => {
    setBookingPageDraft((prev) => ({
      ...prev,
      [section]: Object.keys(prev[section]).reduce<Record<string, string>>((acc, key) => {
        acc[key] = '';
        return acc;
      }, {}) as SiteBookingPageDraft[typeof section],
    }));
  };

  const saveBookingPage = async () => {
    await saveConfigPatch(
      {
        extra: mergeSiteBookingPageIntoExtra(config?.extra ?? {}, bookingPageDraft),
      },
      'Контент страницы записи сохранен',
    );
  };

  const saveSiteCards = async (nextDraft: SiteCardsDraft, successMessage: string) => {
    setBusyKey('site-cards');
    setMessage(null);
    try {
      await api.patch('/client-front/staff/config', {
        extra: mergeSiteCardsIntoExtra(config?.extra ?? {}, nextDraft),
      });
      try {
        const result = await api.post<{ version: number }>('/client-front/staff/publish', {});
        await loadData({ silent: true });
        if (previewState.data || previewState.error || activeCategory === 'publish') {
          const preview = await safeGet<PreviewRecord>('/client-front/staff/preview?platform=web');
          setPreviewState(preview);
        }
        setBanner('success', `${successMessage}. Сразу опубликована версия v${result.version}.`);
        return true;
      } catch (publishError) {
        await loadData({ silent: true });
        setBanner('error', `Изменения сохранены, но автопубликация не удалась: ${getErrorMessage(publishError)}`);
        return false;
      }
    } catch (error) {
      setBanner('error', getErrorMessage(error));
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const toggleSpecialistVisibility = async (specialist: SpecialistRecord, isVisible: boolean) => {
    setBusyKey(`specialist-visibility:${specialist.staffId}`);
    setMessage(null);
    try {
      await api.patch(`/client-front/staff/specialists/${specialist.staffId}`, {
        isVisible,
      });
      try {
        const result = await api.post<{ version: number }>('/client-front/staff/publish', {});
        await loadData({ silent: true });
        setBanner(
          'success',
          `${isVisible ? 'Карточка специалиста добавлена на сайт' : 'Карточка специалиста скрыта с сайта'}. Сразу опубликована версия v${result.version}.`
        );
      } catch (publishError) {
        await loadData({ silent: true });
        setBanner('error', `Изменения сохранены, но автопубликация не удалась: ${getErrorMessage(publishError)}`);
      }
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const openServiceEditor = (service: ServiceRecord | null) => {
    setMessage(null);
    setServiceEditor(createServiceEditorState(service, serviceCategories));
  };

  const saveServiceEditor = async () => {
    if (!serviceEditor) {
      return;
    }

    if (!serviceEditor.draft.name.trim()) {
      setBanner('error', 'Услуга должна иметь название');
      return;
    }
    if (!serviceEditor.draft.categoryId) {
      setBanner('error', 'Для услуги нужна категория');
      return;
    }

    const durationMinutes = Number(serviceEditor.draft.durationMinutes);
    const priceMin = Number(serviceEditor.draft.priceMin);
    const priceMax = serviceEditor.draft.priceMax.trim() ? Number(serviceEditor.draft.priceMax) : null;

    if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
      setBanner('error', 'Длительность должна быть больше 0 минут');
      return;
    }
    if (!Number.isFinite(priceMin) || priceMin < 0) {
      setBanner('error', 'Минимальная цена должна быть числом не меньше 0');
      return;
    }
    if (priceMax !== null && (!Number.isFinite(priceMax) || priceMax < 0)) {
      setBanner('error', 'Максимальная цена должна быть числом не меньше 0');
      return;
    }

    setBusyKey(serviceEditor.mode === 'create' ? 'service-create' : `service-save:${serviceEditor.source?.id ?? 'draft'}`);
    setMessage(null);
    try {
      const payload = {
        name: serviceEditor.draft.name.trim(),
        nameOnline: serviceEditor.draft.nameOnline.trim() || null,
        description: serviceEditor.draft.description.trim() || undefined,
        categoryId: serviceEditor.draft.categoryId,
        durationSec: Math.round(durationMinutes * 60),
        priceMin,
        priceMax,
        isActive: serviceEditor.draft.isActive,
      };

      if (serviceEditor.mode === 'create') {
        await api.post('/services', payload);
      } else if (serviceEditor.source) {
        await api.patch(`/services/${serviceEditor.source.id}`, payload);
      }

      setServiceEditor(null);
      await loadData({ silent: true });
      setBanner('success', 'Карточка услуги сохранена. Изменения для сайта доступны сразу.');
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const deleteService = async (service: ServiceRecord) => {
    const confirmed = window.confirm(`Удалить услугу «${service.nameOnline || service.name}»?`);
    if (!confirmed) {
      return;
    }
    setBusyKey(`service-delete:${service.id}`);
    setMessage(null);
    try {
      await api.delete(`/services/${service.id}`);
      await loadData({ silent: true });
      setBanner('success', 'Карточка услуги удалена. Изменения для сайта доступны сразу.');
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const openOfferEditor = (offer: SiteOfferRecord | null) => {
    setMessage(null);
    setOfferEditor(createOfferEditorState(offer));
  };

  const saveOfferEditor = async () => {
    if (!offerEditor) {
      return;
    }
    const draft = offerEditor.draft;
    if (!draft.slug.trim() || !draft.title.trim() || !draft.subtitle.trim() || !draft.description.trim() || !draft.badge.trim() || !draft.priceNote.trim() || !draft.ctaHref.trim()) {
      setBanner('error', 'Для предложения заполните slug, title, subtitle, description, badge, priceNote и ctaHref');
      return;
    }

    const nextItem: SiteOfferRecord = {
      slug: slugify(draft.slug),
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim(),
      description: draft.description.trim(),
      badge: draft.badge.trim(),
      priceNote: draft.priceNote.trim(),
      ctaHref: draft.ctaHref.trim(),
    };
    const nextDraft: SiteCardsDraft = {
      ...siteCardsDraft,
      offers: [
        ...siteCardsDraft.offers.filter((item) => item.slug !== offerEditor.sourceSlug),
        nextItem,
      ].sort((left, right) => left.title.localeCompare(right.title, 'ru')),
      news: siteCardsDraft.news,
      locations: siteCardsDraft.locations,
      policy: siteCardsDraft.policy,
    };

    const saved = await saveSiteCards(nextDraft, 'Офферы сохранены');
    if (saved) {
      setOfferEditor(null);
    }
  };

  const deleteOffer = async (slug: string) => {
    const confirmed = window.confirm('Удалить предложение?');
    if (!confirmed) {
      return;
    }

    const nextDraft: SiteCardsDraft = {
      ...siteCardsDraft,
      offers: siteCardsDraft.offers.filter((item) => item.slug !== slug),
      news: siteCardsDraft.news,
      locations: siteCardsDraft.locations,
      policy: siteCardsDraft.policy,
    };

    await saveSiteCards(nextDraft, 'Предложение удалено');
  };

  const openNewsEditor = (article: SiteNewsRecord | null) => {
    setMessage(null);
    setNewsEditor(createNewsEditorState(article));
  };

  const saveNewsEditor = async () => {
    if (!newsEditor) {
      return;
    }

    const draft = newsEditor.draft;
    const body = draft.bodyText
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!draft.slug.trim() || !draft.title.trim() || !draft.category.trim() || !draft.publishedAt.trim() || !draft.excerpt.trim() || body.length === 0) {
      setBanner('error', 'Для статьи заполните slug, title, category, publishedAt, excerpt и body');
      return;
    }

    const nextItem: SiteNewsRecord = {
      slug: slugify(draft.slug),
      title: draft.title.trim(),
      category: draft.category.trim(),
      publishedAt: draft.publishedAt.trim(),
      excerpt: draft.excerpt.trim(),
      body,
    };

    const nextDraft: SiteCardsDraft = {
      ...siteCardsDraft,
      offers: siteCardsDraft.offers,
      news: [
        ...siteCardsDraft.news.filter((item) => item.slug !== newsEditor.sourceSlug),
        nextItem,
      ].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt)),
      locations: siteCardsDraft.locations,
      policy: siteCardsDraft.policy,
    };

    const saved = await saveSiteCards(nextDraft, 'Статьи сохранены');
    if (saved) {
      setNewsEditor(null);
    }
  };

  const deleteNews = async (slug: string) => {
    const confirmed = window.confirm('Удалить статью?');
    if (!confirmed) {
      return;
    }

    const nextDraft: SiteCardsDraft = {
      ...siteCardsDraft,
      offers: siteCardsDraft.offers,
      news: siteCardsDraft.news.filter((item) => item.slug !== slug),
      locations: siteCardsDraft.locations,
      policy: siteCardsDraft.policy,
    };

    await saveSiteCards(nextDraft, 'Статья удалена');
  };

  const saveLocationEditor = async () => {
    if (!locationEditor) {
      return;
    }

    const draft = locationEditor.draft;
    if (!draft.slug.trim() || !draft.name.trim() || !draft.district.trim() || !draft.address.trim() || !draft.phone.trim() || !draft.workingHours.trim() || !draft.mapUrl.trim() || !draft.description.trim() || !draft.note.trim()) {
      setBanner('error', 'Для локации заполните slug, name, district, address, phone, workingHours, mapUrl, description и note');
      return;
    }

    const nextItem: SiteLocationRecord = {
      ...(locationEditor.source ?? {
        serviceSlugs: [],
        masterSlugs: [],
        features: [],
        interiorMoments: [],
      }),
      slug: slugify(draft.slug),
      name: draft.name.trim(),
      district: draft.district.trim(),
      address: draft.address.trim(),
      phone: draft.phone.trim(),
      workingHours: draft.workingHours.trim(),
      mapUrl: draft.mapUrl.trim(),
      description: draft.description.trim(),
      note: draft.note.trim(),
    };

    const nextDraft: SiteCardsDraft = {
      ...siteCardsDraft,
      offers: siteCardsDraft.offers,
      news: siteCardsDraft.news,
      locations: [
        ...siteCardsDraft.locations.filter((item) => item.slug !== locationEditor.sourceSlug),
        nextItem,
      ].sort((left, right) => left.name.localeCompare(right.name, 'ru')),
      policy: siteCardsDraft.policy,
    };

    const saved = await saveSiteCards(nextDraft, 'Локации сохранены');
    if (saved) {
      setLocationEditor(null);
    }
  };

  const updatePolicyField = (
    field: Exclude<keyof SitePolicyRecord, 'sections'>,
    value: string,
  ) => {
    setSiteCardsDraft((prev) => ({
      ...prev,
      policy: {
        ...prev.policy,
        [field]: value,
      },
    }));
  };

  const updatePolicySection = (
    sectionId: string,
    updater: (section: SitePolicyRecord['sections'][number]) => SitePolicyRecord['sections'][number],
  ) => {
    setSiteCardsDraft((prev) => ({
      ...prev,
      policy: {
        ...prev.policy,
        sections: prev.policy.sections.map((section) =>
          section.id === sectionId ? updater(section) : section,
        ),
      },
    }));
  };

  const addPolicySection = () => {
    setSiteCardsDraft((prev) => ({
      ...prev,
      policy: {
        ...prev.policy,
        sections: [...prev.policy.sections, createPolicySectionRecord(prev.policy.sections.length + 1)],
      },
    }));
  };

  const deletePolicySection = (sectionId: string) => {
    const confirmed = window.confirm('Удалить секцию политики?');
    if (!confirmed) {
      return;
    }

    setSiteCardsDraft((prev) => ({
      ...prev,
      policy: {
        ...prev.policy,
        sections: prev.policy.sections.filter((section) => section.id !== sectionId),
      },
    }));
  };

  const savePolicy = async () => {
    const normalizedSections = siteCardsDraft.policy.sections
      .map((section, index) => ({
        ...section,
        id: section.id.trim() || `policy-section-${index + 1}`,
        title: section.title.trim(),
        paragraphs: section.paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean),
      }))
      .filter((section) => section.title || section.paragraphs.length > 0);

    if (normalizedSections.length === 0) {
      setBanner('error', 'Добавьте хотя бы одну секцию политики конфиденциальности');
      return;
    }

    const invalidSection = normalizedSections.find(
      (section) => !section.title || section.paragraphs.length === 0,
    );

    if (invalidSection) {
      setBanner('error', 'У каждой секции политики должны быть заголовок и хотя бы один абзац');
      return;
    }

    const saved = await saveSiteCards(
      {
        ...siteCardsDraft,
        policy: {
          ...siteCardsDraft.policy,
          sections: normalizedSections,
        },
      },
      'Политика конфиденциальности сохранена',
    );

    if (saved) {
      setSiteCardsDraft((prev) => ({
        ...prev,
        policy: {
          ...prev.policy,
          sections: normalizedSections,
        },
      }));
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

  const savePrimaryContact = async () => {
    const phoneInputValue = getContactPhoneInputValue(primaryContactDraft);
    const normalizedPhone = normalizeContactPhoneValue(phoneInputValue);
    const contactTitle =
      primaryContactDraft.publicName.trim() ||
      primaryContactDraft.name.trim() ||
      config?.brandName?.trim() ||
      'Контакты';
    const normalizedDraft: ContactEditorState['draft'] = {
      ...primaryContactDraft,
      id: primaryContact?.id || primaryContactDraft.id.trim() || 'primary-contact',
      name: contactTitle,
      publicName: contactTitle,
      addressLabel: 'Адрес',
      phoneLabel: 'Телефон',
      phoneDisplay: phoneInputValue.trim(),
      phoneE164: normalizedPhone,
      orderIndex: '0',
      isPrimary: true,
    };
    if (!normalizedDraft.addressLine1.trim()) {
      setBanner('error', 'Укажите адрес');
      return;
    }
    if (!normalizedDraft.phoneDisplay.trim()) {
      setBanner('error', 'Укажите телефон');
      return;
    }
    if (!normalizedPhone) {
      setBanner('error', 'Телефон должен быть в корректном формате');
      return;
    }
    const validationError = validateContactDraft(normalizedDraft);
    if (validationError) {
      setBanner('error', validationError);
      return;
    }

    const nextContact = buildContactPayload({
      mode: primaryContact ? 'edit' : 'create',
      source: primaryContact,
      draft: normalizedDraft,
    });
    const nextContacts = [{ ...nextContact, isPrimary: true, orderIndex: 0 }];
    const contactBlocks = blocks.filter((block) => block.blockType === 'CONTACTS');

    setBusyKey('contact-primary-save');
    setMessage(null);
    try {
      await api.patch('/client-front/staff/config', { contacts: nextContacts });
      if (contactBlocks.length > 0) {
        await Promise.all(
          contactBlocks.map((block) =>
            api.patch(`/client-front/staff/blocks/${block.id}`, {
              blockType: block.blockType,
              payload: {
                ...block.payload,
                items: nextContacts,
              },
              sortOrder: block.sortOrder,
              platform: block.platform ?? undefined,
              minAppVersion: block.minAppVersion ?? undefined,
              maxAppVersion: block.maxAppVersion ?? undefined,
              startAt: block.startAt ?? undefined,
              endAt: block.endAt ?? undefined,
              isEnabled: block.isEnabled,
            }),
          ),
        );
      }
      try {
        const result = await api.post<{ version: number }>('/client-front/staff/publish', {});
        await loadData({ silent: true });
        setBanner('success', `Контакты сохранены и сразу опубликованы. Версия v${result.version}.`);
      } catch (publishError) {
        await loadData({ silent: true });
        setBanner('error', `Контакты сохранены, но автопубликация не удалась: ${getErrorMessage(publishError)}`);
      }
    } catch (error) {
      setBanner('error', getErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const saveContactEditor = async () => {
    if (!contactEditor) {
      return;
    }
    const validationError = validateContactDraft(contactEditor.draft);
    if (validationError) {
      setBanner('error', validationError);
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
      try {
        const result = await api.post<{ version: number }>('/client-front/staff/publish', {});
        setContactEditor(null);
        await loadData({ silent: true });
        setBanner('success', `Контакты сохранены и сразу опубликованы. Версия v${result.version}.`);
      } catch (publishError) {
        await loadData({ silent: true });
        setBanner('error', `Контакты сохранены, но автопубликация не удалась: ${getErrorMessage(publishError)}`);
      }
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
      try {
        const result = await api.post<{ version: number }>('/client-front/staff/publish', {});
        setSpecialistEditor(null);
        await loadData({ silent: true });
        setBanner('success', `Карточка специалиста сохранена и опубликована. Версия v${result.version}.`);
      } catch (publishError) {
        await loadData({ silent: true });
        setBanner('error', `Карточка специалиста сохранена, но автопубликация не удалась: ${getErrorMessage(publishError)}`);
      }
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

      try {
        const result = await api.post<{ version: number }>('/client-front/staff/publish', {});
        setBlockEditor(null);
        await loadData({ silent: true });
        setBanner('success', `Блок сохранён и опубликован. Версия v${result.version}.`);
      } catch (publishError) {
        await loadData({ silent: true });
        setBanner('error', `Блок сохранён, но автопубликация не удалась: ${getErrorMessage(publishError)}`);
      }
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
      try {
        const result = await api.post<{ version: number }>('/client-front/staff/publish', {});
        await loadData({ silent: true });
        setBanner('success', `Блок удалён и опубликован. Версия v${result.version}.`);
      } catch (publishError) {
        await loadData({ silent: true });
        setBanner('error', `Блок удалён, но автопубликация не удалась: ${getErrorMessage(publishError)}`);
      }
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
          Здесь собраны все разделы, которые влияют на то, что увидит клиент на сайте MARI и в онлайн-записи.
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
          Редактор услуг остаётся отдельным разделом, а здесь показано, как весь клиентский сайт выглядит для гостя.
        </div>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] xl:gap-6">
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

  const renderHomeDetail = () => {
    const contactPhone =
      primaryContact?.phones.find((item) => item.primary)?.display ||
      primaryContact?.phones.find((item) => item.primary)?.e164 ||
      primaryContact?.phones[0]?.display ||
      primaryContact?.phones[0]?.e164 ||
      'Телефон из раздела «Контакты»';
    const contactAddress =
      primaryContact?.addresses[0]?.line1 ||
      primaryContact?.addresses[0]?.comment ||
      'Адрес из раздела «Контакты»';
    const contactHours =
      primaryContact?.workingHours?.slice(0, 3).map((item) => `${item.open} - ${item.close}`).join(' · ') ||
      'Часы работы из раздела «Контакты»';

    return (
      <div className="space-y-5">
        <SectionCard
          title="Первый экран /"
          subtitle="Hero, кнопки и редакционный визуал в верхней части главной страницы сайта MARI."
          action={
            <button
              type="button"
              onClick={() => {
                void saveHomePage();
              }}
              disabled={busyKey === 'config'}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'config' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить и опубликовать
            </button>
          }
        >
          <div className="rounded-2xl bg-[#f4f6f9] px-4 py-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">
            Здесь редактируется только смысл и подписи главной страницы.
            Карточки категорий, услуг и специалистов сами по себе меняются в разделах
            {' '}
            <span className="font-semibold text-ink">«Услуги»</span>
            {' '}
            и
            {' '}
            <span className="font-semibold text-ink">«Специалисты»</span>
            .
          </div>

          <article className="mt-4 rounded-[24px] border border-line bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[20px] font-extrabold text-ink">Hero и кнопки</h3>
                <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                  Верхний блок главной страницы со смысловым сообщением и двумя основными действиями.
                </p>
              </div>
              <button
                type="button"
                onClick={() => resetHomePageSection('hero')}
                className="rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
              >
                Сбросить секцию
              </button>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="grid gap-3">
                <TextField label="Eyebrow / подпись" value={homePageDraft.hero.eyebrow} onChange={(value) => updateHomePageField('hero', 'eyebrow', value)} />
                <TextAreaField label="Главный заголовок" value={homePageDraft.hero.title} onChange={(value) => updateHomePageField('hero', 'title', value)} rows={3} />
                <TextAreaField label="Описание" value={homePageDraft.hero.description} onChange={(value) => updateHomePageField('hero', 'description', value)} rows={4} />
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField label="Кнопка primary" value={homePageDraft.hero.primaryCtaLabel} onChange={(value) => updateHomePageField('hero', 'primaryCtaLabel', value)} />
                  <TextField label="Кнопка secondary" value={homePageDraft.hero.secondaryCtaLabel} onChange={(value) => updateHomePageField('hero', 'secondaryCtaLabel', value)} />
                </div>
              </div>

              <div className="rounded-[24px] bg-[#f4f6f9] px-4 py-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Предпросмотр hero</p>
                <p className="mt-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">{homePageDraft.hero.eyebrow}</p>
                <p className="mt-3 whitespace-pre-line text-[28px] font-extrabold leading-tight text-ink">{homePageDraft.hero.title}</p>
                <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">{homePageDraft.hero.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" className="rounded-2xl bg-ink px-4 py-3 text-[14px] font-extrabold text-white">
                    {homePageDraft.hero.primaryCtaLabel}
                  </button>
                  <button type="button" className="rounded-2xl border border-line bg-white px-4 py-3 text-[14px] font-extrabold text-ink">
                    {homePageDraft.hero.secondaryCtaLabel}
                  </button>
                </div>
              </div>
            </div>
          </article>

          <article className="mt-4 rounded-[24px] border border-line bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[20px] font-extrabold text-ink">Редакционный визуал справа</h3>
                <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                  Подписи, которые показываются в правом атмосферном блоке рядом с hero.
                </p>
              </div>
              <button
                type="button"
                onClick={resetHomePageHeroVisual}
                className="rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
              >
                Сбросить визуал
              </button>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="grid gap-3">
                <TextField label="Label" value={homePageDraft.hero.visualLabel} onChange={(value) => updateHomePageField('hero', 'visualLabel', value)} />
                <TextAreaField label="Заголовок визуала" value={homePageDraft.hero.visualTitle} onChange={(value) => updateHomePageField('hero', 'visualTitle', value)} rows={3} />
                <TextAreaField label="Подзаголовок визуала" value={homePageDraft.hero.visualSubtitle} onChange={(value) => updateHomePageField('hero', 'visualSubtitle', value)} rows={4} />
              </div>

              <div className="rounded-[24px] bg-[#1d5055] px-4 py-4 text-white">
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/64">{homePageDraft.hero.visualLabel}</p>
                <p className="mt-4 text-[28px] font-extrabold leading-tight">{homePageDraft.hero.visualTitle}</p>
                <p className="mt-3 text-[14px] font-medium leading-relaxed text-white/76">{homePageDraft.hero.visualSubtitle}</p>
              </div>
            </div>
          </article>
        </SectionCard>

        <SectionCard
          title="Секции каталога и доверия"
          subtitle="Заголовки главной страницы для каталога направлений, смыслового блока, витрины услуг и витрины специалистов."
        >
          <div className="grid gap-4">
            <article className="rounded-[24px] border border-line bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[20px] font-extrabold text-ink">Популярные направления</h3>
                  <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                    Заголовки секции с карточками категорий. Сами категории подтягиваются из каталога услуг.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resetHomePageSection('categories')}
                  className="rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
                >
                  Сбросить
                </button>
              </div>
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                <TextField label="Eyebrow" value={homePageDraft.categories.eyebrow} onChange={(value) => updateHomePageField('categories', 'eyebrow', value)} />
                <TextField label="Кнопка" value={homePageDraft.categories.actionLabel} onChange={(value) => updateHomePageField('categories', 'actionLabel', value)} />
                <TextField label="Заголовок" value={homePageDraft.categories.title} onChange={(value) => updateHomePageField('categories', 'title', value)} />
                <TextAreaField label="Описание" value={homePageDraft.categories.description} onChange={(value) => updateHomePageField('categories', 'description', value)} rows={4} />
              </div>
            </article>

            <article className="rounded-[24px] border border-line bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[20px] font-extrabold text-ink">Почему выбирают нас</h3>
                  <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                    Секция с четырьмя преимуществами на главной странице.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetHomePageValuePillars}
                  className="rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
                >
                  Сбросить
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 xl:grid-cols-2">
                  <TextField label="Eyebrow" value={homePageDraft.valuePillars.eyebrow} onChange={(value) => updateHomePageValuePillarsField('eyebrow', value)} />
                  <TextField label="Заголовок" value={homePageDraft.valuePillars.title} onChange={(value) => updateHomePageValuePillarsField('title', value)} />
                </div>
                <TextAreaField label="Описание" value={homePageDraft.valuePillars.description} onChange={(value) => updateHomePageValuePillarsField('description', value)} rows={4} />
                <div className="grid gap-4 xl:grid-cols-2">
                  {homePageDraft.valuePillars.items.map((item, index) => (
                    <div key={`home-page-pillar-${index}`} className="rounded-2xl bg-[#f7f9fc] px-4 py-4">
                      <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Преимущество {index + 1}</p>
                      <div className="mt-3 grid gap-3">
                        <TextField label="Заголовок" value={item.title} onChange={(value) => updateHomePageValuePillarItem(index, 'title', value)} />
                        <TextAreaField label="Текст" value={item.text} onChange={(value) => updateHomePageValuePillarItem(index, 'text', value)} rows={4} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <div className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-[24px] border border-line bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[20px] font-extrabold text-ink">Блок услуг</h3>
                    <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                      Заголовки секции с популярными услугами.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetHomePageSection('featuredServices')}
                    className="rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
                  >
                    Сбросить
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  <TextField label="Eyebrow" value={homePageDraft.featuredServices.eyebrow} onChange={(value) => updateHomePageField('featuredServices', 'eyebrow', value)} />
                  <TextField label="Заголовок" value={homePageDraft.featuredServices.title} onChange={(value) => updateHomePageField('featuredServices', 'title', value)} />
                  <TextAreaField label="Описание" value={homePageDraft.featuredServices.description} onChange={(value) => updateHomePageField('featuredServices', 'description', value)} rows={4} />
                  <TextField label="Кнопка" value={homePageDraft.featuredServices.actionLabel} onChange={(value) => updateHomePageField('featuredServices', 'actionLabel', value)} />
                </div>
              </article>

              <article className="rounded-[24px] border border-line bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[20px] font-extrabold text-ink">Блок специалистов</h3>
                    <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                      Заголовки секции с карточками специалистов.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetHomePageSection('featuredSpecialists')}
                    className="rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
                  >
                    Сбросить
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  <TextField label="Eyebrow" value={homePageDraft.featuredSpecialists.eyebrow} onChange={(value) => updateHomePageField('featuredSpecialists', 'eyebrow', value)} />
                  <TextField label="Заголовок" value={homePageDraft.featuredSpecialists.title} onChange={(value) => updateHomePageField('featuredSpecialists', 'title', value)} />
                  <TextAreaField label="Описание" value={homePageDraft.featuredSpecialists.description} onChange={(value) => updateHomePageField('featuredSpecialists', 'description', value)} rows={4} />
                  <TextField label="Кнопка" value={homePageDraft.featuredSpecialists.actionLabel} onChange={(value) => updateHomePageField('featuredSpecialists', 'actionLabel', value)} />
                </div>
              </article>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void saveHomePage();
              }}
              disabled={busyKey === 'config'}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-screen px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'config' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить и опубликовать секции
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Контакты и карточки доверия"
          subtitle="Нижний контактный блок и три правые карточки рядом с ним."
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-4">
              <article className="rounded-[24px] border border-line bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[20px] font-extrabold text-ink">Контактный блок</h3>
                    <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                      Тексты карточки слева. Адрес, телефон и часы работы автоматически берутся из раздела «Контакты».
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetHomePageSection('contacts')}
                    className="rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
                  >
                    Сбросить
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  <TextField label="Eyebrow" value={homePageDraft.contacts.eyebrow} onChange={(value) => updateHomePageField('contacts', 'eyebrow', value)} />
                  <TextField label="Заголовок" value={homePageDraft.contacts.title} onChange={(value) => updateHomePageField('contacts', 'title', value)} />
                  <TextAreaField label="Описание" value={homePageDraft.contacts.description} onChange={(value) => updateHomePageField('contacts', 'description', value)} rows={4} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <TextField label="Кнопка primary" value={homePageDraft.contacts.primaryCtaLabel} onChange={(value) => updateHomePageField('contacts', 'primaryCtaLabel', value)} />
                    <TextField label="Кнопка secondary" value={homePageDraft.contacts.secondaryCtaLabel} onChange={(value) => updateHomePageField('contacts', 'secondaryCtaLabel', value)} />
                  </div>
                </div>
              </article>

              <article className="rounded-[24px] border border-line bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[20px] font-extrabold text-ink">Карточки доверия справа</h3>
                    <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                      Три небольшие карточки рядом с контактным блоком.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetHomePageHighlights}
                    className="rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
                  >
                    Сбросить
                  </button>
                </div>
                <div className="mt-4 grid gap-4">
                  {homePageDraft.highlights.map((item, index) => (
                    <div key={`home-page-highlight-${index}`} className="rounded-2xl bg-[#f7f9fc] px-4 py-4">
                      <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Карточка {index + 1}</p>
                      <div className="mt-3 grid gap-3">
                        <TextField label="Заголовок" value={item.title} onChange={(value) => updateHomePageHighlightItem(index, 'title', value)} />
                        <TextAreaField label="Описание" value={item.description} onChange={(value) => updateHomePageHighlightItem(index, 'description', value)} rows={4} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="space-y-4">
              <article className="rounded-[24px] border border-line bg-[#fbfcfe] px-4 py-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Предпросмотр контактов</p>
                <div className="mt-4 rounded-[24px] bg-white px-4 py-4">
                  <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">{homePageDraft.contacts.eyebrow}</p>
                  <p className="mt-3 text-[28px] font-extrabold leading-tight text-ink">{homePageDraft.contacts.title}</p>
                  <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">{homePageDraft.contacts.description}</p>
                  <div className="mt-5 grid gap-3 text-[14px] leading-relaxed text-[#5f6773]">
                    <div className="rounded-2xl bg-[#f7f9fc] px-4 py-3">{contactAddress}</div>
                    <div className="rounded-2xl bg-[#f7f9fc] px-4 py-3">{contactPhone}</div>
                    <div className="rounded-2xl bg-[#f7f9fc] px-4 py-3">{contactHours}</div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" className="rounded-2xl bg-ink px-4 py-3 text-[14px] font-extrabold text-white">
                      {homePageDraft.contacts.primaryCtaLabel}
                    </button>
                    <button type="button" className="rounded-2xl border border-line bg-white px-4 py-3 text-[14px] font-extrabold text-ink">
                      {homePageDraft.contacts.secondaryCtaLabel}
                    </button>
                  </div>
                </div>
              </article>

              <article className="rounded-[24px] border border-line bg-[#fbfcfe] px-4 py-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Предпросмотр карточек</p>
                <div className="mt-4 space-y-3">
                  {homePageDraft.highlights.map((item, index) => (
                    <div key={`home-page-highlight-preview-${index}`} className="rounded-2xl bg-white px-4 py-4">
                      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">{item.title}</p>
                      <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">{item.description}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void saveHomePage();
              }}
              disabled={busyKey === 'config'}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-screen px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'config' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить и опубликовать блок
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Финальный CTA"
          subtitle="Последний призыв к записи в нижней части главной страницы."
        >
          <article className="rounded-[24px] border border-line bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[20px] font-extrabold text-ink">Нижний call to action</h3>
                <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                  Секция завершения страницы с кнопками перехода к записи и специалистам.
                </p>
              </div>
              <button
                type="button"
                onClick={() => resetHomePageSection('bottomCta')}
                className="rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
              >
                Сбросить
              </button>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="grid gap-3">
                <TextField label="Eyebrow" value={homePageDraft.bottomCta.eyebrow} onChange={(value) => updateHomePageField('bottomCta', 'eyebrow', value)} />
                <TextField label="Заголовок" value={homePageDraft.bottomCta.title} onChange={(value) => updateHomePageField('bottomCta', 'title', value)} />
                <TextAreaField label="Описание" value={homePageDraft.bottomCta.description} onChange={(value) => updateHomePageField('bottomCta', 'description', value)} rows={4} />
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField label="Кнопка primary" value={homePageDraft.bottomCta.primaryCtaLabel} onChange={(value) => updateHomePageField('bottomCta', 'primaryCtaLabel', value)} />
                  <TextField label="Кнопка secondary" value={homePageDraft.bottomCta.secondaryCtaLabel} onChange={(value) => updateHomePageField('bottomCta', 'secondaryCtaLabel', value)} />
                </div>
              </div>

              <div className="rounded-[24px] bg-[#1f2d39] px-4 py-4 text-white">
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/62">{homePageDraft.bottomCta.eyebrow}</p>
                <p className="mt-3 text-[28px] font-extrabold leading-tight">{homePageDraft.bottomCta.title}</p>
                <p className="mt-3 text-[14px] font-medium leading-relaxed text-white/76">{homePageDraft.bottomCta.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" className="rounded-2xl bg-white px-4 py-3 text-[14px] font-extrabold text-[#1f2d39]">
                    {homePageDraft.bottomCta.primaryCtaLabel}
                  </button>
                  <button type="button" className="rounded-2xl border border-white/24 bg-transparent px-4 py-3 text-[14px] font-extrabold text-white">
                    {homePageDraft.bottomCta.secondaryCtaLabel}
                  </button>
                </div>
              </div>
            </div>
          </article>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void saveHomePage();
              }}
              disabled={busyKey === 'config'}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-screen px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'config' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить и опубликовать главную
            </button>
          </div>
        </SectionCard>
      </div>
    );
  };

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
          Сохранить и опубликовать
        </button>
      </SectionCard>
    </div>
  );

  const renderServicesDetail = () => {
    const visibleServices = services.filter((item) => item.isActive).slice(0, 8);
    const orderedServices = [...services].sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }
      return (left.nameOnline || left.name).localeCompare(right.nameOnline || right.name, 'ru');
    });
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
          <div className="mb-4 rounded-2xl border border-[#d8e3ef] bg-[#f4f8fc] px-4 py-3 text-[14px] font-medium leading-relaxed text-[#4f5b6b]">
            <span className="font-extrabold text-ink">Связка:</span>
            {' '}
            редактор услуг пишет напрямую в `mari-server` через `/services`,
            {' '}
            а `mari` читает витрину из `/services/public`.
            {' '}
            Поэтому услуги на сайте обновляются сразу и не ждут публикации `client-front`.
          </div>
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

        <SectionCard
          title="Карточки услуг"
          subtitle="Добавляйте, редактируйте и удаляйте услуги, из которых собираются ServiceCard на главной, в каталоге, у мастеров и в карточках услуг."
          action={
            <button
              type="button"
              onClick={() => openServiceEditor(null)}
              disabled={serviceCategories.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Добавить услугу
            </button>
          }
        >
          <div className="mb-4 rounded-2xl bg-[#f4f6f9] px-4 py-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">
            Категория выбирается из существующих. Если услуга скрыта, карточка пропадает со всех клиентских страниц, где используется ServiceCard.
          </div>
          <div className="space-y-3">
            {orderedServices.length === 0 ? (
              <div className="rounded-2xl bg-white px-4 py-4 text-[15px] font-semibold text-[#5f6773]">Услуг пока нет.</div>
            ) : (
              orderedServices.map((service) => (
                <div key={service.id} className="rounded-2xl bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[18px] font-extrabold text-ink">{service.nameOnline || service.name}</p>
                      <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                        {service.category.name} • {formatDuration(service.durationSec)} • {formatMoney(service.priceMin)}
                        {service.priceMax && service.priceMax !== service.priceMin ? ` – ${formatMoney(service.priceMax)}` : ''}
                      </p>
                      <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                        {service.description || 'Без краткого описания.'}
                      </p>
                      <p className="mt-2 text-[13px] font-semibold text-[#8590a0]">
                        {service.isActive ? 'Активна на сайте' : 'Скрыта с сайта'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openServiceEditor(service)}
                        className="rounded-2xl border border-line p-3 text-[#6c7685]"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void deleteService(service);
                        }}
                        disabled={busyKey === `service-delete:${service.id}`}
                        className="rounded-2xl border border-line p-3 text-[#6c7685] disabled:opacity-50"
                      >
                        {busyKey === `service-delete:${service.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
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
      <SectionCard title="Карточки специалистов" subtitle="Управляют MasterCard на клиентском сайте. Добавление и удаление карточки здесь означает показать или скрыть существующего мастера на сайте.">
        <div className="space-y-3">
          {specialists.length === 0 ? (
            <div className="rounded-2xl bg-white px-4 py-4 text-[15px] font-semibold text-[#5f6773]">Нет карточек специалистов.</div>
          ) : (
            [...specialists]
              .sort((left, right) => {
                if (left.isVisible !== right.isVisible) {
                  return left.isVisible ? -1 : 1;
                }
                return left.name.localeCompare(right.name, 'ru');
              })
              .map((item) => (
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
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void toggleSpecialistVisibility(item, !item.isVisible);
                          }}
                          disabled={busyKey === `specialist-visibility:${item.staffId}`}
                          className="rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773] disabled:opacity-50"
                        >
                          {busyKey === `specialist-visibility:${item.staffId}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : item.isVisible ? (
                            'Скрыть'
                          ) : (
                            'На сайт'
                          )}
                        </button>
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
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );

  const renderContactsDetail = () => {
    const primaryDisplayPhone = getContactPhoneInputValue(primaryContactDraft);

    return (
      <div className="space-y-5">
        <SectionCard
          title="Контакты сайта"
          subtitle="Этот экран сохраняет контакты в mari-server и сразу публикует их для сайта mari."
        >
          <div className="rounded-2xl border border-[#e6d6a7] bg-[#fff7e4] px-4 py-4 text-[14px] font-medium leading-relaxed text-[#7a6330]">
            <span className="font-extrabold text-[#5f4b1f]">Связка:</span>
            {' '}
            `mari-staff` сохраняет данные в `mari-server`,
            {' '}
            сервер сразу публикует обновлённую версию,
            {' '}
            а `mari` читает уже опубликованные контакты.
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <TextField
              label="Адрес"
              value={primaryContactDraft.addressLine1}
              onChange={(value) => setPrimaryContactDraft((prev) => ({ ...prev, addressLine1: value }))}
              placeholder="Улица, дом"
              type="text"
            />
            <TextField
              label="Телефон"
              value={primaryDisplayPhone}
              onChange={(value) =>
                setPrimaryContactDraft((prev) => ({
                  ...prev,
                  phoneDisplay: value,
                  phoneE164: normalizeContactPhoneValue(value),
                }))
              }
              placeholder="+7 (978) 000-00-00"
              type="tel"
            />
            <TextField
              label="Почта"
              value={primaryContactDraft.email}
              onChange={(value) => setPrimaryContactDraft((prev) => ({ ...prev, email: value }))}
              placeholder="hello@example.com"
              type="email"
            />
          </div>

          <div className="mt-4 rounded-2xl bg-[#f4f6f9] px-4 py-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">
            Будет опубликовано:
            <span className="ml-1 font-extrabold text-ink">
              {primaryContactDraft.addressLine1.trim() || 'адрес не задан'}
            </span>
            {' • '}
            <span className="font-extrabold text-ink">{primaryDisplayPhone || 'телефон не задан'}</span>
            {' • '}
            <span className="font-extrabold text-ink">{primaryContactDraft.email.trim() || 'почта не задана'}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void savePrimaryContact();
              }}
              disabled={busyKey === 'contact-primary-save'}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-screen px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'contact-primary-save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить и опубликовать
            </button>
            <button
              type="button"
              onClick={() => openCategoryPage('publish')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-[15px] font-extrabold text-ink"
            >
              Открыть состояние сайта
            </button>
          </div>
        </SectionCard>
      </div>
    );
  };

  const renderPageBlocksDetail = () => {
    const pageBlocks = blocks.filter((block) => ['BANNER', 'TEXT', 'BUTTONS', 'FAQ'].includes(block.blockType));
    const bookingHeroDefinition =
      SITE_PAGE_HERO_DEFINITIONS.find((definition) => definition.key === 'booking') ?? null;
    const otherPageHeroDefinitions = SITE_PAGE_HERO_DEFINITIONS.filter(
      (definition) => definition.key !== 'booking'
    );

    if (!bookingHeroDefinition) {
      return null;
    }

    const bookingHeroDraft = pageHeroDraft.booking;
    const bookingHeroPreview = resolveSitePageHeroPreview(bookingHeroDefinition, bookingHeroDraft);
    const previewAuthenticatedText = applyBookingPageTemplate(
      bookingPageDraft.confirmation.authenticatedDescriptionTemplate,
      { client: 'Тигран' }
    );
    const previewDiscountText = applyBookingPageTemplate(
      bookingPageDraft.confirmation.discountDescriptionTemplate,
      { discount: '10' }
    );
    const previewSlotText = applyBookingPageTemplate(
      bookingPageDraft.schedule.dateHintFirstSlotTemplate,
      { time: '10:30' }
    );

    return (
      <div className="space-y-5">
        <SectionCard
          title="Как страница /booking собирается на сайте"
          subtitle="Каждая зона ниже соответствует реальному месту на клиентском сайте mari. Здесь больше не нужно гадать, какой элемент за что отвечает."
        >
          <div className="grid gap-3 xl:grid-cols-2">
            {[
              {
                key: 'general' as const,
                title: 'Основное',
                description:
                  'Бренд, техработы и общие параметры сайта. Влияют на шапку сайта, сообщения техработ и публикацию.',
              },
              {
                key: 'services' as const,
                title: 'Услуги',
                description:
                  'Каталог услуг для клиента: названия, цены, длительность и активность карточек в сценарии записи.',
              },
              {
                key: 'specialists' as const,
                title: 'Специалисты',
                description:
                  'Карточки мастеров, которые участвуют в записи и видны клиенту на сайте.',
              },
              {
                key: 'contacts' as const,
                title: 'Контакты',
                description:
                  'Телефон, адрес и почта, которые используются в кнопках и контактных переходах на /booking.',
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => openCategoryPage(item.key)}
                className="rounded-[24px] border border-line bg-white px-4 py-4 text-left transition hover:border-[#cad2dd] hover:bg-[#fbfcfe]"
              >
                <p className="text-[18px] font-extrabold text-ink">{item.title}</p>
                <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                  {item.description}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-[24px] bg-[#f4f6f9] px-4 py-4 text-[14px] font-medium leading-relaxed text-[#5f6773]">
            В новой модели страницы записи generic-блоки BANNER/TEXT/BUTTONS/FAQ больше не
            считаются обязательной структурой сайта. Основной контент редактируется ниже через
            понятные секции, а legacy-блоки вынесены отдельно только для совместимости.
          </div>
        </SectionCard>

        <SectionCard
          title="Шапка страницы /booking"
          subtitle="Это hero-блок в верхней части страницы записи: eyebrow, заголовок и описание."
          action={
            <button
              type="button"
              onClick={() => {
                void savePageHeroes();
              }}
              disabled={busyKey === 'config'}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'config' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить и опубликовать
            </button>
          }
        >
          <div className="rounded-2xl bg-[#f4f6f9] px-4 py-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">
            Эта шапка используется именно на маршруте
            {' '}
            <span className="font-mono text-[13px] font-bold text-ink">/booking</span>
            . Пустое поле оставляет дефолтный текст сайта.
          </div>

          <article className="mt-4 rounded-[24px] border border-line bg-white px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">
                  {bookingHeroDefinition.scope}
                </p>
                <h3 className="mt-2 text-[20px] font-extrabold text-ink">
                  {bookingHeroDefinition.title}
                </h3>
                <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                  <span className="font-mono text-[13px] text-[#7a8493]">
                    {bookingHeroDefinition.route}
                  </span>
                  {' • '}
                  {bookingHeroDefinition.note}
                </p>
              </div>
              <button
                type="button"
                onClick={() => resetPageHeroFields('booking')}
                className="inline-flex items-center justify-center rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
              >
                Сбросить
              </button>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="grid gap-3">
                <TextField
                  label="Eyebrow / подпись"
                  value={bookingHeroDraft.eyebrow}
                  onChange={(value) => updatePageHeroField('booking', 'eyebrow', value)}
                  placeholder={bookingHeroDefinition.defaults.eyebrow || 'Пусто = текст по умолчанию'}
                />
                <TextField
                  label="Title / заголовок"
                  value={bookingHeroDraft.title}
                  onChange={(value) => updatePageHeroField('booking', 'title', value)}
                  placeholder={bookingHeroDefinition.defaults.title}
                />
                <TextAreaField
                  label="Description / описание"
                  value={bookingHeroDraft.description}
                  onChange={(value) => updatePageHeroField('booking', 'description', value)}
                  rows={4}
                  placeholder={bookingHeroDefinition.defaults.description}
                />
              </div>

              <div className="rounded-[24px] bg-[#f4f6f9] px-4 py-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">
                  Предпросмотр
                </p>
                {bookingHeroPreview.eyebrow ? (
                  <p className="mt-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">
                    {bookingHeroPreview.eyebrow}
                  </p>
                ) : null}
                <p className="mt-3 text-[24px] font-extrabold leading-tight text-ink">
                  {bookingHeroPreview.title}
                </p>
                <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                  {bookingHeroPreview.description}
                </p>
              </div>
            </div>
          </article>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void savePageHeroes();
              }}
              disabled={busyKey === 'config'}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-screen px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'config' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить и опубликовать шапку /booking
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Контент рабочей панели /booking"
          subtitle="Редактируются только те подписи и тексты, которые реально использует клиентский сайт mari внутри страницы записи."
          action={
            <button
              type="button"
              onClick={() => {
                void saveBookingPage();
              }}
              disabled={busyKey === 'config'}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'config' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить и опубликовать
            </button>
          }
        >
          <div className="grid gap-5">
            <article className="rounded-[24px] border border-line bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[20px] font-extrabold text-ink">Кнопки hero и сервисное предупреждение</h3>
                  <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                    Верхние кнопки под hero /booking и текст предупреждения, если данные сайта обновляются медленнее обычного.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resetBookingPageSection('heroActions')}
                  className="rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
                >
                  Сбросить кнопки
                </button>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <div className="grid gap-3 md:grid-cols-3">
                  <TextField label="Кнопка телефона" value={bookingPageDraft.heroActions.phoneLabel} onChange={(value) => updateBookingPageField('heroActions', 'phoneLabel', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.heroActions.phoneLabel} />
                  <TextField label="Кнопка услуг" value={bookingPageDraft.heroActions.servicesLabel} onChange={(value) => updateBookingPageField('heroActions', 'servicesLabel', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.heroActions.servicesLabel} />
                  <TextField label="Кнопка контактов" value={bookingPageDraft.heroActions.contactsLabel} onChange={(value) => updateBookingPageField('heroActions', 'contactsLabel', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.heroActions.contactsLabel} />
                </div>

                <div className="rounded-[24px] bg-[#f4f6f9] px-4 py-4">
                  <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Предпросмотр hero-действий</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className="rounded-2xl bg-ink px-4 py-3 text-[14px] font-extrabold text-white">
                      {bookingPageDraft.heroActions.phoneLabel}
                    </button>
                    <button type="button" className="rounded-2xl border border-line bg-white px-4 py-3 text-[14px] font-extrabold text-ink">
                      {bookingPageDraft.heroActions.servicesLabel}
                    </button>
                    <button type="button" className="rounded-2xl border border-line bg-white px-4 py-3 text-[14px] font-extrabold text-ink">
                      {bookingPageDraft.heroActions.contactsLabel}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <div className="grid gap-3">
                  <TextField label="Заголовок предупреждения" value={bookingPageDraft.connectivityNotice.title} onChange={(value) => updateBookingPageField('connectivityNotice', 'title', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.connectivityNotice.title} />
                  <TextAreaField label="Текст предупреждения" value={bookingPageDraft.connectivityNotice.description} onChange={(value) => updateBookingPageField('connectivityNotice', 'description', value)} rows={4} placeholder={SITE_BOOKING_PAGE_DEFAULTS.connectivityNotice.description} />
                </div>

                <div className="rounded-[24px] bg-[#fff6ea] px-4 py-4">
                  <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#a2732e]">Предпросмотр предупреждения</p>
                  <p className="mt-3 text-[16px] font-extrabold text-[#7d6120]">{bookingPageDraft.connectivityNotice.title}</p>
                  <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#8a6d34]">{bookingPageDraft.connectivityNotice.description}</p>
                </div>
              </div>
            </article>

            <article className="rounded-[24px] border border-line bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[20px] font-extrabold text-ink">Верх панели записи</h3>
                  <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                    Верхняя плашка внутри большой панели: eyebrow, бейдж доступности, заголовок, описание и блок корзины.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resetBookingPageSection('panel')}
                  className="rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
                >
                  Сбросить секцию
                </button>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                <TextField label="Eyebrow панели" value={bookingPageDraft.panel.eyebrow} onChange={(value) => updateBookingPageField('panel', 'eyebrow', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.panel.eyebrow} />
                <TextField label="Бейдж доступности" value={bookingPageDraft.panel.availabilityBadge} onChange={(value) => updateBookingPageField('panel', 'availabilityBadge', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.panel.availabilityBadge} />
                <TextField label="Главный заголовок" value={bookingPageDraft.panel.title} onChange={(value) => updateBookingPageField('panel', 'title', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.panel.title} />
                <TextField label="Подпись корзины" value={bookingPageDraft.panel.cartEyebrow} onChange={(value) => updateBookingPageField('panel', 'cartEyebrow', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.panel.cartEyebrow} />
                <TextAreaField label="Описание панели" value={bookingPageDraft.panel.description} onChange={(value) => updateBookingPageField('panel', 'description', value)} rows={4} placeholder={SITE_BOOKING_PAGE_DEFAULTS.panel.description} />
                <TextAreaField label="Описание корзины" value={bookingPageDraft.panel.cartDescription} onChange={(value) => updateBookingPageField('panel', 'cartDescription', value)} rows={4} placeholder={SITE_BOOKING_PAGE_DEFAULTS.panel.cartDescription} />
                <TextField label="Кнопка показать каталог" value={bookingPageDraft.panel.showCatalogLabel} onChange={(value) => updateBookingPageField('panel', 'showCatalogLabel', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.panel.showCatalogLabel} />
                <TextField label="Кнопка скрыть каталог" value={bookingPageDraft.panel.hideCatalogLabel} onChange={(value) => updateBookingPageField('panel', 'hideCatalogLabel', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.panel.hideCatalogLabel} />
                <TextField label="Плейсхолдер поиска услуги" value={bookingPageDraft.panel.searchPlaceholder} onChange={(value) => updateBookingPageField('panel', 'searchPlaceholder', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.panel.searchPlaceholder} />
                <TextField label="Сообщение пустой корзины" value={bookingPageDraft.panel.emptyCartMessage} onChange={(value) => updateBookingPageField('panel', 'emptyCartMessage', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.panel.emptyCartMessage} />
              </div>

              <div className="mt-4 rounded-[24px] bg-[#f4f6f9] px-4 py-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Предпросмотр секции</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5d6776]">{bookingPageDraft.panel.eyebrow}</span>
                  <span className="rounded-full border border-white bg-white px-3 py-2 text-[13px] font-semibold text-[#5d6776]">{bookingPageDraft.panel.availabilityBadge}</span>
                </div>
                <p className="mt-4 text-[28px] font-extrabold leading-tight text-ink">{bookingPageDraft.panel.title}</p>
                <p className="mt-3 text-[15px] font-medium leading-relaxed text-[#5f6773]">{bookingPageDraft.panel.description}</p>
                <div className="mt-4 rounded-2xl bg-white px-4 py-4">
                  <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">{bookingPageDraft.panel.cartEyebrow}</p>
                  <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">{bookingPageDraft.panel.cartDescription}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className="rounded-2xl border border-line bg-[#f7f9fc] px-4 py-3 text-[14px] font-extrabold text-ink">{bookingPageDraft.panel.hideCatalogLabel}</button>
                    <div className="rounded-2xl border border-line bg-[#f7f9fc] px-4 py-3 text-[14px] font-medium text-[#7a8493]">{bookingPageDraft.panel.searchPlaceholder}</div>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[24px] border border-line bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[20px] font-extrabold text-ink">Дата, мастер и слоты</h3>
                  <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                    Подписи и подсказки для блока выбора даты, мастера и свободного времени.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resetBookingPageSection('schedule')}
                  className="rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
                >
                  Сбросить секцию
                </button>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                <TextField label="Заголовок секции" value={bookingPageDraft.schedule.title} onChange={(value) => updateBookingPageField('schedule', 'title', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.schedule.title} />
                <TextField label="Бейдж диапазона дат" value={bookingPageDraft.schedule.daysAheadLabel} onChange={(value) => updateBookingPageField('schedule', 'daysAheadLabel', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.schedule.daysAheadLabel} />
                <TextAreaField label="Описание секции" value={bookingPageDraft.schedule.description} onChange={(value) => updateBookingPageField('schedule', 'description', value)} rows={3} placeholder={SITE_BOOKING_PAGE_DEFAULTS.schedule.description} />
                <TextAreaField label="Пустое состояние до выбора услуг" value={bookingPageDraft.schedule.emptySelectionMessage} onChange={(value) => updateBookingPageField('schedule', 'emptySelectionMessage', value)} rows={3} placeholder={SITE_BOOKING_PAGE_DEFAULTS.schedule.emptySelectionMessage} />
                <TextField label="Лейбл поля мастера" value={bookingPageDraft.schedule.masterLabel} onChange={(value) => updateBookingPageField('schedule', 'masterLabel', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.schedule.masterLabel} />
                <TextField label="Опция любого мастера" value={bookingPageDraft.schedule.anyMasterLabel} onChange={(value) => updateBookingPageField('schedule', 'anyMasterLabel', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.schedule.anyMasterLabel} />
                <TextField label="Лейбл ручной даты" value={bookingPageDraft.schedule.manualDateLabel} onChange={(value) => updateBookingPageField('schedule', 'manualDateLabel', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.schedule.manualDateLabel} />
                <TextField label="Подсказка первого слота" value={bookingPageDraft.schedule.dateHintFirstSlotTemplate} onChange={(value) => updateBookingPageField('schedule', 'dateHintFirstSlotTemplate', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.schedule.dateHintFirstSlotTemplate} />
                <TextField label="Подсказка количества окон" value={bookingPageDraft.schedule.dateHintSlotsTemplate} onChange={(value) => updateBookingPageField('schedule', 'dateHintSlotsTemplate', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.schedule.dateHintSlotsTemplate} />
                <TextField label="Сообщение, когда окон нет" value={bookingPageDraft.schedule.slotsEmptyResults} onChange={(value) => updateBookingPageField('schedule', 'slotsEmptyResults', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.schedule.slotsEmptyResults} />
              </div>

              <div className="mt-4 rounded-[24px] bg-[#f4f6f9] px-4 py-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Предпросмотр секции</p>
                <p className="mt-3 text-[24px] font-extrabold text-ink">{bookingPageDraft.schedule.title}</p>
                <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">{bookingPageDraft.schedule.description}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-4">
                    <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">{bookingPageDraft.schedule.masterLabel}</p>
                    <p className="mt-3 text-[15px] font-semibold text-ink">{bookingPageDraft.schedule.anyMasterLabel}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-4">
                    <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Подсказка под датой</p>
                    <p className="mt-3 text-[15px] font-semibold text-ink">{previewSlotText}</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[24px] border border-line bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[20px] font-extrabold text-ink">Подтверждение и вход</h3>
                  <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                    Правая карточка подтверждения визита: тексты для авторизованного и гостевого сценария, поля формы и подписи итогового блока.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resetBookingPageSection('confirmation')}
                  className="rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
                >
                  Сбросить секцию
                </button>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                <TextField label="Eyebrow" value={bookingPageDraft.confirmation.eyebrow} onChange={(value) => updateBookingPageField('confirmation', 'eyebrow', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.confirmation.eyebrow} />
                <TextField label="Заголовок" value={bookingPageDraft.confirmation.title} onChange={(value) => updateBookingPageField('confirmation', 'title', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.confirmation.title} />
                <TextField label="Текст для авторизованного клиента" value={bookingPageDraft.confirmation.authenticatedDescriptionTemplate} onChange={(value) => updateBookingPageField('confirmation', 'authenticatedDescriptionTemplate', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.confirmation.authenticatedDescriptionTemplate} />
                <TextAreaField label="Текст для гостя" value={bookingPageDraft.confirmation.guestDescription} onChange={(value) => updateBookingPageField('confirmation', 'guestDescription', value)} rows={3} placeholder={SITE_BOOKING_PAGE_DEFAULTS.confirmation.guestDescription} />
                <TextAreaField label="Текст callout перед входом" value={bookingPageDraft.confirmation.loginCalloutDescription} onChange={(value) => updateBookingPageField('confirmation', 'loginCalloutDescription', value)} rows={4} placeholder={SITE_BOOKING_PAGE_DEFAULTS.confirmation.loginCalloutDescription} />
                <TextField label="Заголовок профиля" value={bookingPageDraft.confirmation.profileLabel} onChange={(value) => updateBookingPageField('confirmation', 'profileLabel', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.confirmation.profileLabel} />
                <TextField label="Лейбл промокода" value={bookingPageDraft.confirmation.promoLabel} onChange={(value) => updateBookingPageField('confirmation', 'promoLabel', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.confirmation.promoLabel} />
                <TextField label="Плейсхолдер промокода" value={bookingPageDraft.confirmation.promoPlaceholder} onChange={(value) => updateBookingPageField('confirmation', 'promoPlaceholder', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.confirmation.promoPlaceholder} />
                <TextField label="Лейбл комментария" value={bookingPageDraft.confirmation.commentLabel} onChange={(value) => updateBookingPageField('confirmation', 'commentLabel', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.confirmation.commentLabel} />
                <TextField label="Плейсхолдер комментария" value={bookingPageDraft.confirmation.commentPlaceholder} onChange={(value) => updateBookingPageField('confirmation', 'commentPlaceholder', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.confirmation.commentPlaceholder} />
                <TextField label="Заголовок итога" value={bookingPageDraft.confirmation.summaryTitle} onChange={(value) => updateBookingPageField('confirmation', 'summaryTitle', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.confirmation.summaryTitle} />
                <TextField label="Заголовок кнопки отправки" value={bookingPageDraft.confirmation.submitLabel} onChange={(value) => updateBookingPageField('confirmation', 'submitLabel', value)} placeholder={SITE_BOOKING_PAGE_DEFAULTS.confirmation.submitLabel} />
              </div>

              <div className="mt-4 rounded-[24px] bg-[#f4f6f9] px-4 py-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Предпросмотр секции</p>
                <p className="mt-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">{bookingPageDraft.confirmation.eyebrow}</p>
                <p className="mt-3 text-[24px] font-extrabold text-ink">{bookingPageDraft.confirmation.title}</p>
                <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">{previewAuthenticatedText}</p>
                <div className="mt-4 rounded-2xl bg-white px-4 py-4">
                  <p className="text-[15px] font-semibold text-ink">{bookingPageDraft.confirmation.profileLabel}</p>
                  <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">{previewDiscountText}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="rounded-2xl bg-ink px-4 py-3 text-[14px] font-extrabold text-white">{bookingPageDraft.confirmation.loginButtonLabel}</button>
                  <button type="button" className="rounded-2xl border border-line bg-white px-4 py-3 text-[14px] font-extrabold text-ink">{bookingPageDraft.confirmation.registerButtonLabel}</button>
                </div>
              </div>
            </article>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void saveBookingPage();
              }}
              disabled={busyKey === 'config'}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-screen px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'config' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить и опубликовать контент страницы
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Остальные шапки сайта"
          subtitle="Редактирование других PageHero оставлено доступным, но вынесено ниже, чтобы не смешивать его с самой страницей записи."
        >
          <details className="rounded-[24px] border border-line bg-white px-4 py-4">
            <summary className="cursor-pointer list-none text-[16px] font-extrabold text-ink">
              Показать остальные PageHero
            </summary>
            <div className="mt-4 space-y-4">
              {otherPageHeroDefinitions.map((definition) => {
                const draft = pageHeroDraft[definition.key];
                const preview = resolveSitePageHeroPreview(definition, draft);

                return (
                  <article key={definition.key} className="rounded-[24px] border border-line bg-[#fbfcfe] px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">{definition.scope}</p>
                        <h3 className="mt-2 text-[20px] font-extrabold text-ink">{definition.title}</h3>
                        <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                          <span className="font-mono text-[13px] text-[#7a8493]">{definition.route}</span>
                          {' • '}
                          {definition.note}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => resetPageHeroFields(definition.key)}
                        className="inline-flex items-center justify-center rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
                      >
                        Сбросить
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                      <div className="grid gap-3">
                        <TextField label="Eyebrow / подпись" value={draft.eyebrow} onChange={(value) => updatePageHeroField(definition.key, 'eyebrow', value)} placeholder={definition.defaults.eyebrow || 'Пусто = текст по умолчанию'} />
                        <TextField label="Title / заголовок" value={draft.title} onChange={(value) => updatePageHeroField(definition.key, 'title', value)} placeholder={definition.defaults.title} />
                        <TextAreaField label="Description / описание" value={draft.description} onChange={(value) => updatePageHeroField(definition.key, 'description', value)} rows={4} placeholder={definition.defaults.description} />
                      </div>

                      <div className="rounded-[24px] bg-white px-4 py-4">
                        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Предпросмотр</p>
                        {preview.eyebrow ? (
                          <p className="mt-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">{preview.eyebrow}</p>
                        ) : null}
                        <p className="mt-3 text-[24px] font-extrabold leading-tight text-ink">{preview.title}</p>
                        <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">{preview.description}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </details>
        </SectionCard>

        <SectionCard
          title="Legacy-блоки старой схемы"
          subtitle="Старые BANNER/TEXT/BUTTONS/FAQ оставлены только для совместимости. Для сайта mari их больше не нужно создавать вручную."
        >
          <div className="rounded-[24px] bg-[#f4f6f9] px-4 py-4 text-[14px] font-medium leading-relaxed text-[#5f6773]">
            {pageBlocks.length === 0
              ? 'Старых page-блоков сейчас нет. Это нормально: новая страница /booking в mari собирается из hero, bookingPage, услуг, специалистов и контактов.'
              : `В конфигурации найдено legacy-блоков: ${pageBlocks.length}. Они не являются основной моделью страницы, но доступны ниже для миграции или очистки.`}
          </div>

          {pageBlocks.length > 0 ? (
            <div className="mt-4">
              {renderBlockManager(
                pageBlocks,
                ['BANNER', 'TEXT', 'BUTTONS', 'FAQ'],
                'Legacy-блоки',
                'Редактор старых сущностей. Используйте только если действительно поддерживаете старую схему.',
              )}
            </div>
          ) : null}
        </SectionCard>
      </div>
    );
  };

  const renderPromoDetail = () => (
    <div className="space-y-5">
      <SectionCard
        title="Карточки предложений"
        subtitle="Редактор OfferCard на странице /offers и в связанных переходах на запись."
        action={
          <button
            type="button"
            onClick={() => openOfferEditor(null)}
            className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink"
          >
            <Plus className="h-4 w-4" />
            Добавить предложение
          </button>
        }
      >
        <div className="space-y-3">
          {siteCardsDraft.offers.length === 0 ? (
            <div className="rounded-2xl bg-white px-4 py-4 text-[15px] font-semibold text-[#5f6773]">Предложений пока нет.</div>
          ) : (
            siteCardsDraft.offers.map((offer) => (
              <div key={offer.slug} className="rounded-2xl bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[18px] font-extrabold text-ink">{offer.title}</p>
                    <p className="mt-1 text-[14px] font-semibold text-[#7d8795]">{offer.subtitle}</p>
                    <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">{offer.description}</p>
                    <p className="mt-2 text-[13px] font-semibold text-[#8590a0]">
                      {offer.badge} • {offer.ctaHref}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openOfferEditor(offer)}
                      className="rounded-2xl border border-line p-3 text-[#6c7685]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void deleteOffer(offer.slug);
                      }}
                      disabled={busyKey === 'site-cards'}
                      className="rounded-2xl border border-line p-3 text-[#6c7685] disabled:opacity-50"
                    >
                      {busyKey === 'site-cards' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Карточки статей"
        subtitle="Редактор ArticleCard и самих материалов на странице /news и в детальных новостях."
        action={
          <button
            type="button"
            onClick={() => openNewsEditor(null)}
            className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink"
          >
            <Plus className="h-4 w-4" />
            Добавить статью
          </button>
        }
      >
        <div className="space-y-3">
          {siteCardsDraft.news.length === 0 ? (
            <div className="rounded-2xl bg-white px-4 py-4 text-[15px] font-semibold text-[#5f6773]">Статей пока нет.</div>
          ) : (
            siteCardsDraft.news.map((article) => (
              <div key={article.slug} className="rounded-2xl bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[18px] font-extrabold text-ink">{article.title}</p>
                    <p className="mt-1 text-[14px] font-medium text-[#5f6773]">
                      {article.category} • {article.publishedAt}
                    </p>
                    <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">{article.excerpt}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openNewsEditor(article)}
                      className="rounded-2xl border border-line p-3 text-[#6c7685]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void deleteNews(article.slug);
                      }}
                      disabled={busyKey === 'site-cards'}
                      className="rounded-2xl border border-line p-3 text-[#6c7685] disabled:opacity-50"
                    >
                      {busyKey === 'site-cards' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      {renderBlockManager(
        blocks.filter((block) => ['PROMO', 'OFFERS'].includes(block.blockType)),
        ['PROMO', 'OFFERS'],
        'Акции и предложения',
        'Редактор маркетинговых блоков и подборок предложений.',
      )}
    </div>
  );

  const renderLegalDetail = () => {
    const operatorName =
      config?.legalName?.trim() ||
      config?.brandName?.trim() ||
      primaryContact?.publicName?.trim() ||
      primaryContact?.name?.trim() ||
      'MARI';
    const primaryPhone =
      primaryContact?.phones.find((item) => item.primary)?.display ||
      primaryContact?.phones.find((item) => item.primary)?.e164 ||
      primaryContact?.phones[0]?.display ||
      primaryContact?.phones[0]?.e164 ||
      'Телефон не заполнен';
    const primaryEmail = primaryContact?.emails?.[0] || 'Email не заполнен';
    const primaryAddress = primaryContact?.addresses[0]?.line1 || 'Адрес не заполнен';

    return (
      <div className="space-y-5">
        <SectionCard
          title="Политика конфиденциальности"
          subtitle="Страница /privacy-policy, cookie-уведомление и тексты согласия на обработку данных теперь редактируются из одного места и публикуются сразу."
        >
          <div className="rounded-2xl border border-[#d6deea] bg-[#eff4fb] px-4 py-4 text-[14px] font-medium leading-relaxed text-[#39516d]">
            <span className="font-extrabold text-ink">Связка:</span>
            {' '}
            `mari-staff` пишет блоки политики в `client-front extra.siteContent.policy`,
            {' '}
            `mari-server` публикует их в bootstrap,
            {' '}
            а `mari` из этих же данных собирает страницу `/privacy-policy`, cookie-баннер и тексты согласия в формах.
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
            <div className="space-y-4">
              <article className="rounded-[24px] border border-line bg-white px-4 py-4">
                <h3 className="text-[20px] font-extrabold text-ink">Шапка страницы</h3>
                <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                  Верхний hero на странице `/privacy-policy`.
                </p>
                <div className="mt-4 grid gap-3">
                  <TextField label="Eyebrow" value={siteCardsDraft.policy.eyebrow} onChange={(value) => updatePolicyField('eyebrow', value)} />
                  <TextField label="Заголовок" value={siteCardsDraft.policy.title} onChange={(value) => updatePolicyField('title', value)} />
                  <TextAreaField label="Описание" value={siteCardsDraft.policy.description} onChange={(value) => updatePolicyField('description', value)} rows={4} />
                </div>
              </article>

              <article className="rounded-[24px] border border-line bg-white px-4 py-4">
                <h3 className="text-[20px] font-extrabold text-ink">Левый блок «Кратко»</h3>
                <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                  Это фиксированный summary-блок слева на странице политики. Значения оператора, почты и адреса подставляются из раздела `Контакты` и `Основное`.
                </p>
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  <TextField label="Eyebrow" value={siteCardsDraft.policy.summaryEyebrow} onChange={(value) => updatePolicyField('summaryEyebrow', value)} />
                  <TextField label="Заголовок" value={siteCardsDraft.policy.summaryTitle} onChange={(value) => updatePolicyField('summaryTitle', value)} />
                  <TextField label="Подпись для оператора" value={siteCardsDraft.policy.operatorLabel} onChange={(value) => updatePolicyField('operatorLabel', value)} />
                  <TextField label="Подпись для контакта" value={siteCardsDraft.policy.contactLabel} onChange={(value) => updatePolicyField('contactLabel', value)} />
                  <TextField label="Подпись для адреса" value={siteCardsDraft.policy.addressLabel} onChange={(value) => updatePolicyField('addressLabel', value)} />
                  <TextField label="Текст кнопки связи" value={siteCardsDraft.policy.contactCtaLabel} onChange={(value) => updatePolicyField('contactCtaLabel', value)} />
                </div>
                <div className="mt-3">
                  <TextAreaField label="Нижнее пояснение" value={siteCardsDraft.policy.summaryNote} onChange={(value) => updatePolicyField('summaryNote', value)} rows={4} />
                </div>
              </article>

              <article className="rounded-[24px] border border-line bg-white px-4 py-4">
                <h3 className="text-[20px] font-extrabold text-ink">Cookie и отдельные согласия</h3>
                <p className="mt-1 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                  Эти тексты используются не на самой странице политики, а в cookie-баннере и в чекбоксах согласия на формах регистрации и записи.
                </p>
                <div className="mt-4 grid gap-3">
                  <TextField label="Заголовок cookie-баннера" value={siteCardsDraft.policy.cookieBannerTitle} onChange={(value) => updatePolicyField('cookieBannerTitle', value)} />
                  <TextAreaField label="Описание cookie-баннера" value={siteCardsDraft.policy.cookieBannerDescription} onChange={(value) => updatePolicyField('cookieBannerDescription', value)} rows={4} />
                  <div className="grid gap-3 xl:grid-cols-2">
                    <TextField label="Кнопка «разрешить аналитику»" value={siteCardsDraft.policy.cookieBannerAcceptLabel} onChange={(value) => updatePolicyField('cookieBannerAcceptLabel', value)} />
                    <TextField label="Кнопка «только необходимые»" value={siteCardsDraft.policy.cookieBannerNecessaryLabel} onChange={(value) => updatePolicyField('cookieBannerNecessaryLabel', value)} />
                  </div>
                  <TextAreaField label="Согласие в записи" value={siteCardsDraft.policy.bookingConsentLabel} onChange={(value) => updatePolicyField('bookingConsentLabel', value)} rows={3} />
                  <TextAreaField label="Согласие при регистрации" value={siteCardsDraft.policy.accountConsentLabel} onChange={(value) => updatePolicyField('accountConsentLabel', value)} rows={3} />
                </div>
              </article>
            </div>

            <div className="space-y-4">
              <article className="rounded-[24px] border border-line bg-[#fbfcfe] px-4 py-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Предпросмотр hero</p>
                <p className="mt-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">{siteCardsDraft.policy.eyebrow}</p>
                <p className="mt-3 text-[30px] font-extrabold leading-tight text-ink">{siteCardsDraft.policy.title}</p>
                <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">{siteCardsDraft.policy.description}</p>
                <button type="button" className="mt-5 rounded-2xl bg-ink px-4 py-3 text-[14px] font-extrabold text-white">
                  {siteCardsDraft.policy.contactCtaLabel}
                </button>
              </article>

              <article className="rounded-[24px] border border-line bg-[#fbfcfe] px-4 py-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Предпросмотр summary</p>
                <div className="mt-4 rounded-[24px] bg-white px-4 py-4">
                  <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">{siteCardsDraft.policy.summaryEyebrow}</p>
                  <p className="mt-3 font-serif text-[34px] leading-none text-ink">{siteCardsDraft.policy.summaryTitle}</p>
                  <div className="mt-5 space-y-3 text-[14px] leading-relaxed text-[#5f6773]">
                    <p>
                      {siteCardsDraft.policy.operatorLabel}: <span className="font-extrabold text-ink">{operatorName}</span>
                    </p>
                    <p>
                      {siteCardsDraft.policy.contactLabel}: <span className="font-extrabold text-ink">{primaryEmail}</span>
                    </p>
                    <p>
                      {siteCardsDraft.policy.addressLabel}: <span className="font-extrabold text-ink">{primaryAddress}</span>
                    </p>
                    <p className="rounded-2xl bg-[#f4f6f9] px-4 py-3 text-[13px] text-[#5f6773]">
                      Телефон из контактов: <span className="font-extrabold text-ink">{primaryPhone}</span>
                    </p>
                    <p>{siteCardsDraft.policy.summaryNote}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-[24px] border border-line bg-[#fbfcfe] px-4 py-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Предпросмотр cookie</p>
                <div className="mt-4 rounded-[24px] border border-line bg-white px-4 py-4">
                  <p className="text-[15px] font-extrabold text-ink">{siteCardsDraft.policy.cookieBannerTitle}</p>
                  <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">{siteCardsDraft.policy.cookieBannerDescription}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className="rounded-full bg-ink px-4 py-3 text-[13px] font-extrabold text-white">{siteCardsDraft.policy.cookieBannerAcceptLabel}</button>
                    <button type="button" className="rounded-full border border-line bg-white px-4 py-3 text-[13px] font-extrabold text-ink">{siteCardsDraft.policy.cookieBannerNecessaryLabel}</button>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Секции документа"
          subtitle="Каждая карточка ниже — отдельный блок политики. На сайте они рендерятся в правой колонке как самостоятельные секции."
          action={
            <button
              type="button"
              onClick={addPolicySection}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 text-[14px] font-extrabold text-ink"
            >
              <Plus className="h-4 w-4" />
              Добавить секцию
            </button>
          }
        >
          <div className="space-y-4">
            {siteCardsDraft.policy.sections.map((section, index) => (
              <article key={section.id} className="rounded-[24px] border border-line bg-white px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">Блок {String(index + 1).padStart(2, '0')}</p>
                    <p className="mt-2 text-[13px] font-semibold text-[#7c8695]">ID в API: <span className="font-mono text-[12px] text-[#5f6773]">{section.id}</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deletePolicySection(section.id)}
                    className="inline-flex items-center justify-center rounded-2xl border border-line px-3 py-2 text-[13px] font-extrabold text-[#5f6773]"
                  >
                    Удалить
                  </button>
                </div>

                <div className="mt-4 grid gap-3">
                  <TextField
                    label="Заголовок секции"
                    value={section.title}
                    onChange={(value) =>
                      updatePolicySection(section.id, (current) => ({
                        ...current,
                        title: value,
                      }))
                    }
                  />
                  <TextAreaField
                    label="Абзацы секции"
                    value={section.paragraphs.join('\n\n')}
                    onChange={(value) =>
                      updatePolicySection(section.id, (current) => ({
                        ...current,
                        paragraphs: value.split(/\n{2,}/),
                      }))
                    }
                    rows={8}
                    placeholder="Каждый новый абзац отделяйте пустой строкой."
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void savePolicy();
              }}
              disabled={busyKey === 'site-cards'}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-screen px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'site-cards' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить и опубликовать политику
            </button>
          </div>
        </SectionCard>
      </div>
    );
  };

  const renderAdvancedDetail = () => (
    <div className="space-y-5">
      <SectionCard
        title="Служебные настройки"
        subtitle="Технический раздел для редких случаев. Если вы меняете обычный текст, кнопки, контакты, услуги или специалистов, сюда заходить не нужно."
      >
        <div className="rounded-2xl border border-[#e6d6a7] bg-[#fff7e4] px-4 py-4 text-[14px] font-medium leading-relaxed text-[#7a6330]">
          <span className="font-extrabold text-[#5f4b1f]">Когда использовать:</span>
          {' '}
          только если разработчик дал точный ключ, точное JSON-поле или нужно восстановить/перенести технические данные.
          {' '}
          Для обычного редактирования сайта этот раздел не нужен.
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-line bg-white px-4 py-4">
            <p className="text-[16px] font-extrabold text-ink">Служебные переключатели</p>
            <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">
              Это скрытые переключатели поведения сайта или приложения.
              {' '}
              Ими можно включать или выключать функцию по ключу, а также ограничивать её по платформе, версии приложения или дате.
            </p>
            <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">
              Пользоваться стоит только тогда, когда разработчик сказал:
              {' '}
              какой именно ключ нужен и какое правило должно сработать.
              {' '}
              Для текстов, кнопок и дизайна этот блок не подходит.
            </p>
          </article>

          <article className="rounded-2xl border border-line bg-white px-4 py-4">
            <p className="text-[16px] font-extrabold text-ink">Дополнительные данные</p>
            <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">
              Это сырое техническое хранилище для структур вроде `pageHero`, `bookingPage` и `siteContent`.
              {' '}
              Обычный интерфейс выше уже редактирует большую часть этих данных в понятных формах.
            </p>
            <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">
              Сюда стоит идти только если в интерфейсе ещё нет нужного поля,
              {' '}
              если нужно исправить сломанную структуру
              {' '}
              или если разработчик просит вставить точный JSON.
            </p>
          </article>
        </div>

        <div className="space-y-4">
          <TextAreaField
            label="Служебные переключатели (JSON)"
            value={advancedDraft.featureFlagsJson}
            onChange={(value) => setAdvancedDraft((prev) => ({ ...prev, featureFlagsJson: value }))}
            rows={12}
            placeholder={STANDARD_FEATURE_FLAGS_EXAMPLE}
          />
          <div className="rounded-2xl border border-[#d8e3ef] bg-[#f4f8fc] px-4 py-4">
            <p className="text-[16px] font-extrabold text-ink">Пример JSON</p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-[#1f2937] px-4 py-4 text-[12px] font-medium leading-6 text-[#e5eefb]">
              {STANDARD_FEATURE_FLAGS_EXAMPLE}
            </pre>
            <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">
              Что меняет на сайте:
              {' '}
              такой JSON сам по себе ничего визуально не меняет,
              {' '}
              пока разработчик не привязал ключ
              {' '}
              <span className="font-mono text-[13px] font-bold text-ink">booking.webBeta</span>
              {' '}
              к конкретной функции в коде.
            </p>
            <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">
              Это поле подходит для скрытых технических переключателей,
              {' '}
              а не для редактирования текстов, кнопок или структуры страниц.
            </p>
          </div>

          <TextAreaField
            label="Дополнительные данные (JSON)"
            value={advancedDraft.extraJson}
            onChange={(value) => setAdvancedDraft((prev) => ({ ...prev, extraJson: value }))}
            rows={10}
            placeholder={STANDARD_EXTRA_EXAMPLE}
          />
          <div className="rounded-2xl border border-[#d8e3ef] bg-[#f4f8fc] px-4 py-4">
            <p className="text-[16px] font-extrabold text-ink">Пример JSON</p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-[#1f2937] px-4 py-4 text-[12px] font-medium leading-6 text-[#e5eefb]">
              {STANDARD_EXTRA_EXAMPLE}
            </pre>
            <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#5f6773]">
              Что меняет на сайте:
              {' '}
              <span className="font-mono text-[13px] font-bold text-ink">pageHero.booking</span>
              {' '}
              меняет верхнюю шапку страницы
              {' '}
              <span className="font-mono text-[13px] font-bold text-ink">/booking</span>,
              {' '}
              а
              {' '}
              <span className="font-mono text-[13px] font-bold text-ink">bookingPage.heroActions</span>
              {' '}
              и
              {' '}
              <span className="font-mono text-[13px] font-bold text-ink">bookingPage.panel</span>
              {' '}
              меняют подписи кнопок и тексты внутри рабочей панели записи.
            </p>
            <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">
              Это поле стоит использовать только если нужного редактора выше ещё нет.
              {' '}
              Если поле уже есть в обычном интерфейсе, безопаснее менять его там, а не через сырой JSON.
            </p>
          </div>
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
          Сохранить и опубликовать служебные данные
        </button>
      </SectionCard>

      {renderBlockManager(
        blocks.filter((block) => block.blockType === 'CUSTOM'),
        ['CUSTOM'],
        'Нестандартные блоки',
        'Технический резерв для нестандартных сценариев. Используйте только под конкретную задачу от разработчика.',
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
    const previewSpecialists = previewState.data.specialists.filter((item) => item.isVisible).slice(0, 3);
    const previewServices = services.filter((item) => item.isActive).slice(0, 4);
    const previewExtra = previewState.data.config.extra ?? {};
    const previewBookingHero = resolveSitePageHeroPreview(
      SITE_PAGE_HERO_DEFINITIONS.find((definition) => definition.key === 'booking')!,
      createSitePageHeroDraft(previewExtra).booking
    );
    const previewBookingPage = createSiteBookingPageDraft(previewExtra);
    const previewClientText = applyBookingPageTemplate(
      previewBookingPage.confirmation.authenticatedDescriptionTemplate,
      { client: 'Тигран' }
    );
    const previewDiscountText = applyBookingPageTemplate(
      previewBookingPage.confirmation.discountDescriptionTemplate,
      { discount: '10' }
    );
    const previewSlotText = applyBookingPageTemplate(
      previewBookingPage.schedule.dateHintFirstSlotTemplate,
      { time: '10:30' }
    );

    return (
      <div className="rounded-[32px] border border-line bg-[#e8edf4] p-3">
        <div className="mx-auto max-w-[920px] rounded-[28px] bg-[#fcfbf8] px-4 py-4 shadow-[0_18px_40px_rgba(42,49,56,0.12)] md:px-6 md:py-6">
          <div className="rounded-[24px] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(42,49,56,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#8a94a2]">
                  Предпросмотр mari /booking
                </p>
                <h2 className="mt-1 text-[28px] font-extrabold text-ink">
                  {previewBookingHero.title}
                </h2>
                <p className="mt-2 max-w-[640px] text-[14px] font-medium leading-relaxed text-[#5f6773]">
                  {previewBookingHero.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {renderPreviewButtons([
                    {
                      label: previewBookingPage.heroActions.phoneLabel,
                      style: 'primary',
                    },
                    {
                      label: previewBookingPage.heroActions.servicesLabel,
                      style: 'secondary',
                    },
                    {
                      label: previewBookingPage.heroActions.contactsLabel,
                      style: 'secondary',
                    },
                  ])}
                </div>
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

          <section className="mt-5 overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#184b52_0%,#1d5860_44%,#24515f_100%)] px-4 py-4 text-white shadow-[0_18px_40px_rgba(18,47,53,0.28)] md:px-5 md:py-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">
                    {previewBookingPage.panel.eyebrow}
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[12px] font-semibold text-white/80">
                    {previewBookingPage.panel.availabilityBadge}
                  </span>
                </div>

                <div>
                  <p className="text-[30px] font-extrabold leading-[0.96] tracking-[-0.04em] text-white">
                    {previewBookingPage.panel.title}
                  </p>
                  <p className="mt-3 max-w-[560px] text-[14px] font-medium leading-relaxed text-white/74">
                    {previewBookingPage.panel.description}
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="rounded-[24px] border border-white/12 bg-[rgba(255,255,255,0.08)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/56">
                          {previewBookingPage.panel.cartEyebrow}
                        </p>
                        <p className="mt-2 text-[14px] font-medium leading-relaxed text-white/74">
                          {previewBookingPage.panel.cartDescription}
                        </p>
                      </div>
                      <button type="button" className="rounded-full border border-white/16 bg-white/12 px-4 py-2 text-[13px] font-extrabold text-white">
                        {previewBookingPage.panel.hideCatalogLabel}
                      </button>
                    </div>
                    <div className="mt-4 rounded-[18px] bg-white px-4 py-3 text-[#5f6773]">
                      {previewServices.length > 0 ? (
                        <div className="space-y-2">
                          {previewServices.slice(0, 2).map((service) => (
                            <div key={service.id} className="rounded-2xl border border-line bg-[#f8fafc] px-3 py-3">
                              <p className="text-[15px] font-extrabold text-ink">
                                {service.nameOnline || service.name}
                              </p>
                              <p className="mt-1 text-[13px] font-medium text-[#7a8493]">
                                {service.category.name} • {formatDuration(service.durationSec)} • {formatMoney(service.priceMin)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[14px] font-medium">{previewBookingPage.panel.emptyCartMessage}</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/12 bg-[rgba(255,255,255,0.08)] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/56">
                      {previewBookingPage.schedule.title}
                    </p>
                    <p className="mt-2 text-[14px] font-medium leading-relaxed text-white/74">
                      {previewBookingPage.schedule.description}
                    </p>
                    <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-[#5f6773]">
                      <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">
                        {previewBookingPage.schedule.masterLabel}
                      </p>
                      <p className="mt-2 text-[14px] font-semibold text-ink">
                        {previewBookingPage.schedule.anyMasterLabel}
                      </p>
                      <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">
                        {previewBookingPage.schedule.slotsTitle}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {['10:00', '10:30', '11:00'].map((slot) => (
                          <span
                            key={slot}
                            className="rounded-full border border-line bg-[#f8fafc] px-3 py-2 text-[13px] font-extrabold text-ink"
                          >
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded-[28px] bg-white px-4 py-4 text-ink shadow-[0_16px_36px_rgba(26,56,64,0.18)]">
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">
                  {previewBookingPage.confirmation.eyebrow}
                </p>
                <p className="mt-3 text-[28px] font-extrabold leading-tight text-ink">
                  {previewBookingPage.confirmation.title}
                </p>
                <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                  {previewClientText}
                </p>

                <div className="mt-4 rounded-[20px] border border-line bg-[#f8fafc] px-4 py-4">
                  <p className="text-[15px] font-extrabold text-ink">
                    {previewBookingPage.confirmation.profileLabel}
                  </p>
                  <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                    {previewDiscountText}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-line bg-[#fbfcfe] px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">
                      {previewBookingPage.confirmation.promoLabel}
                    </p>
                    <p className="mt-2 text-[14px] font-medium text-[#7a8493]">
                      {previewBookingPage.confirmation.promoPlaceholder}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-line bg-[#fbfcfe] px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">
                      {previewBookingPage.confirmation.commentLabel}
                    </p>
                    <p className="mt-2 text-[14px] font-medium text-[#7a8493]">
                      {previewBookingPage.confirmation.commentPlaceholder}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-[20px] border border-line bg-[#f8fafc] px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8d95a1]">
                    {previewBookingPage.confirmation.summaryTitle}
                  </p>
                  <p className="mt-3 text-[14px] font-medium text-[#5f6773]">
                    {previewBookingPage.confirmation.summaryServicesLabel}: {' '}
                    {previewServices[0]?.nameOnline || previewServices[0]?.name || previewBookingPage.confirmation.summaryServicesEmpty}
                  </p>
                  <p className="mt-2 text-[14px] font-medium text-[#5f6773]">
                    {previewBookingPage.confirmation.summaryTimeLabel}: {previewSlotText}
                  </p>
                  <p className="mt-4 text-[24px] font-extrabold text-ink">1 500 ₽</p>
                </div>

                <button type="button" className="mt-4 w-full rounded-full bg-ink px-4 py-3 text-[14px] font-extrabold text-white">
                  {previewBookingPage.confirmation.submitLabel}
                </button>
              </div>
            </div>
          </section>

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

          {previewContacts.length > 0 ? (
            <div className="mt-5">{renderPreviewContactsSection(previewContacts, 'Контакты')}</div>
          ) : null}

          {previewBlocks.length > 0 ? (
            <details className="mt-5 rounded-[24px] border border-line bg-white px-5 py-5">
              <summary className="cursor-pointer list-none text-[16px] font-extrabold text-ink">
                Legacy-блоки старой схемы: {previewBlocks.length}
              </summary>
              <div className="mt-4 space-y-5">
                {previewBlocks.map((block) => renderPreviewBlock(block))}
              </div>
            </details>
          ) : null}
        </div>
      </div>
    );
  };

  const renderPublishDetail = () => (
    <div className="space-y-5">
      <SectionCard
        title="Диагностика структуры"
        subtitle="Необязательная проверка draft-версии. После сохранения изменения уже публикуются автоматически."
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
                <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#8590a0]">Draft-версия</div>
                <div className="mt-1 text-[24px] font-extrabold text-ink">{previewState.data.version}</div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#8590a0]">Legacy-блоков</div>
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
          <div className="rounded-2xl bg-white px-4 py-4 text-[15px] font-semibold text-[#5f6773]">Диагностика ещё не загружена.</div>
        )}
      </SectionCard>

      <SectionCard
        title="Автопубликация"
        subtitle="Любое сохранение из этого редактора сразу создаёт новую опубликованную версию сайта."
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
                      {formatDate(release.publishedAt)} • Legacy-блоков: {release.blocksCount}
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

        {activeCategory === 'home' ? renderHomeDetail() : null}
        {activeCategory === 'general' ? renderGeneralDetail() : null}
        {activeCategory === 'services' ? renderServicesDetail() : null}
        {activeCategory === 'specialists' ? renderSpecialistsDetail() : null}
        {activeCategory === 'contacts' ? renderContactsDetail() : null}
        {activeCategory === 'page' ? renderPageBlocksDetail() : null}
        {activeCategory === 'promo' ? renderPromoDetail() : null}
        {activeCategory === 'legal' ? renderLegalDetail() : null}
        {activeCategory === 'advanced' ? renderAdvancedDetail() : null}
        {activeCategory === 'publish' ? renderPublishDetail() : null}
      </>
    );
  };

  const renderDesktopSidebar = () => {
    const quickItems = activeCategory
      ? categorySnapshots.filter((item) => item.key !== activeCategory).slice(0, 3)
      : categorySnapshots.slice(0, 4);
    const configuredClientSiteContentCount =
      countConfiguredSiteHomePageSections(config?.extra ?? {}) +
      countConfiguredSiteBookingPageSections(config?.extra ?? {}) +
      countConfiguredSitePageHeroes(config?.extra ?? {}) +
      siteCardsDraft.policy.sections.length;

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
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.64)]">Контента</p>
                <p className="mt-2 text-[24px] font-extrabold text-white">{configuredClientSiteContentCount}</p>
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
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b08927]">Диагностика draft</p>
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
                    Draft
                  </p>
                  <p className="mt-1 text-[22px] font-extrabold text-ink">{previewState.data.version}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="break-words text-[11px] font-bold uppercase leading-tight tracking-[0.06em] text-[#9b8858]">
                    Контента
                  </p>
                  <p className="mt-1 text-[22px] font-extrabold text-ink">
                    {countConfiguredSiteHomePageSections(previewState.data.config.extra ?? {}) +
                      countConfiguredSiteBookingPageSections(previewState.data.config.extra ?? {}) +
                      countConfiguredSitePageHeroes(previewState.data.config.extra ?? {})}
                  </p>
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
                  {countConfiguredSiteHomePageSections(previewState.data.config.extra ?? {}) > 0 ||
                  countConfiguredSiteBookingPageSections(previewState.data.config.extra ?? {}) > 0
                    ? 'Проверка собрана по тем же настройкам главной страницы и страницы записи, которые использует сайт mari.'
                    : 'Главная страница и страница записи пока в дефолтном состоянии. Можно перейти в нужный раздел и настроить тексты точечно.'}
                </p>
                <button
                  type="button"
                  onClick={() => openCategoryPage('publish')}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#1f2d39] px-4 py-3 text-[14px] font-extrabold text-white"
                >
                  Открыть состояние сайта
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[22px] bg-white px-4 py-4">
              <p className="text-[16px] font-extrabold text-ink">Диагностика ещё не загружена</p>
              <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#5f6773]">
                Здесь появится быстрый диагностический снимок draft-версии без отдельного шага публикации.
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
                  {(activeMeta?.tags ?? ['контент', 'состояние', 'автопубликация']).slice(0, 4).map((tag) => (
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
                  Проверить
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
        open={Boolean(serviceEditor)}
        onDismiss={() => setServiceEditor(null)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight, 720)]}
        defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? 0}
      >
        {serviceEditor ? (
          <div className="bg-white px-4 pb-6 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[20px] font-extrabold text-ink">
                  {serviceEditor.mode === 'create' ? 'Новая услуга' : 'Редактировать услугу'}
                </h3>
                <p className="mt-1 text-[14px] font-semibold text-muted">Данные этой формы управляют ServiceCard на клиентском сайте.</p>
              </div>
              <button type="button" onClick={() => setServiceEditor(null)} className="rounded-lg p-2 text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <TextField
                label="Название в системе"
                value={serviceEditor.draft.name}
                onChange={(value) => setServiceEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, name: value } } : prev))}
              />
              <TextField
                label="Название для клиента"
                value={serviceEditor.draft.nameOnline}
                onChange={(value) => setServiceEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, nameOnline: value } } : prev))}
              />
              <TextAreaField
                label="Краткое описание"
                value={serviceEditor.draft.description}
                onChange={(value) => setServiceEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, description: value } } : prev))}
                rows={4}
              />

              <label className="block">
                <span className="mb-1 block text-[14px] font-semibold text-muted">Категория</span>
                <select
                  value={serviceEditor.draft.categoryId}
                  onChange={(event) =>
                    setServiceEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, categoryId: event.target.value } } : prev))
                  }
                  className="w-full rounded-2xl border-[2px] border-line bg-white px-4 py-3 text-[17px] font-medium text-ink outline-none"
                >
                  {serviceCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <TextField
                  label="Длительность, мин"
                  value={serviceEditor.draft.durationMinutes}
                  onChange={(value) => setServiceEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, durationMinutes: value } } : prev))}
                  type="number"
                />
                <TextField
                  label="Цена от"
                  value={serviceEditor.draft.priceMin}
                  onChange={(value) => setServiceEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, priceMin: value } } : prev))}
                  type="number"
                />
                <TextField
                  label="Цена до"
                  value={serviceEditor.draft.priceMax}
                  onChange={(value) => setServiceEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, priceMax: value } } : prev))}
                  type="number"
                />
              </div>

              <ToggleField
                label="Показывать услугу на сайте"
                checked={serviceEditor.draft.isActive}
                onToggle={() =>
                  setServiceEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, isActive: !prev.draft.isActive } } : prev))
                }
              />
            </div>

            <button
              type="button"
              onClick={() => {
                void saveServiceEditor();
              }}
              disabled={busyKey === 'service-create' || busyKey === `service-save:${serviceEditor.source?.id ?? 'draft'}`}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-screen px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'service-create' || busyKey === `service-save:${serviceEditor.source?.id ?? 'draft'}` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Сохранить услугу
            </button>
          </div>
        ) : null}
      </PageSheet>

      <PageSheet
        open={Boolean(offerEditor)}
        onDismiss={() => setOfferEditor(null)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight, 720)]}
        defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? 0}
      >
        {offerEditor ? (
          <div className="bg-white px-4 pb-6 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[20px] font-extrabold text-ink">
                  {offerEditor.mode === 'create' ? 'Новое предложение' : 'Редактировать предложение'}
                </h3>
                <p className="mt-1 text-[14px] font-semibold text-muted">Данные этой формы управляют OfferCard на клиентском сайте.</p>
              </div>
              <button type="button" onClick={() => setOfferEditor(null)} className="rounded-lg p-2 text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <TextField label="Slug" value={offerEditor.draft.slug} onChange={(value) => setOfferEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, slug: value } } : prev))} />
              <TextField label="Title" value={offerEditor.draft.title} onChange={(value) => setOfferEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, title: value } } : prev))} />
              <TextField label="Subtitle" value={offerEditor.draft.subtitle} onChange={(value) => setOfferEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, subtitle: value } } : prev))} />
              <TextAreaField label="Description" value={offerEditor.draft.description} onChange={(value) => setOfferEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, description: value } } : prev))} rows={4} />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Badge" value={offerEditor.draft.badge} onChange={(value) => setOfferEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, badge: value } } : prev))} />
                <TextField label="CTA href" value={offerEditor.draft.ctaHref} onChange={(value) => setOfferEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, ctaHref: value } } : prev))} />
              </div>
              <TextField label="Price note" value={offerEditor.draft.priceNote} onChange={(value) => setOfferEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, priceNote: value } } : prev))} />
            </div>

            <button
              type="button"
              onClick={() => {
                void saveOfferEditor();
              }}
              disabled={busyKey === 'site-cards'}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-screen px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'site-cards' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить предложение
            </button>
          </div>
        ) : null}
      </PageSheet>

      <PageSheet
        open={Boolean(newsEditor)}
        onDismiss={() => setNewsEditor(null)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight, 760)]}
        defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? 0}
      >
        {newsEditor ? (
          <div className="bg-white px-4 pb-6 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[20px] font-extrabold text-ink">
                  {newsEditor.mode === 'create' ? 'Новая статья' : 'Редактировать статью'}
                </h3>
                <p className="mt-1 text-[14px] font-semibold text-muted">Данные этой формы управляют ArticleCard и детальной страницей новости.</p>
              </div>
              <button type="button" onClick={() => setNewsEditor(null)} className="rounded-lg p-2 text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <TextField label="Slug" value={newsEditor.draft.slug} onChange={(value) => setNewsEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, slug: value } } : prev))} />
              <TextField label="Title" value={newsEditor.draft.title} onChange={(value) => setNewsEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, title: value } } : prev))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Category" value={newsEditor.draft.category} onChange={(value) => setNewsEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, category: value } } : prev))} />
                <TextField label="Published at" value={newsEditor.draft.publishedAt} onChange={(value) => setNewsEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, publishedAt: value } } : prev))} placeholder="2026-03-15" />
              </div>
              <TextAreaField label="Excerpt" value={newsEditor.draft.excerpt} onChange={(value) => setNewsEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, excerpt: value } } : prev))} rows={4} />
              <TextAreaField
                label="Body"
                value={newsEditor.draft.bodyText}
                onChange={(value) => setNewsEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, bodyText: value } } : prev))}
                rows={10}
                placeholder="Каждый абзац отделяйте пустой строкой."
              />
            </div>

            <button
              type="button"
              onClick={() => {
                void saveNewsEditor();
              }}
              disabled={busyKey === 'site-cards'}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-screen px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'site-cards' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить статью
            </button>
          </div>
        ) : null}
      </PageSheet>

      <PageSheet
        open={Boolean(locationEditor)}
        onDismiss={() => setLocationEditor(null)}
        snapPoints={({ maxHeight }) => [Math.min(maxHeight, 760)]}
        defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? 0}
      >
        {locationEditor ? (
          <div className="bg-white px-4 pb-6 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[20px] font-extrabold text-ink">
                  {locationEditor.mode === 'create' ? 'Новая локация' : 'Редактировать локацию'}
                </h3>
                <p className="mt-1 text-[14px] font-semibold text-muted">Базовые данные для LocationCard и связанных сценариев клиентского сайта.</p>
              </div>
              <button type="button" onClick={() => setLocationEditor(null)} className="rounded-lg p-2 text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <TextField label="Slug" value={locationEditor.draft.slug} onChange={(value) => setLocationEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, slug: value } } : prev))} />
              <TextField label="Название" value={locationEditor.draft.name} onChange={(value) => setLocationEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, name: value } } : prev))} />
              <TextField label="Район / формат" value={locationEditor.draft.district} onChange={(value) => setLocationEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, district: value } } : prev))} />
              <TextField label="Адрес" value={locationEditor.draft.address} onChange={(value) => setLocationEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, address: value } } : prev))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Телефон" value={locationEditor.draft.phone} onChange={(value) => setLocationEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, phone: value } } : prev))} />
                <TextField label="Часы работы" value={locationEditor.draft.workingHours} onChange={(value) => setLocationEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, workingHours: value } } : prev))} />
              </div>
              <TextField label="Ссылка на карту" value={locationEditor.draft.mapUrl} onChange={(value) => setLocationEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, mapUrl: value } } : prev))} />
              <TextAreaField label="Описание" value={locationEditor.draft.description} onChange={(value) => setLocationEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, description: value } } : prev))} rows={4} />
              <TextAreaField label="Примечание" value={locationEditor.draft.note} onChange={(value) => setLocationEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, note: value } } : prev))} rows={3} />
            </div>

            <button
              type="button"
              onClick={() => {
                void saveLocationEditor();
              }}
              disabled={busyKey === 'site-cards'}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-screen px-4 py-3 text-[15px] font-extrabold text-ink disabled:opacity-50"
            >
              {busyKey === 'site-cards' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить локацию
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
