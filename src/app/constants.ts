import {
  CalendarDays,
  CalendarRange,
  ChartPie,
  Clock3,
  Cog,
  Menu,
  MessageCircleMore,
  Shield,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import type {
  JournalSettings,
  MoreActionItem,
  OwnerDraft,
  StaffCreateRole,
  StaffDraft,
  StaffFilter,
  ServiceDraft,
  StaffRole,
  TabItem,
} from './types';

export const SESSION_STORAGE_KEY = 'mari.staff.session.v1';
export const JOURNAL_SETTINGS_STORAGE_KEY = 'mari.staff.journal-settings.v1';
export const HOUR_HEIGHT = 76;
export const JOURNAL_START_HOUR = 10;
export const JOURNAL_END_HOUR = 18;
export const JOURNAL_TIME_COLUMN_WIDTH = 72;
export const JOURNAL_CARD_COLUMN_WIDTH = 130;
export const JOURNAL_GRID_GAP = 8;

export const DAY_NAMES = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] as const;

export const ISO_DAY_LABELS: Record<number, string> = {
  1: 'Пн',
  2: 'Вт',
  3: 'Ср',
  4: 'Чт',
  5: 'Пт',
  6: 'Сб',
  7: 'Вс',
};

export const TAB_ITEMS: TabItem[] = [
  { key: 'journal', title: 'Журнал', icon: CalendarDays },
  { key: 'schedule', title: 'График', icon: CalendarRange },
  { key: 'clients', title: 'Клиенты', icon: Users },
  { key: 'services', title: 'Услуги', icon: Sparkles },
  { key: 'more', title: 'Еще', icon: Menu },
];

export const MORE_MENU: MoreActionItem[] = [
  { title: 'Сотрудники', icon: UserRound },
  { title: 'Аналитика', icon: ChartPie },
  { title: 'Онлайн-запись', icon: Clock3 },
  { title: 'Политика конфиденциальности', icon: Shield },
  { title: 'Настройки', icon: Cog },
  { title: 'Поддержка', icon: MessageCircleMore },
];

export const MONTHS_RU = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
] as const;

export const MONTHS_RU_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;

export const ROLE_LABELS: Record<StaffRole, string> = {
  MASTER: 'Мастер',
  OWNER: 'Владелец',
  ADMIN: 'Администратор',
  DEVELOPER: 'Разработчик',
  SMM: 'SMM',
};

export const EMPTY_STAFF_DRAFT: StaffDraft = {
  name: '',
  phone: '',
  email: '',
  positionName: '',
  role: 'MASTER',
};

export const EMPTY_STAFF_FILTER: StaffFilter = {
  withServices: false,
  employmentStatus: 'current',
};

export const EMPTY_OWNER_DRAFT: OwnerDraft = {
  name: '',
  phone: '',
  email: '',
  positionName: '',
};

export const DEFAULT_STAFF_ROLE: StaffCreateRole = 'MASTER';

export const EMPTY_SERVICE_DRAFT: ServiceDraft = {
  id: null,
  name: '',
  categoryId: '',
  categoryName: '',
  description: '',
  imageUrl: '',
  durationSec: 3600,
  priceMin: 0,
  priceMax: 0,
  isActive: true,
};

export const DEFAULT_JOURNAL_SETTINGS: JournalSettings = {
  density: 'comfortable',
  showClientPhone: true,
  showServiceTime: true,
  showCreatedDate: true,
  showAmount: true,
  showMarkedDates: true,
  defaultPeriod: 'all',
  defaultStatus: 'all',
  autoRefreshSeconds: 20,
  confirmStatusChange: true,
  confirmDelete: true,
  mobileStaffMode: 'all',
  mobileSelectedStaffIds: [],
};
