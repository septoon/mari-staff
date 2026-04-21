import { useRef, useState } from 'react';
import {
  DEFAULT_JOURNAL_SETTINGS,
  DEFAULT_STAFF_ROLE,
  EMPTY_OWNER_DRAFT,
  EMPTY_SERVICE_DRAFT,
  EMPTY_STAFF_DRAFT,
  EMPTY_STAFF_FILTER,
  JOURNAL_SETTINGS_STORAGE_KEY,
} from '../constants';
import type {
  AppPage,
  AppointmentItem,
  ClientItem,
  InfoPanelState,
  LoadingState,
  OwnerDraft,
  JournalSettings,
  ServiceCategoryItem,
  ServiceDraft,
  ServiceSectionItem,
  ServiceItem,
  StaffCreateRole,
  StaffDraft,
  StaffFilter,
  StaffItem,
  SettingsNotificationSection,
  StaffPermissionCatalogItem,
  StaffSession,
  TabKey,
  JournalClientDraft,
  JournalCreateDraft,
  WorkingHoursMap,
} from '../types';

function loadJournalSettings(): JournalSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_JOURNAL_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(JOURNAL_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_JOURNAL_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<JournalSettings> | null;
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_JOURNAL_SETTINGS;
    }

    return {
      density: parsed.density === 'compact' ? 'compact' : DEFAULT_JOURNAL_SETTINGS.density,
      showClientPhone:
        typeof parsed.showClientPhone === 'boolean'
          ? parsed.showClientPhone
          : DEFAULT_JOURNAL_SETTINGS.showClientPhone,
      showServiceTime:
        typeof parsed.showServiceTime === 'boolean'
          ? parsed.showServiceTime
          : DEFAULT_JOURNAL_SETTINGS.showServiceTime,
      showCreatedDate:
        typeof parsed.showCreatedDate === 'boolean'
          ? parsed.showCreatedDate
          : DEFAULT_JOURNAL_SETTINGS.showCreatedDate,
      showAmount:
        typeof parsed.showAmount === 'boolean'
          ? parsed.showAmount
          : DEFAULT_JOURNAL_SETTINGS.showAmount,
      showMarkedDates:
        typeof parsed.showMarkedDates === 'boolean'
          ? parsed.showMarkedDates
          : DEFAULT_JOURNAL_SETTINGS.showMarkedDates,
      defaultPeriod:
        parsed.defaultPeriod === 'today' ||
        parsed.defaultPeriod === '7d' ||
        parsed.defaultPeriod === '30d'
          ? parsed.defaultPeriod
          : DEFAULT_JOURNAL_SETTINGS.defaultPeriod,
      defaultStatus:
        parsed.defaultStatus === 'PENDING' ||
        parsed.defaultStatus === 'CONFIRMED' ||
        parsed.defaultStatus === 'ARRIVED' ||
        parsed.defaultStatus === 'NO_SHOW'
          ? parsed.defaultStatus
          : DEFAULT_JOURNAL_SETTINGS.defaultStatus,
      autoRefreshSeconds:
        parsed.autoRefreshSeconds === 0 ||
        parsed.autoRefreshSeconds === 20 ||
        parsed.autoRefreshSeconds === 60 ||
        parsed.autoRefreshSeconds === 300
          ? parsed.autoRefreshSeconds
          : DEFAULT_JOURNAL_SETTINGS.autoRefreshSeconds,
      confirmStatusChange:
        typeof parsed.confirmStatusChange === 'boolean'
          ? parsed.confirmStatusChange
          : DEFAULT_JOURNAL_SETTINGS.confirmStatusChange,
      confirmDelete:
        typeof parsed.confirmDelete === 'boolean'
          ? parsed.confirmDelete
          : DEFAULT_JOURNAL_SETTINGS.confirmDelete,
      mobileStaffMode:
        parsed.mobileStaffMode === 'selected'
          ? 'selected'
          : DEFAULT_JOURNAL_SETTINGS.mobileStaffMode,
      mobileSelectedStaffIds: Array.isArray(parsed.mobileSelectedStaffIds)
        ? parsed.mobileSelectedStaffIds.filter((value): value is string => typeof value === 'string')
        : DEFAULT_JOURNAL_SETTINGS.mobileSelectedStaffIds,
    };
  } catch {
    return DEFAULT_JOURNAL_SETTINGS;
  }
}

