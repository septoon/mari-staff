import { useRef, useState } from 'react';
import {
  DEFAULT_STAFF_ROLE,
  EMPTY_OWNER_DRAFT,
  EMPTY_SERVICE_DRAFT,
  EMPTY_STAFF_DRAFT,
  EMPTY_STAFF_FILTER,
} from '../constants';
import type {
  AppPage,
  AppointmentItem,
  ClientItem,
  InfoPanelState,
  LoadingState,
  OwnerDraft,
  ServiceCategoryItem,
  ServiceDraft,
  ServiceItem,
  StaffCreateRole,
  StaffDraft,
  StaffFilter,
  StaffItem,
  StaffPermissionCatalogItem,
  StaffSession,
  TabKey,
  JournalClientDraft,
  WorkingHoursMap,
} from '../types';

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
  const [journalDatePickerOpen, setJournalDatePickerOpen] = useState(false);
  const [journalMarkedDates, setJournalMarkedDates] = useState<string[]>([]);
  const [journalActionStaff, setJournalActionStaff] = useState<StaffItem | null>(null);
  const [journalDayStart, setJournalDayStart] = useState('10:00');
  const [journalDayEnd, setJournalDayEnd] = useState('18:00');
  const [servicesCategorySearch, setServicesCategorySearch] = useState('');
  const [servicesItemsSearch, setServicesItemsSearch] = useState('');
  const [localServiceCategories, setLocalServiceCategories] = useState<ServiceCategoryItem[]>([]);
  const [selectedServiceCategoryId, setSelectedServiceCategoryId] = useState<string | null>(null);
  const [selectedServiceCategoryName, setSelectedServiceCategoryName] = useState('');
  const [serviceCategoryEditorId, setServiceCategoryEditorId] = useState<string | null>(null);
  const [serviceCategoryEditorName, setServiceCategoryEditorName] = useState('');
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(EMPTY_SERVICE_DRAFT);
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
  const [settingsClientCancelMinNoticeMinutes, setSettingsClientCancelMinNoticeMinutes] = useState<number | null>(null);
  const [privacyPolicyText, setPrivacyPolicyText] = useState('');

  const routeSyncSourceRef = useRef<'idle' | 'state' | 'location'>('idle');
  const staffAvatarBlobUrlRef = useRef('');
  const ownerAvatarBlobUrlRef = useRef('');
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
    servicesCategorySearch,
    setServicesCategorySearch,
    servicesItemsSearch,
    setServicesItemsSearch,
    localServiceCategories,
    setLocalServiceCategories,
    selectedServiceCategoryId,
    setSelectedServiceCategoryId,
    selectedServiceCategoryName,
    setSelectedServiceCategoryName,
    serviceCategoryEditorId,
    setServiceCategoryEditorId,
    serviceCategoryEditorName,
    setServiceCategoryEditorName,
    serviceDraft,
    setServiceDraft,
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
    settingsClientCancelMinNoticeMinutes,
    setSettingsClientCancelMinNoticeMinutes,
    privacyPolicyText,
    setPrivacyPolicyText,
    routeSyncSourceRef,
    staffAvatarBlobUrlRef,
    ownerAvatarBlobUrlRef,
    serviceImageBlobUrlRef,
    loading,
    setLoading,
  };
}
