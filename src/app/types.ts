import type { Dispatch, SetStateAction } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { StaffPermissionCatalogItem, StaffRole, StaffSession } from '../api';

export type { StaffPermissionCatalogItem, StaffRole, StaffSession };

export type TabKey = 'journal' | 'schedule' | 'clients' | 'analytics' | 'services' | 'more';
export type AppPage =
  | 'tabs'
  | 'forbidden'
  | 'scheduleEditor'
  | 'staff'
  | 'owner'
  | 'settings'
  | 'settingsNotifications'
  | 'privacyPolicy'
  | 'staffEditor'
  | 'staffServicesEditor'
  | 'clientHistory'
  | 'journalCreate'
  | 'journalSettings'
  | 'journalAppointment'
  | 'journalClient'
  | 'journalDayEdit'
  | 'journalDayRemove'
  | 'clientSiteEditor'
  | 'servicesCategories'
  | 'servicesCategory'
  | 'serviceEditor'
  | 'serviceProvidersEditor'
  | 'serviceCategoryEditor';

export type TabItem = {
  key: TabKey;
  title: string;
  icon: LucideIcon;
};

export type StaffItem = {
  id: string;
  name: string;
  role: StaffRole;
  phoneE164: string;
  email: string | null;
  receivesAllAppointmentNotifications: boolean;
  avatarUrl: string | null;
  avatarAssetId: string | null;
  isActive: boolean;
  hiredAt: Date | null;
  firedAt: Date | null;
  deletedAt: Date | null;
  positionName: string | null;
};

export type StaffEmploymentStatus = 'current' | 'fired' | 'deleted';
export type StaffEmploymentFilter = 'all' | StaffEmploymentStatus;

export type StaffCreateRole = 'ADMIN' | 'MASTER' | 'DEVELOPER' | 'SMM';

export type StaffDraft = {
  name: string;
  phone: string;
  email: string;
  positionName: string;
  role: StaffCreateRole;
};

export type StaffFilter = {
  withServices: boolean;
  employmentStatus: StaffEmploymentFilter;
};

export type ScheduleEditorOpenOptions = {
  presentation?: 'page' | 'panel';
  focusDate?: Date;
};

export type OwnerDraft = {
  name: string;
  phone: string;
  email: string;
  positionName: string;
};

export type ClientItem = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  comment?: string;
  avatarUrl?: string | null;
  permanentDiscountType?: string;
  permanentDiscountValue?: number | null;
};

export type ServiceItem = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  nameOnline: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  durationSec: number;
  priceMin: number;
  priceMax: number;
};

export type ServiceCategoryItem = {
  id: string;
  name: string;
  count: number;
};

export type ServiceDraft = {
  id: string | null;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  imageUrl: string;
  durationSec: number;
  priceMin: number;
  priceMax: number;
  isActive: boolean;
};

export type AppointmentItem = {
  id: string;
  staffId: string;
  staffName: string;
  clientId: string;
  startAt: Date;
  endAt: Date;
  status: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  amountBeforeDiscount: number | null;
  discountPercent: number | null;
  amountAfterDiscount: number | null;
  paidAmount: number | null;
  createdAt: Date;
};

export type JournalClientDraft = {
  name: string;
  phone: string;
  email: string;
  comment: string;
};

export type JournalSettingsDensity = 'comfortable' | 'compact';
export type JournalSettingsPeriodPreset = 'all' | 'today' | '7d' | '30d';
export type JournalSettingsStatusFilter =
  | 'all'
  | 'PENDING'
  | 'CONFIRMED'
  | 'ARRIVED'
  | 'NO_SHOW';
export type JournalSettingsAutoRefreshSeconds = 0 | 20 | 60 | 300;
export type JournalSettingsMobileStaffMode = 'all' | 'selected';

export type JournalSettings = {
  density: JournalSettingsDensity;
  showClientPhone: boolean;
  showServiceTime: boolean;
  showCreatedDate: boolean;
  showAmount: boolean;
  showMarkedDates: boolean;
  defaultPeriod: JournalSettingsPeriodPreset;
  defaultStatus: JournalSettingsStatusFilter;
  autoRefreshSeconds: JournalSettingsAutoRefreshSeconds;
  confirmStatusChange: boolean;
  confirmDelete: boolean;
  mobileStaffMode: JournalSettingsMobileStaffMode;
  mobileSelectedStaffIds: string[];
};

export type JournalCreateDraft = {
  clientName: string;
  clientPhone: string;
  dateValue: string;
  startTime: string;
  durationMin: number;
  staffId: string;
  serviceId: string;
};