function buildEmptyJournalCreateDraft(): JournalCreateDraft {
  return {
    clientName: '',
    clientPhone: '',
    dateValue: '',
    startTime: '10:00',
    durationMin: 60,
    staffId: '',
    serviceId: '',
  };
}

export function useAppState() {
  const [page, setPage] = useState<AppPage>('tabs');
  const [tab, setTab] = useState<TabKey>('journal');
  const [session, setSession] = useState<StaffSession | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [clientsQuery, setClientsQuery] = useState('');
  const [debouncedClientsQuery, setDebouncedClientsQuery] = useState('');
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [clientActionsFor, setClientActionsFor] = useState<ClientItem | null>(null);
  const [clientHistoryTarget, setClientHistoryTarget] = useState<ClientItem | null>(null);
  const [clientHistoryAppointments, setClientHistoryAppointments] = useState<AppointmentItem[]>([]);
  const [clientHistoryLoading, setClientHistoryLoading] = useState(false);
  const [journalAppointmentTarget, setJournalAppointmentTarget] = useState<AppointmentItem | null>(null);
  const [journalClientTarget, setJournalClientTarget] = useState<ClientItem | null>(null);
  const [journalClientDraft, setJournalClientDraft] = useState<JournalClientDraft>({
    name: '',
    phone: '',
    email: '',
    comment: '',
  });
  const [journalClientHistory, setJournalClientHistory] = useState<AppointmentItem[]>([]);
  const [journalClientLoading, setJournalClientLoading] = useState(false);
  const [journalClientSaving, setJournalClientSaving] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [journalListAppointments, setJournalListAppointments] = useState<AppointmentItem[]>([]);
  const [workingHoursByStaff, setWorkingHoursByStaff] = useState<WorkingHoursMap>({});
  const [panel, setPanel] = useState<InfoPanelState>(null);
  const [toast, setToast] = useState('');
  const [appError, setAppError] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPin, setAuthPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState<StaffFilter>(EMPTY_STAFF_FILTER);
  const [staffFormMode, setStaffFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffDraft, setStaffDraft] = useState<StaffDraft>(EMPTY_STAFF_DRAFT);
  const [editorAccessEnabled, setEditorAccessEnabled] = useState(true);
  const [staffServiceCounts, setStaffServiceCounts] = useState<Record<string, number>>({});
  const [editorServiceCount, setEditorServiceCount] = useState(0);
  const [editorServiceNames, setEditorServiceNames] = useState<string[]>([]);
  const [staffServicesEditorQuery, setStaffServicesEditorQuery] = useState('');
  const [staffServicesEditorSelectedIds, setStaffServicesEditorSelectedIds] = useState<string[]>([]);
  const [originalEditRole, setOriginalEditRole] = useState<StaffCreateRole>(DEFAULT_STAFF_ROLE);
  const [ownerEditId, setOwnerEditId] = useState<string | null>(null);
  const [ownerDraft, setOwnerDraft] = useState<OwnerDraft>(EMPTY_OWNER_DRAFT);
  const [scheduleEditorStaff, setScheduleEditorStaff] = useState<StaffItem | null>(null);
  const [scheduleEditorDays, setScheduleEditorDays] = useState<number[]>([]);
  const [scheduleEditorStart, setScheduleEditorStart] = useState('10:00');
  const [scheduleEditorEnd, setScheduleEditorEnd] = useState('18:00');
  const [scheduleEditorBookingStart, setScheduleEditorBookingStart] = useState('10:00');
  const [scheduleEditorBookingEnd, setScheduleEditorBookingEnd] = useState('18:00');
  const [scheduleOnlineSlotsStaff, setScheduleOnlineSlotsStaff] = useState<StaffItem | null>(null);
  const [scheduleOnlineSlotsDate, setScheduleOnlineSlotsDate] = useState<Date | null>(null);
  const [scheduleOnlineSlotsShiftStart, setScheduleOnlineSlotsShiftStart] = useState('10:00');
  const [scheduleOnlineSlotsShiftEnd, setScheduleOnlineSlotsShiftEnd] = useState('18:00');
  const [scheduleOnlineSlotsBookingStart, setScheduleOnlineSlotsBookingStart] = useState('10:00');
  const [scheduleOnlineSlotsBookingEnd, setScheduleOnlineSlotsBookingEnd] = useState('18:00');
  const [scheduleOnlineSlotsSelectedTimes, setScheduleOnlineSlotsSelectedTimes] = useState<string[]>([]);
  const [scheduleOnlineSlotsInitialShiftStart, setScheduleOnlineSlotsInitialShiftStart] = useState('10:00');
  const [scheduleOnlineSlotsInitialShiftEnd, setScheduleOnlineSlotsInitialShiftEnd] = useState('18:00');
  const [scheduleOnlineSlotsInitialBookingStart, setScheduleOnlineSlotsInitialBookingStart] = useState('10:00');
  const [scheduleOnlineSlotsInitialBookingEnd, setScheduleOnlineSlotsInitialBookingEnd] = useState('18:00');
  const [scheduleOnlineSlotsInitialSelectedTimes, setScheduleOnlineSlotsInitialSelectedTimes] = useState<string[]>([]);
  const [journalDatePickerOpen, setJournalDatePickerOpen] = useState(false);
  const [journalMarkedDates, setJournalMarkedDates] = useState<string[]>([]);
  const [journalActionStaff, setJournalActionStaff] = useState<StaffItem | null>(null);
  const [journalDayStart, setJournalDayStart] = useState('10:00');
  const [journalDayEnd, setJournalDayEnd] = useState('18:00');
  const [journalSettings, setJournalSettings] = useState<JournalSettings>(loadJournalSettings);
  const [journalCreateDraft, setJournalCreateDraft] = useState<JournalCreateDraft>(
    buildEmptyJournalCreateDraft,
  );
  const [journalCreateServiceIdsByStaff, setJournalCreateServiceIdsByStaff] = useState<
    Record<string, string[]>
  >({});
  const [journalCreateServicesLoading, setJournalCreateServicesLoading] = useState(false);
  const [servicesCategorySearch, setServicesCategorySearch] = useState('');
  const [servicesItemsSearch, setServicesItemsSearch] = useState('');
  const [localServiceCategories, setLocalServiceCategories] = useState<ServiceCategoryItem[]>([]);
  const [localServiceSections, setLocalServiceSections] = useState<ServiceSectionItem[]>([]);
  const [selectedServiceSectionId, setSelectedServiceSectionId] = useState<string | null>(null);
  const [selectedServiceSectionName, setSelectedServiceSectionName] = useState('');
  const [selectedServiceCategoryId, setSelectedServiceCategoryId] = useState<string | null>(null);
  const [selectedServiceCategoryName, setSelectedServiceCategoryName] = useState('');
  const [serviceCategoryEditorId, setServiceCategoryEditorId] = useState<string | null>(null);
  const [serviceCategoryEditorName, setServiceCategoryEditorName] = useState('');
  const [serviceCategoryEditorImagePreviewUrl, setServiceCategoryEditorImagePreviewUrl] = useState('');
  const [serviceCategoryEditorSectionId, setServiceCategoryEditorSectionId] = useState<string | null>(null);
  const [serviceCategoryEditorImageAssetId, setServiceCategoryEditorImageAssetId] = useState<string | null>(null);
  const [serviceCategoryEditorImageBlob, setServiceCategoryEditorImageBlob] = useState<Blob | null>(null);
  const [serviceCategoryEditorImageOriginalName, setServiceCategoryEditorImageOriginalName] = useState('category');
  const [serviceSectionEditorId, setServiceSectionEditorId] = useState<string | null>(null);
  const [serviceSectionEditorName, setServiceSectionEditorName] = useState('');
  const [serviceSectionEditorImagePreviewUrl, setServiceSectionEditorImagePreviewUrl] = useState('');
  const [serviceSectionEditorImageAssetId, setServiceSectionEditorImageAssetId] = useState<string | null>(null);
  const [serviceSectionEditorImageBlob, setServiceSectionEditorImageBlob] = useState<Blob | null>(null);
  const [serviceSectionEditorImageOriginalName, setServiceSectionEditorImageOriginalName] = useState('section');
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(EMPTY_SERVICE_DRAFT);
  const [serviceEditorReturnPage, setServiceEditorReturnPage] = useState<
    'servicesCategories' | 'servicesCategory'
  >('servicesCategory');
  const [serviceProviders, setServiceProviders] = useState<StaffItem[]>([]);
  const [serviceAssignableStaff, setServiceAssignableStaff] = useState<StaffItem[]>([]);
  const [serviceProvidersLoading, setServiceProvidersLoading] = useState(false);
  const [staffAvatarPreviewUrl, setStaffAvatarPreviewUrl] = useState('');
  const [staffAvatarAssetId, setStaffAvatarAssetId] = useState<string | null>(null);
  const [ownerAvatarPreviewUrl, setOwnerAvatarPreviewUrl] = useState('');
  const [ownerAvatarAssetId, setOwnerAvatarAssetId] = useState<string | null>(null);
  const [serviceImagePreviewUrl, setServiceImagePreviewUrl] = useState('');
  const [staffAvatarWebpBlob, setStaffAvatarWebpBlob] = useState<Blob | null>(null);
  const [ownerAvatarWebpBlob, setOwnerAvatarWebpBlob] = useState<Blob | null>(null);
  const [serviceImageWebpBlob, setServiceImageWebpBlob] = useState<Blob | null>(null);
  const [staffAvatarOriginalName, setStaffAvatarOriginalName] = useState('avatar');
  const [ownerAvatarOriginalName, setOwnerAvatarOriginalName] = useState('avatar');
  const [serviceImageOriginalName, setServiceImageOriginalName] = useState('service');
  const [editorPermissionsSheetOpen, setEditorPermissionsSheetOpen] = useState(false);
  const [editorPermissionCatalog, setEditorPermissionCatalog] = useState<StaffPermissionCatalogItem[]>([]);
  const [editorPermissionCodes, setEditorPermissionCodes] = useState<string[]>([]);
  const [editorPermissionBusyCode, setEditorPermissionBusyCode] = useState<string | null>(null);
  const [editorAllAppointmentNotificationsBusy, setEditorAllAppointmentNotificationsBusy] =
    useState(false);
  const [settingsClientCancelMinNoticeMinutes, setSettingsClientCancelMinNoticeMinutes] = useState<number | null>(null);
  const [settingsNotificationMinNoticeMinutes, setSettingsNotificationMinNoticeMinutes] = useState<number | null>(null);
  const [settingsNotificationSections, setSettingsNotificationSections] = useState<SettingsNotificationSection[]>([]);
  const [privacyPolicyText, setPrivacyPolicyText] = useState('');

  const routeSyncSourceRef = useRef<'idle' | 'state' | 'location'>('idle');
  const staffAvatarBlobUrlRef = useRef('');
  const ownerAvatarBlobUrlRef = useRef('');
  const serviceCategoryEditorImageBlobUrlRef = useRef('');
  const serviceSectionEditorImageBlobUrlRef = useRef('');
  const serviceImageBlobUrlRef = useRef('');
  const [loading, setLoading] = useState<LoadingState>({
    boot: true,
    auth: false,
    staff: false,
    clients: false,
    services: false,
    appointments: false,
    schedule: false,
    reports: false,
    settings: false,
    action: false,
  });
  const [accessDeniedPath, setAccessDeniedPath] = useState('');

  return {
    page,
    setPage,
    tab,
    setTab,
    session,
    setSession,
    selectedDate,
    setSelectedDate,
    clientsQuery,
    setClientsQuery,
    debouncedClientsQuery,
    setDebouncedClientsQuery,
    staff,
    setStaff,
    clients,
    setClients,
    clientActionsFor,
    setClientActionsFor,
    clientHistoryTarget,
    setClientHistoryTarget,
    clientHistoryAppointments,
    setClientHistoryAppointments,
    clientHistoryLoading,
    setClientHistoryLoading,
    journalAppointmentTarget,
    setJournalAppointmentTarget,
    journalClientTarget,
    setJournalClientTarget,
    journalClientDraft,
    setJournalClientDraft,
    journalClientHistory,
    setJournalClientHistory,
    journalClientLoading,
    setJournalClientLoading,
    journalClientSaving,
    setJournalClientSaving,
    services,
    setServices,
    appointments,
    setAppointments,
    journalListAppointments,
    setJournalListAppointments,
    workingHoursByStaff,
    setWorkingHoursByStaff,
    panel,
    setPanel,
    toast,
    setToast,
    appError,
    setAppError,
    authPhone,
    setAuthPhone,
    authPin,
    setAuthPin,
    authError,
    setAuthError,
    staffSearch,
    setStaffSearch,
    staffFilter,
    setStaffFilter,
    staffFormMode,
    setStaffFormMode,
    editingStaffId,
    setEditingStaffId,
    staffDraft,
    setStaffDraft,
    editorAccessEnabled,
    setEditorAccessEnabled,
    staffServiceCounts,
    setStaffServiceCounts,
    editorServiceCount,
    setEditorServiceCount,
    editorServiceNames,
    setEditorServiceNames,
    staffServicesEditorQuery,
    setStaffServicesEditorQuery,
    staffServicesEditorSelectedIds,
    setStaffServicesEditorSelectedIds,
    originalEditRole,
    setOriginalEditRole,
    ownerEditId,
    setOwnerEditId,
    ownerDraft,
    setOwnerDraft,
    scheduleEditorStaff,
    setScheduleEditorStaff,
    scheduleEditorDays,
    setScheduleEditorDays,
    scheduleEditorStart,
    setScheduleEditorStart,
    scheduleEditorEnd,
    setScheduleEditorEnd,
    scheduleEditorBookingStart,
    setScheduleEditorBookingStart,
    scheduleEditorBookingEnd,
    setScheduleEditorBookingEnd,
    scheduleOnlineSlotsStaff,
    setScheduleOnlineSlotsStaff,
    scheduleOnlineSlotsDate,
    setScheduleOnlineSlotsDate,
    scheduleOnlineSlotsShiftStart,
    setScheduleOnlineSlotsShiftStart,
    scheduleOnlineSlotsShiftEnd,
    setScheduleOnlineSlotsShiftEnd,
    scheduleOnlineSlotsBookingStart,
    setScheduleOnlineSlotsBookingStart,
    scheduleOnlineSlotsBookingEnd,
    setScheduleOnlineSlotsBookingEnd,
    scheduleOnlineSlotsSelectedTimes,
    setScheduleOnlineSlotsSelectedTimes,
    scheduleOnlineSlotsInitialShiftStart,
    setScheduleOnlineSlotsInitialShiftStart,
    scheduleOnlineSlotsInitialShiftEnd,
    setScheduleOnlineSlotsInitialShiftEnd,
    scheduleOnlineSlotsInitialBookingStart,
    setScheduleOnlineSlotsInitialBookingStart,
    scheduleOnlineSlotsInitialBookingEnd,
    setScheduleOnlineSlotsInitialBookingEnd,
    scheduleOnlineSlotsInitialSelectedTimes,
    setScheduleOnlineSlotsInitialSelectedTimes,
    journalDatePickerOpen,
    setJournalDatePickerOpen,
    journalMarkedDates,
    setJournalMarkedDates,
    journalActionStaff,
    setJournalActionStaff,
    journalDayStart,
    setJournalDayStart,
    journalDayEnd,
    setJournalDayEnd,
    journalSettings,
    setJournalSettings,
    journalCreateDraft,
    setJournalCreateDraft,
    journalCreateServiceIdsByStaff,
    setJournalCreateServiceIdsByStaff,
    journalCreateServicesLoading,
    setJournalCreateServicesLoading,
    servicesCategorySearch,
    setServicesCategorySearch,
    servicesItemsSearch,
    setServicesItemsSearch,
    localServiceCategories,
    setLocalServiceCategories,
    localServiceSections,
    setLocalServiceSections,
    selectedServiceSectionId,
    setSelectedServiceSectionId,
    selectedServiceSectionName,
    setSelectedServiceSectionName,
    selectedServiceCategoryId,
    setSelectedServiceCategoryId,
    selectedServiceCategoryName,
    setSelectedServiceCategoryName,
    serviceCategoryEditorId,
    setServiceCategoryEditorId,
    serviceCategoryEditorName,
    setServiceCategoryEditorName,
    serviceCategoryEditorImagePreviewUrl,
    setServiceCategoryEditorImagePreviewUrl,
    serviceCategoryEditorSectionId,
    setServiceCategoryEditorSectionId,
    serviceCategoryEditorImageAssetId,
    setServiceCategoryEditorImageAssetId,
    serviceCategoryEditorImageBlob,
    setServiceCategoryEditorImageBlob,
    serviceCategoryEditorImageOriginalName,
    setServiceCategoryEditorImageOriginalName,
    serviceSectionEditorId,
    setServiceSectionEditorId,
    serviceSectionEditorName,
    setServiceSectionEditorName,
    serviceSectionEditorImagePreviewUrl,
    setServiceSectionEditorImagePreviewUrl,
    serviceSectionEditorImageAssetId,
    setServiceSectionEditorImageAssetId,
    serviceSectionEditorImageBlob,
    setServiceSectionEditorImageBlob,
    serviceSectionEditorImageOriginalName,
    setServiceSectionEditorImageOriginalName,
    serviceDraft,
    setServiceDraft,
    serviceEditorReturnPage,
    setServiceEditorReturnPage,
    serviceProviders,
    setServiceProviders,
    serviceAssignableStaff,
    setServiceAssignableStaff,
    serviceProvidersLoading,
    setServiceProvidersLoading,
    staffAvatarPreviewUrl,
    setStaffAvatarPreviewUrl,
    staffAvatarAssetId,
    setStaffAvatarAssetId,
    ownerAvatarPreviewUrl,
    setOwnerAvatarPreviewUrl,
    ownerAvatarAssetId,
    setOwnerAvatarAssetId,
    serviceImagePreviewUrl,
    setServiceImagePreviewUrl,
    staffAvatarWebpBlob,
    setStaffAvatarWebpBlob,
    ownerAvatarWebpBlob,
    setOwnerAvatarWebpBlob,
    serviceImageWebpBlob,
    setServiceImageWebpBlob,
    staffAvatarOriginalName,
    setStaffAvatarOriginalName,
    ownerAvatarOriginalName,
    setOwnerAvatarOriginalName,
    serviceImageOriginalName,
    setServiceImageOriginalName,
    editorPermissionsSheetOpen,
    setEditorPermissionsSheetOpen,
    editorPermissionCatalog,
    setEditorPermissionCatalog,
    editorPermissionCodes,
    setEditorPermissionCodes,
    editorPermissionBusyCode,
    setEditorPermissionBusyCode,
    editorAllAppointmentNotificationsBusy,
    setEditorAllAppointmentNotificationsBusy,
    settingsClientCancelMinNoticeMinutes,
    setSettingsClientCancelMinNoticeMinutes,
    settingsNotificationMinNoticeMinutes,
    setSettingsNotificationMinNoticeMinutes,
    settingsNotificationSections,
    setSettingsNotificationSections,
    privacyPolicyText,
    setPrivacyPolicyText,
    routeSyncSourceRef,
    staffAvatarBlobUrlRef,
    ownerAvatarBlobUrlRef,
    serviceCategoryEditorImageBlobUrlRef,
    serviceSectionEditorImageBlobUrlRef,
    serviceImageBlobUrlRef,
    loading,
    setLoading,
    accessDeniedPath,
    setAccessDeniedPath,
  };
}