export type JournalCard = AppointmentItem & {
  left: number;
  top: number;
  height: number;
  timeLabel: string;
  topTone: 'green' | 'violet';
};

export type NotificationItem = {
  id: string;
  label: string;
  time: string;
  mode: 'new' | 'delete';
};

export type SettingsNotificationItem = {
  id: string;
  title: string;
  enabled: boolean;
  channel: 'email';
  channelLabel: string;
};

export type SettingsNotificationGroup = {
  id: string;
  title: string;
  items: SettingsNotificationItem[];
};

export type SettingsNotificationSection = {
  id: string;
  title: string;
  groups: SettingsNotificationGroup[];
};

export type WorkingHoursMap = Record<string, Record<string, string[]>>;

export type InfoPanelState = {
  title: string;
  lines: string[];
} | null;

export type LoadingState = {
  boot: boolean;
  auth: boolean;
  staff: boolean;
  clients: boolean;
  services: boolean;
  appointments: boolean;
  schedule: boolean;
  reports: boolean;
  settings: boolean;
  action: boolean;
};

export type MoreActionItem = {
  title: string;
  icon: LucideIcon;
};

export type ControllerState = {
  page: AppPage;
  tab: TabKey;
  session: StaffSession | null;
  selectedDate: Date;
  weekDates: Date[];
  staff: StaffItem[];
  visibleStaff: StaffItem[];
  journalStaff: StaffItem[];
  filteredStaff: StaffItem[];
  staffSearch: string;
  staffFilter: StaffFilter;
  staffServiceCounts: Record<string, number>;
  clients: ClientItem[];
  clientsQuery: string;
  services: ServiceItem[];
  serviceCategories: ServiceCategoryItem[];
  filteredServiceCategories: ServiceCategoryItem[];
  selectedServiceCategoryId: string | null;
  selectedServiceCategoryName: string;
  selectedCategoryServices: ServiceItem[];
  filteredSelectedCategoryServices: ServiceItem[];
  servicesCategorySearch: string;
  servicesItemsSearch: string;
  serviceCategoryEditorId: string | null;
  serviceCategoryEditorName: string;
  serviceDraft: ServiceDraft;
  serviceProviders: StaffItem[];
  serviceAssignableStaff: StaffItem[];
  serviceProvidersLoading: boolean;
  scheduleEditorStaff: StaffItem | null;
  scheduleEditorDays: number[];
  scheduleEditorStart: string;
  scheduleEditorEnd: string;
  appointments: AppointmentItem[];
  journalListAppointments: AppointmentItem[];
  journalCards: JournalCard[];
  notifications: NotificationItem[];
  workingHoursByStaff: WorkingHoursMap;
  journalHours: string[];
  panel: InfoPanelState;
  toast: string;
  appError: string;
  authPhone: string;
  authPin: string;
  authError: string;
  loading: LoadingState;
  accessDeniedPath: string;
  moreMenu: MoreActionItem[];
  visibleTabs: TabItem[];
  clientActionsFor: ClientItem | null;
  clientHistoryTarget: ClientItem | null;
  clientHistoryAppointments: AppointmentItem[];
  clientHistoryLoading: boolean;
  journalAppointmentTarget: AppointmentItem | null;
  journalClientTarget: ClientItem | null;
  journalClientDraft: JournalClientDraft;
  journalClientHistory: AppointmentItem[];
  journalClientLoading: boolean;
  journalClientSaving: boolean;
  staffFormMode: 'create' | 'edit' | null;
  staffDraft: StaffDraft;
  editingStaffStatus: StaffEmploymentStatus;
  editingStaffHiredAt: Date | null;
  editingStaffFiredAt: Date | null;
  editingStaffDeletedAt: Date | null;
  editorAccessEnabled: boolean;
  editorServiceCount: number;
  editorServiceNames: string[];
  staffServicesEditorQuery: string;
  staffServicesEditorSelectedIds: string[];
  filteredStaffServicesForEditor: ServiceItem[];
  ownerDraft: OwnerDraft;
  ownerCanEdit: boolean;
  ownerAvatarPreviewUrl: string;
  journalDatePickerOpen: boolean;
  journalMarkedDates: string[];
  journalActionStaff: StaffItem | null;
  journalDayStart: string;
  journalDayEnd: string;
  journalSettings: JournalSettings;
  journalCreateDraft: JournalCreateDraft;
  journalCreateServiceIdsByStaff: Record<string, string[]>;
  journalCreateServicesLoading: boolean;
  staffAvatarPreviewUrl: string;
  serviceImagePreviewUrl: string;
  staffAvatarServerDirHint: string;
  serviceImageServerDirHint: string;
  editorPermissionsSheetOpen: boolean;
  editorPermissionCatalog: StaffPermissionCatalogItem[];
  editorPermissionCodes: string[];
  editorPermissionBusyCode: string | null;
  editorAllAppointmentNotificationsEnabled: boolean;
  editorAllAppointmentNotificationsBusy: boolean;
  canViewClients: boolean;
  canViewClientPhone: boolean;
  canCreateJournalAppointments: boolean;
  canEditClients: boolean;
  canEditJournal: boolean;
  canSelectPastJournalDates: boolean;
  canEditPrivacyPolicy: boolean;
  canEditSettings: boolean;
  settingsClientCancelMinNoticeMinutes: number | null;
  settingsNotificationMinNoticeMinutes: number | null;
  settingsNotificationSections: SettingsNotificationSection[];
  privacyPolicyText: string;
};

export type ControllerActions = {
  setAuthPhone: (value: string) => void;
  setAuthPin: (value: string) => void;
  handleLogin: () => Promise<void>;
  handleSetPin: (token: string, pin: string) => Promise<void>;
  handleRequestPinReset: (email: string) => Promise<{ sent: boolean; resetLink?: string }>;
  handleConfirmPinReset: (token: string, newPin: string) => Promise<void>;
  handleLogout: () => Promise<void>;
  setClientsQuery: (value: string) => void;
  setSelectedDate: (value: Date) => void;
  setStaffSearch: (value: string) => void;
  setStaffFilter: Dispatch<SetStateAction<StaffFilter>>;
  setStaffDraft: Dispatch<SetStateAction<StaffDraft>>;
  setOwnerDraft: Dispatch<SetStateAction<OwnerDraft>>;
  setEditorAccessEnabled: (value: boolean) => void;
  setTab: (value: TabKey) => void;
  setPanel: (value: InfoPanelState) => void;
  closePanel: () => void;
  handleTabChange: (next: TabKey) => void;
  refreshAll: () => Promise<void>;
  refreshSchedule: () => Promise<void>;
  loadAppointmentsForSelectedDate: () => Promise<void>;
  loadClientsByDebouncedQuery: () => Promise<void>;
  resetAndLoadClients: () => Promise<void>;
  openStaffCreate: () => void;
  openStaffEdit: (item: StaffItem) => Promise<void>;
  backFromStaffEditor: () => void;
  closeStaffServicesEditor: () => void;
  backFromStaffList: () => void;
  closeOwnerPage: () => void;
  closeSettingsPage: () => void;
  openSettingsNotificationsPage: () => void;
  closeSettingsNotificationsPage: () => void;
  closePrivacyPolicyPage: () => void;
  handleOpenOwnerEditor: () => Promise<void>;
  handleSaveOwner: () => Promise<void>;
  handleCreateStaff: () => Promise<void>;
  handleUpdateStaff: () => Promise<void>;
  handleFireStaff: () => Promise<void>;
  handleRestoreStaff: () => Promise<void>;
  handleDeleteStaff: () => Promise<void>;
  refreshStaffAndMeta: () => Promise<void>;
  handleOpenClientActions: (client: ClientItem) => void;
  handleCloseClientActions: () => void;
  handleOpenClientHistory: () => Promise<void>;
  handleOpenClientLoyalty: () => Promise<void>;
  handleCloseClientHistory: () => void;
  handleOpenJournalAppointment: (appointment: AppointmentItem) => void;
  handleCloseJournalAppointment: () => void;
  handleDeleteJournalAppointment: () => Promise<void>;
  handleUpdateJournalAppointmentStatus: (
    status: 'PENDING' | 'ARRIVED' | 'NO_SHOW' | 'CONFIRMED',
  ) => Promise<void>;
  handleOpenJournalClient: () => Promise<void>;
  handleCloseJournalClient: () => void;
  setJournalClientDraft: Dispatch<SetStateAction<JournalClientDraft>>;
  handleSaveJournalClient: () => Promise<void>;
  handleCallJournalClient: () => void;
  handleSmsJournalClient: () => void;
  handleWhatsAppJournalClient: () => void;
  handleCallClient: () => void;
  handleSmsClient: () => void;
  handleWhatsAppClient: () => void;
  handleDeleteClient: (client?: ClientItem) => Promise<boolean>;
  handleImportClientsFromContacts: (
    contacts: Array<{ name: string; phone: string }>,
  ) => Promise<{ imported: number; skipped: number }>;
  handleSetDate: () => void;
  handleCreateAppointment: () => Promise<void>;
  closeJournalCreatePage: () => void;
  saveJournalCreateAppointment: () => Promise<void>;
  setJournalCreateDraft: Dispatch<SetStateAction<JournalCreateDraft>>;
  openJournalSettingsPage: () => void;
  closeJournalSettingsPage: () => void;
  resetJournalSettings: () => void;
  setJournalSettings: Dispatch<SetStateAction<JournalSettings>>;
  handleScheduleEdit: () => Promise<void>;
  openScheduleEditorForStaff: (item: StaffItem, options?: ScheduleEditorOpenOptions) => Promise<void>;
  closeScheduleEditor: () => void;
  toggleScheduleEditorDay: (day: number) => void;
  setScheduleEditorStart: (value: string) => void;
  setScheduleEditorEnd: (value: string) => void;
  applyScheduleEditorPreset: (value: string) => void;
  saveScheduleEditor: () => Promise<void>;
  clearScheduleEditor: () => Promise<void>;
  handleMoreAction: (title: string) => Promise<void>;
  saveNotificationMinNoticeMinutes: (value: number) => Promise<boolean>;
  toggleNotificationSetting: (id: string, enabled: boolean) => Promise<void>;
  openEditorServicesPanel: () => void;
  setStaffServicesEditorQuery: (value: string) => void;
  toggleStaffServiceSelection: (serviceId: string) => void;
  toggleStaffServiceCategorySelection: (categoryId: string) => void;
  saveStaffServicesEditor: () => Promise<void>;
  openEditorPermissionsPanel: () => void;
  closeEditorPermissionsPanel: () => void;
  toggleEditorPermission: (code: string, enabled: boolean) => Promise<void>;
  toggleEditorAllAppointmentNotifications: (enabled: boolean) => Promise<void>;
  handleOpenJournalStaffActions: (item: StaffItem) => void;
  handleCloseJournalStaffActions: () => void;
  closeJournalDatePicker: () => void;
  selectJournalDate: (value: Date) => void;
  handleOpenJournalDayEditPage: () => void;
  handleOpenJournalDayRemovePage: () => void;
  handleOpenJournalSchedulePage: () => void;
  handleBackFromJournalDayAction: () => void;
  setJournalDayStart: (value: string) => void;
  setJournalDayEnd: (value: string) => void;
  handleSaveJournalDayEdit: () => Promise<void>;
  handleSaveJournalDayRemove: () => Promise<void>;
  setServicesCategorySearch: (value: string) => void;
  setServicesItemsSearch: (value: string) => void;
  openServicesPage: () => Promise<void>;
  closeServicesPage: () => void;
  closeClientSiteEditor: () => void;
  openServiceCategory: (categoryId: string) => void;
  closeServiceCategory: () => void;
  openServiceCategoryEditor: (categoryId: string | null) => void;
  closeServiceCategoryEditor: () => void;
  openServiceProvidersEditor: (serviceId: string) => void;
  setServiceCategoryEditorName: (value: string) => void;
  saveServiceCategoryEditor: () => Promise<void>;
  deleteServiceCategoryEditor: () => Promise<void>;
  openServiceEditor: (serviceId: string | null) => void;
  openServiceCreateForCategory: (categoryId: string) => void;
  closeServiceEditor: () => void;
  setServiceDraft: Dispatch<SetStateAction<ServiceDraft>>;
  toggleServiceActiveInline: (serviceId: string, enabled: boolean) => Promise<void>;
  syncServiceProvidersForCurrentService: (staffIds: string[]) => Promise<void>;
  removeServiceProviderFromCurrentService: (staffId: string) => Promise<void>;
  saveServiceEditor: () => Promise<void>;
  deleteServiceEditor: () => Promise<void>;
  handleSelectStaffAvatarFile: (file: File) => Promise<void>;
  handleDeleteStaffAvatar: () => Promise<void>;
  handleSelectOwnerAvatarFile: (file: File) => Promise<void>;
  handleDeleteOwnerAvatar: () => Promise<void>;
  handleSelectServiceImageFile: (file: File) => Promise<void>;
  savePrivacyPolicy: (value: string) => Promise<boolean>;
};

export type AppController = {
  state: ControllerState;
  actions: ControllerActions;
};

export type LoadingSetter = Dispatch<SetStateAction<LoadingState>>;
