import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api';
import {
  DEFAULT_STAFF_ROLE,
  EMPTY_OWNER_DRAFT,
  EMPTY_SERVICE_DRAFT,
  EMPTY_STAFF_DRAFT,
  EMPTY_STAFF_FILTER,
  HOUR_HEIGHT,
  JOURNAL_CARD_COLUMN_WIDTH,
  JOURNAL_GRID_GAP,
  JOURNAL_END_HOUR,
  JOURNAL_START_HOUR,
  JOURNAL_TIME_COLUMN_WIDTH,
  MORE_MENU,
  SESSION_STORAGE_KEY,
  TAB_ITEMS,
} from './constants';
import {
  appointmentMatchesClient,
  formatTime,
  getWeekDates,
  normalizePhoneForLink,
  normalizePhoneForWhatsApp,
  roleLabel,
  setLoadingKey,
  toErrorMessage,
  toISODate,
  toISODay,
  toNumber,
  toRecord,
  toString,
} from './helpers';
import {
  extractItems,
  parseAppointment,
  parseWorkingHours,
} from './parsers';
import {
  convertImageFileToWebp,
  getServerMediaDirHint,
  uploadWebpImage,
} from './media';
import {
  PUBLIC_UNAUTHORIZED_ROUTES,
  normalizePathname,
  routeToState,
  stateToRoute,
} from './controller/routes';
import { deriveEditorTimes, isValidTime, parseSlot, toFlatWorkingHours } from './controller/schedule';
import { useDataLoaders } from './controller/useDataLoaders';
import { useAppState } from './controller/useAppState';
import type {
  AppController,
  AppointmentItem,
  ClientItem,
  JournalCard,
  ServiceCategoryItem,
  ServiceItem,
  StaffItem,
  StaffSession,
  TabKey,
} from './types';

const TAB_PERMISSION_CODE: Partial<Record<TabKey, string>> = {
  journal: 'VIEW_JOURNAL',
  schedule: 'VIEW_SCHEDULE',
  clients: 'VIEW_CLIENTS',
  analytics: 'VIEW_FINANCIAL_STATS',
  notifications: 'VIEW_JOURNAL',
};
const MORE_ACTION_PERMISSION_CODE: Record<string, string | null> = {
  Сотрудники: 'VIEW_STAFF',
  Услуги: 'VIEW_SERVICES',
  Аналитика: 'VIEW_FINANCIAL_STATS',
  'Онлайн-запись': 'MANAGE_CLIENT_FRONT',
  'Политика конфиденциальности': null,
  Настройки: null,
  Поддержка: null,
};

const EDIT_PERMISSION = {
  journal: 'EDIT_JOURNAL',
  schedule: 'EDIT_SCHEDULE',
  clients: 'EDIT_CLIENTS',
  services: 'EDIT_SERVICES',
  staff: 'EDIT_STAFF',
  selfProfile: 'EDIT_SELF_PROFILE',
} as const;

const PERMISSION_EQUIVALENTS: Record<string, string[]> = {
  VIEW_JOURNAL: ['VIEW_JOURNAL', 'EDIT_JOURNAL', 'ACCESS_JOURNAL'],
  EDIT_JOURNAL: ['EDIT_JOURNAL', 'ACCESS_JOURNAL'],
  VIEW_SCHEDULE: ['VIEW_SCHEDULE', 'EDIT_SCHEDULE', 'ACCESS_SCHEDULE'],
  EDIT_SCHEDULE: ['EDIT_SCHEDULE', 'ACCESS_SCHEDULE'],
  VIEW_CLIENTS: ['VIEW_CLIENTS', 'EDIT_CLIENTS', 'ACCESS_CLIENTS'],
  EDIT_CLIENTS: ['EDIT_CLIENTS', 'ACCESS_CLIENTS'],
  VIEW_FINANCIAL_STATS: ['VIEW_FINANCIAL_STATS', 'ACCESS_FINANCIAL_STATS', 'VIEW_REPORTS'],
  VIEW_SERVICES: ['VIEW_SERVICES', 'EDIT_SERVICES', 'ACCESS_SERVICES'],
  EDIT_SERVICES: ['EDIT_SERVICES', 'ACCESS_SERVICES'],
  VIEW_STAFF: ['VIEW_STAFF', 'EDIT_STAFF', 'ACCESS_STAFF'],
  EDIT_STAFF: ['EDIT_STAFF', 'ACCESS_STAFF'],
};

const resolvePermissionCandidates = (permissionCode: string) =>
  PERMISSION_EQUIVALENTS[permissionCode] ?? [permissionCode];

function resolveFallbackTabKeysByRole(role: StaffSession['staff']['role']): TabKey[] {
  if (role === 'MASTER') {
    return ['journal', 'more'];
  }
  return TAB_ITEMS.map((item) => item.key);
}

function resolveAllowedTabKeys(sessionData: StaffSession): TabKey[] {
  if (sessionData.staff.role === 'OWNER') {
    return TAB_ITEMS.map((item) => item.key);
  }
  const permissionCodes = Array.isArray(sessionData.staff.permissions)
    ? sessionData.staff.permissions
    : null;
  if (!permissionCodes) {
    return resolveFallbackTabKeysByRole(sessionData.staff.role);
  }
  return TAB_ITEMS.filter((item) => {
    if (item.key === 'more') {
      return true;
    }
    const requiredPermission = TAB_PERMISSION_CODE[item.key];
    if (!requiredPermission) {
      return true;
    }
    const candidates = resolvePermissionCandidates(requiredPermission);
    return candidates.some((code) => permissionCodes.includes(code));
  }).map((item) => item.key);
}

function resolveDefaultTab(sessionData: StaffSession): TabKey {
  return resolveAllowedTabKeys(sessionData)[0] ?? 'more';
}

export function useAppController(): AppController {
  const navigate = useNavigate();
  const location = useLocation();
  const {
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
  } = useAppState();
  const pageRef = useRef(page);
  const tabRef = useRef(tab);
  const initialDataLoadedRef = useRef(false);

  useEffect(() => {
    pageRef.current = page;
    tabRef.current = tab;
  }, [page, tab]);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const isAuthorized = Boolean(session);
  const sessionPermissionCodes = useMemo(
    () => {
      const permissions = session?.staff.permissions;
      return Array.isArray(permissions) ? permissions : [];
    },
    [session],
  );
  const hasPermissionsPayload = Array.isArray(session?.staff.permissions);
  const hasPermissionAccess = useCallback(
    (permissionCode: string | null | undefined) => {
      if (!session) {
        return false;
      }
      if (session.staff.role === 'OWNER' || !permissionCode) {
        return true;
      }
      if (!hasPermissionsPayload) {
        return true;
      }
      const candidates = resolvePermissionCandidates(permissionCode);
      return candidates.some((code) => sessionPermissionCodes.includes(code));
    },
    [hasPermissionsPayload, session, sessionPermissionCodes],
  );
  const canViewJournal = hasPermissionAccess('VIEW_JOURNAL');
  const canViewSchedule = hasPermissionAccess('VIEW_SCHEDULE');
  const canViewClients = hasPermissionAccess('VIEW_CLIENTS');
  const canViewServices = hasPermissionAccess('VIEW_SERVICES');
  const canViewStaff = hasPermissionAccess('VIEW_STAFF');
  const canViewReports = hasPermissionAccess('VIEW_FINANCIAL_STATS');
  const canUseStaffDirectory = canViewStaff || canViewJournal || canViewSchedule;
  const canEditPrivacyPolicy = hasPermissionAccess('MANAGE_CLIENT_FRONT');
  const canEdit = useCallback(
    (permissionCode: string) => hasPermissionAccess(permissionCode),
    [hasPermissionAccess],
  );
  const canEditOwnProfile = useMemo(() => {
    if (!session) {
      return false;
    }
    if (session.staff.role === 'OWNER') {
      return true;
    }
    if (session.staff.role !== 'ADMIN') {
      return false;
    }
    const codes = new Set(sessionPermissionCodes);
    return (
      codes.has(EDIT_PERMISSION.selfProfile) ||
      codes.has(EDIT_PERMISSION.staff) ||
      codes.has('ACCESS_STAFF')
    );
  }, [session, sessionPermissionCodes]);
  const visibleTabKeys = useMemo(
    () => (session ? resolveAllowedTabKeys(session) : []),
    [session],
  );
  const visibleTabs = useMemo(() => {
    const allowedKeys = new Set(visibleTabKeys);
    return TAB_ITEMS.filter((item) => allowedKeys.has(item.key));
  }, [visibleTabKeys]);
  const firstAllowedTab = visibleTabs[0]?.key ?? 'more';
  const moreMenu = useMemo(
    () =>
      MORE_MENU.filter((item) => hasPermissionAccess(MORE_ACTION_PERMISSION_CODE[item.title])),
    [hasPermissionAccess],
  );

  const staffWithServices = useMemo(() => {
    const hasServiceMeta = Object.keys(staffServiceCounts).length > 0;
    return staff.filter((item) => {
      if (!item.isActive || item.role === 'OWNER') {
        return false;
      }
      if (!hasServiceMeta) {
        return true;
      }
      return (staffServiceCounts[item.id] ?? 0) > 0;
    });
  }, [staff, staffServiceCounts]);
  const visibleStaff = useMemo(() => {
    const activeMasters = staffWithServices.filter((item) => item.role === 'MASTER');
    if (activeMasters.length > 0) {
      return activeMasters;
    }
    return staffWithServices;
  }, [staffWithServices]);
  const journalStaff = useMemo(() => {
    if (appointments.length === 0) {
      return visibleStaff;
    }
    const merged = [...visibleStaff];
    const seenIds = new Set(visibleStaff.map((item) => item.id));
    const seenNames = new Set(
      visibleStaff.map((item) => item.name.trim().toLowerCase()).filter(Boolean),
    );

    appointments.forEach((item) => {
      const staffName = item.staffName.trim() || 'Специалист';
      const normalizedName = staffName.toLowerCase();
      const rawStaffId = item.staffId.trim();
      const staffId = rawStaffId || `appointment-staff:${normalizedName}`;
      if (seenIds.has(staffId) || seenNames.has(normalizedName)) {
        return;
      }
      merged.push({
        id: staffId,
        name: staffName,
        role: 'MASTER',
        phoneE164: '',
        email: null,
        avatarUrl: null,
        avatarAssetId: null,
        isActive: true,
        positionName: null,
      });
      seenIds.add(staffId);
      seenNames.add(normalizedName);
    });

    return merged;
  }, [appointments, visibleStaff]);
  const journalVisibleStaffIdsKey = useMemo(
    () => journalStaff.map((item) => item.id).join('|'),
    [journalStaff],
  );
  const journalBounds = useMemo(() => {
    if (appointments.length === 0) {
      return { startHour: JOURNAL_START_HOUR, endHour: JOURNAL_END_HOUR };
    }
    const minStart = Math.min(
      ...appointments.map((item) => item.startAt.getHours() + item.startAt.getMinutes() / 60),
    );
    const maxEnd = Math.max(
      ...appointments.map((item) => item.endAt.getHours() + item.endAt.getMinutes() / 60),
    );
    const startHour = Math.max(6, Math.min(JOURNAL_START_HOUR, Math.floor(minStart)));
    const endHour = Math.min(23, Math.max(JOURNAL_END_HOUR, Math.ceil(maxEnd)));
    return { startHour, endHour };
  }, [appointments]);
  const journalHours = useMemo(() => {
    const hours: string[] = [];
    for (let hour = journalBounds.startHour; hour <= journalBounds.endHour; hour += 1) {
      hours.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return hours;
  }, [journalBounds.endHour, journalBounds.startHour]);

  const notifications = useMemo(() => {
    return [...appointments]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map((item) => {
        const cancelled = item.status === 'CANCELLED' || item.status === 'NO_SHOW';
        return {
          id: item.id,
          label: cancelled ? 'Запись отменена' : 'Новая онлайн-запись',
          mode: cancelled ? 'delete' : 'new',
          time: formatTime(item.createdAt),
        } as const;
      });
  }, [appointments]);

  const filteredStaff = useMemo(() => {
    const withoutOwner = staff.filter((item) => item.role !== 'OWNER' && item.isActive);
    const filteredByFlags = withoutOwner.filter((item) => {
      if (staffFilter.withServices && (staffServiceCounts[item.id] ?? 0) <= 0) {
        return false;
      }
      return true;
    });
    const query = staffSearch.trim().toLowerCase();
    if (!query) {
      return filteredByFlags;
    }
    return filteredByFlags.filter((item) => {
      const haystack = `${item.name} ${item.phoneE164} ${item.role} ${
        item.positionName || ''
      } ${roleLabel(item.role)}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [staff, staffFilter.withServices, staffSearch, staffServiceCounts]);

  const serviceCategories = useMemo<ServiceCategoryItem[]>(() => {
    const map = new Map<string, ServiceCategoryItem>();
    localServiceCategories.forEach((item) => {
      map.set(item.id, { ...item, count: 0 });
    });
    services.forEach((item) => {
      const id = item.categoryId || 'uncategorized';
      const name = item.categoryName || 'Без категории';
      const current = map.get(id);
      if (!current) {
        map.set(id, { id, name, count: 1 });
        return;
      }
      current.count += 1;
      current.name = name;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [localServiceCategories, services]);

  const filteredServiceCategories = useMemo(() => {
    const query = servicesCategorySearch.trim().toLowerCase();
    if (!query) {
      return serviceCategories;
    }
    return serviceCategories.filter((item) => item.name.toLowerCase().includes(query));
  }, [serviceCategories, servicesCategorySearch]);

  const selectedCategoryServices = useMemo(() => {
    if (!selectedServiceCategoryId) {
      return [] as ServiceItem[];
    }
    return services
      .filter((item) => item.categoryId === selectedServiceCategoryId)
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [selectedServiceCategoryId, services]);

  const filteredSelectedCategoryServices = useMemo(() => {
    const query = servicesItemsSearch.trim().toLowerCase();
    if (!query) {
      return selectedCategoryServices;
    }
    return selectedCategoryServices.filter((item) => {
      const haystack = `${item.name} ${item.nameOnline || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [selectedCategoryServices, servicesItemsSearch]);

  const filteredStaffServicesForEditor = useMemo(() => {
    const query = staffServicesEditorQuery.trim().toLowerCase();
    const sorted = [...services].sort((a, b) => {
      const byCategory = a.categoryName.localeCompare(b.categoryName, 'ru');
      if (byCategory !== 0) {
        return byCategory;
      }
      return a.name.localeCompare(b.name, 'ru');
    });
    if (!query) {
      return sorted;
    }
    return sorted.filter((item) =>
      `${item.name} ${item.categoryName} ${item.nameOnline || ''}`.toLowerCase().includes(query),
    );
  }, [services, staffServicesEditorQuery]);

  const staffAvatarServerDirHint = useMemo(() => {
    return getServerMediaDirHint('staff-avatar', editingStaffId || 'new-staff');
  }, [editingStaffId]);

  const serviceImageServerDirHint = useMemo(() => {
    return getServerMediaDirHint('service-image', serviceDraft.id || 'new-service');
  }, [serviceDraft.id]);

  const clearBlobPreview = useCallback((ref: { current: string }) => {
    if (ref.current.startsWith('blob:')) {
      URL.revokeObjectURL(ref.current);
    }
    ref.current = '';
  }, []);

  const resetStaffAvatarState = useCallback(() => {
    clearBlobPreview(staffAvatarBlobUrlRef);
    setStaffAvatarWebpBlob(null);
    setStaffAvatarOriginalName('avatar');
    setStaffAvatarPreviewUrl('');
    setStaffAvatarAssetId(null);
  }, [
    clearBlobPreview,
    setStaffAvatarAssetId,
    setStaffAvatarOriginalName,
    setStaffAvatarPreviewUrl,
    setStaffAvatarWebpBlob,
    staffAvatarBlobUrlRef,
  ]);

  const resetOwnerAvatarState = useCallback(() => {
    clearBlobPreview(ownerAvatarBlobUrlRef);
    setOwnerAvatarWebpBlob(null);
    setOwnerAvatarOriginalName('avatar');
    setOwnerAvatarPreviewUrl('');
    setOwnerAvatarAssetId(null);
  }, [
    clearBlobPreview,
    ownerAvatarBlobUrlRef,
    setOwnerAvatarAssetId,
    setOwnerAvatarOriginalName,
    setOwnerAvatarPreviewUrl,
    setOwnerAvatarWebpBlob,
  ]);

  const resetServiceImageState = useCallback(() => {
    clearBlobPreview(serviceImageBlobUrlRef);
    setServiceImageWebpBlob(null);
    setServiceImageOriginalName('service');
    setServiceImagePreviewUrl('');
  }, [
    clearBlobPreview,
    serviceImageBlobUrlRef,
    setServiceImageOriginalName,
    setServiceImagePreviewUrl,
    setServiceImageWebpBlob,
  ]);

  useEffect(() => {
    if (!selectedServiceCategoryId) {
      return;
    }
    const found = serviceCategories.find((item) => item.id === selectedServiceCategoryId);
    if (!found) {
      setSelectedServiceCategoryId(null);
      setSelectedServiceCategoryName('');
      return;
    }
    if (found.name !== selectedServiceCategoryName) {
      setSelectedServiceCategoryName(found.name);
    }
  }, [
    selectedServiceCategoryId,
    selectedServiceCategoryName,
    serviceCategories,
    setSelectedServiceCategoryId,
    setSelectedServiceCategoryName,
  ]);

  useEffect(() => {
    return () => {
      if (staffAvatarBlobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(staffAvatarBlobUrlRef.current);
      }
      if (ownerAvatarBlobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(ownerAvatarBlobUrlRef.current);
      }
      if (serviceImageBlobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(serviceImageBlobUrlRef.current);
      }
    };
  }, [ownerAvatarBlobUrlRef, serviceImageBlobUrlRef, staffAvatarBlobUrlRef]);

  const {
    loadStaff,
    loadServices,
    loadStaffServiceMeta,
    loadStaffServicesForEditor,
    loadClients,
    loadAppointments,
    loadJournalListAppointments,
    loadJournalMarkedDates,
    loadSettings,
    loadWorkingHours,
    refreshStaffAndMeta,
    refreshAll,
  } = useDataLoaders({
    isAuthorized,
    sessionRole: session?.staff.role ?? null,
    sessionStaffId: session?.staff.id ?? null,
    sessionStaffName: session?.staff.name ?? null,
    canViewStaff,
    canViewServices,
    canViewClients,
    canViewJournal,
    canViewSchedule,
    canViewReports,
    journalVisibleStaffIdsKey,
    selectedDate,
    debouncedClientsQuery,
    setLoading,
    setAppError,
    setStaff,
    setServices,
    setStaffServiceCounts,
    setEditorServiceCount,
    setEditorServiceNames,
    setToast,
    setClients,
    setAppointments,
    setJournalListAppointments,
    setJournalMarkedDates,
    setWorkingHoursByStaff,
    setSettingsClientCancelMinNoticeMinutes,
    setPrivacyPolicyText,
  });

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedClientsQuery(clientsQuery), 350);
    return () => clearTimeout(timeout);
  }, [clientsQuery, setDebouncedClientsQuery]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timeout);
  }, [toast, setToast]);

  useEffect(() => {
    const restore = async () => {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        setLoadingKey(setLoading, 'boot', false);
        return;
      }

      let parsed: StaffSession | null = null;
      try {
        parsed = JSON.parse(raw) as StaffSession;
        api.setSession(parsed);
        const refreshed = await api.refresh();
        setSession(refreshed);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          api.clearSession();
          localStorage.removeItem(SESSION_STORAGE_KEY);
          return;
        }
        if (parsed) {
          setSession(parsed);
          return;
        }
        api.clearSession();
      } finally {
        setLoadingKey(setLoading, 'boot', false);
      }
    };

    void restore();
  }, [setLoading, setSession]);

  useEffect(() => {
    api.setSession(session);
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  useEffect(() => {
    if (loading.boot) {
      return;
    }

    const pathname = normalizePathname(location.pathname);
    if (!session) {
      if (!PUBLIC_UNAUTHORIZED_ROUTES.has(pathname)) {
        routeSyncSourceRef.current = 'state';
        navigate('/login', { replace: true });
      }
      return;
    }

    if (routeSyncSourceRef.current === 'state') {
      routeSyncSourceRef.current = 'idle';
      return;
    }

    if (PUBLIC_UNAUTHORIZED_ROUTES.has(pathname)) {
      routeSyncSourceRef.current = 'state';
      navigate(stateToRoute(pageRef.current, tabRef.current), { replace: true });
      return;
    }

    const routeState = routeToState(pathname);
    if (!routeState) {
      routeSyncSourceRef.current = 'state';
      navigate(stateToRoute(pageRef.current, tabRef.current), { replace: true });
      return;
    }

    if (routeState.page === 'tabs' && !visibleTabKeys.includes(routeState.tab)) {
      routeSyncSourceRef.current = 'state';
      setPage('tabs');
      setTab(firstAllowedTab);
      return;
    }

    if (routeState.page !== pageRef.current || routeState.tab !== tabRef.current) {
      routeSyncSourceRef.current = 'location';
      setPage(routeState.page);
      setTab(routeState.tab);
    }
  }, [
    loading.boot,
    location.pathname,
    navigate,
    routeSyncSourceRef,
    session,
    setPage,
    setTab,
    firstAllowedTab,
    visibleTabKeys,
  ]);

  useEffect(() => {
    if (loading.boot) {
      return;
    }
    if (!session) {
      return;
    }

    const pathname = normalizePathname(location.pathname);
    const targetPath = stateToRoute(page, tab);

    if (pathname === targetPath) {
      if (routeSyncSourceRef.current === 'location') {
        routeSyncSourceRef.current = 'idle';
      }
      return;
    }

    if (routeSyncSourceRef.current === 'location') {
      routeSyncSourceRef.current = 'idle';
      return;
    }

    routeSyncSourceRef.current = 'state';
    navigate(targetPath);
  }, [loading.boot, location.pathname, navigate, page, routeSyncSourceRef, session, tab]);

  useEffect(() => {
    if (!session || page !== 'tabs') {
      return;
    }
    if (visibleTabKeys.includes(tab)) {
      return;
    }
    setTab(firstAllowedTab);
  }, [firstAllowedTab, page, session, setTab, tab, visibleTabKeys]);

  useEffect(() => {
    if (page === 'staffEditor' && !staffFormMode) {
      setPage('staff');
    }
  }, [page, setPage, staffFormMode]);

  useEffect(() => {
    if (page === 'scheduleEditor' && !scheduleEditorStaff) {
      setPage('tabs');
      setTab('schedule');
    }
  }, [page, scheduleEditorStaff, setPage, setTab]);

  useEffect(() => {
    if (page === 'journalAppointment' && !journalAppointmentTarget) {
      setPage('tabs');
      setTab('journal');
    }
  }, [journalAppointmentTarget, page, setPage, setTab]);

  useEffect(() => {
    if (page === 'journalClient' && !journalClientTarget) {
      if (journalAppointmentTarget) {
        setPage('journalAppointment');
        setTab('journal');
        return;
      }
      setPage('tabs');
      setTab('journal');
    }
  }, [journalAppointmentTarget, journalClientTarget, page, setPage, setTab]);

  useEffect(() => {
    if (!isAuthorized) {
      initialDataLoadedRef.current = false;
      return;
    }
    if (initialDataLoadedRef.current) {
      return;
    }
    initialDataLoadedRef.current = true;

    void (async () => {
      const rows = canUseStaffDirectory ? await loadStaff() : [];
      await Promise.all([
        canViewServices ? loadServices() : Promise.resolve([]),
        loadSettings(),
        canViewJournal ? loadJournalListAppointments() : Promise.resolve(),
      ]);
      if (!canUseStaffDirectory) {
        setStaff([]);
        return;
      }
      if (rows.length === 0) {
        setStaff([]);
      }
    })();
  }, [
    canUseStaffDirectory,
    canViewJournal,
    canViewServices,
    isAuthorized,
    loadJournalListAppointments,
    loadServices,
    loadSettings,
    loadStaff,
    setStaff,
  ]);

  useEffect(() => {
    if (!isAuthorized || !canViewStaff || page !== 'staff' || staff.length === 0) {
      return;
    }
    void loadStaffServiceMeta(staff);
  }, [canViewStaff, isAuthorized, loadStaffServiceMeta, page, staff]);

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }
    void loadClients(debouncedClientsQuery);
  }, [debouncedClientsQuery, isAuthorized, loadClients]);

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }
    void loadAppointments(selectedDate);
  }, [isAuthorized, loadAppointments, selectedDate]);

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }
    void loadJournalMarkedDates(selectedDate);
  }, [isAuthorized, loadJournalMarkedDates, selectedDate]);

  useEffect(() => {
    if (!isAuthorized || page !== 'tabs' || tab !== 'schedule' || staff.length === 0) {
      return;
    }
    void loadWorkingHours(staff);
  }, [isAuthorized, loadWorkingHours, page, staff, tab]);

  const closeStaffForm = useCallback(() => {
    setStaffFormMode(null);
    setEditingStaffId(null);
    setStaffDraft(EMPTY_STAFF_DRAFT);
    setEditorAccessEnabled(true);
    setOriginalEditRole(DEFAULT_STAFF_ROLE);
    setEditorServiceCount(0);
    setEditorServiceNames([]);
    setStaffServicesEditorQuery('');
    setStaffServicesEditorSelectedIds([]);
    setEditorPermissionsSheetOpen(false);
    setEditorPermissionCatalog([]);
    setEditorPermissionCodes([]);
    setEditorPermissionBusyCode(null);
    resetStaffAvatarState();
  }, [
    setEditorPermissionBusyCode,
    setEditorPermissionCatalog,
    setEditorPermissionCodes,
    setEditorPermissionsSheetOpen,
    resetStaffAvatarState,
    setEditingStaffId,
    setEditorAccessEnabled,
    setEditorServiceCount,
    setEditorServiceNames,
    setOriginalEditRole,
    setStaffDraft,
    setStaffFormMode,
    setStaffServicesEditorQuery,
    setStaffServicesEditorSelectedIds,
  ]);

  const handleLogin = async () => {
    setAuthError('');
    setLoadingKey(setLoading, 'auth', true);
    try {
      const data = await api.login(authPhone.trim(), authPin.trim());
      setSession(data);
      setPage('tabs');
      setTab(resolveDefaultTab(data));
    } catch (error) {
      setAuthError(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'auth', false);
    }
  };

  const handleSetPin = async (token: string, pin: string) => {
    setAuthError('');
    setLoadingKey(setLoading, 'auth', true);
    try {
      const data = await api.setStaffPin(token.trim(), pin.trim());
      setSession(data);
      setPage('tabs');
      setTab(resolveDefaultTab(data));
    } catch (error) {
      setAuthError(toErrorMessage(error));
      throw error;
    } finally {
      setLoadingKey(setLoading, 'auth', false);
    }
  };

  const handleRequestPinReset = async (email: string) => {
    setAuthError('');
    setLoadingKey(setLoading, 'auth', true);
    try {
      return await api.requestStaffPinReset(email.trim().toLowerCase());
    } catch (error) {
      setAuthError(toErrorMessage(error));
      throw error;
    } finally {
      setLoadingKey(setLoading, 'auth', false);
    }
  };

  const handleConfirmPinReset = async (token: string, newPin: string) => {
    setAuthError('');
    setLoadingKey(setLoading, 'auth', true);
    try {
      const data = await api.confirmStaffPinReset(token.trim(), newPin.trim());
      setSession(data);
      setPage('tabs');
      setTab(resolveDefaultTab(data));
    } catch (error) {
      setAuthError(toErrorMessage(error));
      throw error;
    } finally {
      setLoadingKey(setLoading, 'auth', false);
    }
  };

  const handleLogout = async () => {
    setLoadingKey(setLoading, 'action', true);
    try {
      await api.logout();
    } finally {
      setLoadingKey(setLoading, 'action', false);
      setSession(null);
      setAuthPin('');
      setStaff([]);
      setClients([]);
      setClientActionsFor(null);
      setClientHistoryTarget(null);
      setClientHistoryAppointments([]);
      setJournalAppointmentTarget(null);
      setJournalClientTarget(null);
      setJournalClientDraft({
        name: '',
        phone: '',
        email: '',
        comment: '',
      });
      setJournalClientHistory([]);
      setJournalClientLoading(false);
      setJournalClientSaving(false);
      setServices([]);
      setAppointments([]);
      setWorkingHoursByStaff({});
      setPanel(null);
      setPage('tabs');
      setTab('journal');
      closeStaffForm();
      setStaffServiceCounts({});
      setStaffFilter(EMPTY_STAFF_FILTER);
      setOwnerEditId(null);
      setOwnerDraft(EMPTY_OWNER_DRAFT);
      setScheduleEditorStaff(null);
      setScheduleEditorDays([]);
      setScheduleEditorStart('10:00');
      setScheduleEditorEnd('18:00');
      setJournalDatePickerOpen(false);
      setJournalMarkedDates([]);
      setStaffServicesEditorQuery('');
      setStaffServicesEditorSelectedIds([]);
      setJournalActionStaff(null);
      setJournalDayStart('10:00');
      setJournalDayEnd('18:00');
      setServicesCategorySearch('');
      setServicesItemsSearch('');
      setLocalServiceCategories([]);
      setSelectedServiceCategoryId(null);
      setSelectedServiceCategoryName('');
      setServiceCategoryEditorId(null);
      setServiceCategoryEditorName('');
      setServiceDraft(EMPTY_SERVICE_DRAFT);
      setServiceProviders([]);
      setServiceAssignableStaff([]);
      setServiceProvidersLoading(false);
      resetStaffAvatarState();
      resetServiceImageState();
      setToast('Сессия завершена');
    }
  };

  const openStaffCreate = () => {
    if (!canEdit(EDIT_PERMISSION.staff)) {
      setToast('Нет прав на редактирование сотрудников');
      return;
    }
    setEditingStaffId(null);
    setStaffDraft(EMPTY_STAFF_DRAFT);
    setEditorAccessEnabled(true);
    setOriginalEditRole(DEFAULT_STAFF_ROLE);
    setEditorServiceCount(0);
    setEditorServiceNames([]);
    setEditorPermissionCatalog([]);
    setEditorPermissionCodes([]);
    setEditorPermissionBusyCode(null);
    setEditorPermissionsSheetOpen(false);
    resetStaffAvatarState();
    setStaffFormMode('create');
    setPage('staffEditor');
  };

  const openStaffEdit = async (item: StaffItem) => {
    setEditingStaffId(item.id);
    setStaffDraft({
      name: item.name,
      phone: item.phoneE164 || '',
      email: item.email || '',
      positionName: item.positionName || '',
      role:
        item.role === 'ADMIN' || item.role === 'MASTER' || item.role === 'DEVELOPER' || item.role === 'SMM'
          ? item.role
          : 'MASTER',
    });
    setOriginalEditRole(
      item.role === 'ADMIN' || item.role === 'MASTER' || item.role === 'DEVELOPER' || item.role === 'SMM'
        ? item.role
        : 'MASTER',
    );
    setEditorAccessEnabled(item.isActive);
    setEditorPermissionCatalog([]);
    setEditorPermissionCodes([]);
    setEditorPermissionBusyCode(null);
    setEditorPermissionsSheetOpen(false);
    resetStaffAvatarState();
    setStaffAvatarPreviewUrl(item.avatarUrl || '');
    setStaffAvatarAssetId(item.avatarAssetId ?? null);
    setStaffFormMode('edit');
    setPage('staffEditor');
    void (async () => {
      try {
        const [catalog, assignedCodes] = await Promise.all([
          api.getStaffPermissionsCatalog(),
          api.getStaffPermissions(item.id),
        ]);
        setEditorPermissionCatalog(catalog);
        setEditorPermissionCodes(assignedCodes);
      } catch {
        setEditorPermissionCatalog([]);
        setEditorPermissionCodes([]);
      }
    })();
    await loadStaffServicesForEditor(item.id);
  };

  const backFromStaffEditor = () => {
    closeStaffForm();
    setPage('staff');
  };

  const closeStaffServicesEditor = () => {
    setPage('staffEditor');
  };

  const backFromStaffList = () => {
    closeStaffForm();
    setPage('tabs');
    setTab('more');
  };

  const closeOwnerPage = () => {
    resetOwnerAvatarState();
    setPage('tabs');
    setTab('more');
  };

  const closePrivacyPolicyPage = () => {
    setPage('tabs');
    setTab('more');
  };

  const handleOpenOwnerEditor = useCallback(async () => {
    if (!session) {
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      let rows = staff;
      if (rows.length === 0 && canViewStaff) {
        rows = await loadStaff();
      }
      const target =
        rows.find((item) => item.id === session.staff.id) ?? {
          id: session.staff.id,
          name: session.staff.name,
          role: session.staff.role,
          phoneE164: session.staff.phoneE164,
          email: session.staff.email,
          avatarUrl: null,
          avatarAssetId: null,
          isActive: true,
          positionName: null,
        };

      setOwnerEditId(session.staff.id);
      setOwnerDraft({
        name: target.name,
        phone: target.phoneE164 || '',
        email: target.email || '',
        positionName: target.positionName || '',
      });
      resetOwnerAvatarState();
      setOwnerAvatarPreviewUrl(target.avatarUrl || '');
      setOwnerAvatarAssetId(target.avatarAssetId ?? null);
      setPage('owner');
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  }, [
    canViewStaff,
    loadStaff,
    resetOwnerAvatarState,
    session,
    setLoading,
    setOwnerAvatarAssetId,
    setOwnerAvatarPreviewUrl,
    setOwnerDraft,
    setOwnerEditId,
    setPage,
    setToast,
    staff,
  ]);

  const handleSaveOwner = async () => {
    if (!session) {
      return;
    }
    if (!ownerEditId) {
      setToast('ID сотрудника не найден');
      return;
    }
    if (ownerEditId !== session.staff.id) {
      setToast('Можно редактировать только свой профиль');
      return;
    }
    if (!canEditOwnProfile) {
      setToast('Недостаточно прав для редактирования профиля');
      return;
    }
    const name = ownerDraft.name.trim();
    const phone = ownerDraft.phone.trim();
    if (!name || !phone) {
      setToast('Имя и телефон обязательны');
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      let nextToast = 'Профиль обновлен';
      await api.patch<unknown>(`/staff/${ownerEditId}/contact`, {
        name,
        phone,
        email: ownerDraft.email.trim() ? ownerDraft.email.trim() : null,
        positionName: ownerDraft.positionName.trim() || undefined,
      });

      if (ownerAvatarWebpBlob) {
        const uploadResult = await uploadOwnerAvatarIfNeeded(ownerEditId);
        if (uploadResult.warning) {
          nextToast = uploadResult.warning;
        }
      }

      await loadStaff();
      setSession((prev) => {
        if (!prev || prev.staff.id !== ownerEditId) {
          return prev;
        }
        return {
          ...prev,
          staff: {
            ...prev.staff,
            name,
            phoneE164: phone,
            email: ownerDraft.email.trim() ? ownerDraft.email.trim() : null,
          },
        };
      });
      setStaff((prev) =>
        prev.map((item) =>
          item.id === ownerEditId
            ? {
                ...item,
                name,
                phoneE164: phone,
                email: ownerDraft.email.trim() ? ownerDraft.email.trim() : null,
                positionName: ownerDraft.positionName.trim() || null,
              }
            : item,
        ),
      );
      setToast(nextToast);
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleCreateStaff = async () => {
    if (!canEdit(EDIT_PERMISSION.staff)) {
      setToast('Нет прав на редактирование сотрудников');
      return;
    }
    const name = staffDraft.name.trim();
    const phone = staffDraft.phone.trim();
    const email = staffDraft.email.trim().toLowerCase();
    if (!name || !phone) {
      setToast('Имя и телефон обязательны');
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      let existingRows = staff;
      if (existingRows.length === 0) {
        existingRows = await loadStaff();
      }
      if (
        email &&
        existingRows.some((item) => item.email?.trim().toLowerCase() === email)
      ) {
        setToast('Email уже используется другим сотрудником');
        return;
      }

      let nextToast = 'Сотрудник создан';
      const invite = await api.post<unknown>('/staff/invite', {
        phone,
        name,
        role: staffDraft.role,
        email: email || undefined,
        positionName: staffDraft.positionName.trim() || undefined,
      });
      const inviteRecord = toRecord(invite);
      const emailSent = Boolean(inviteRecord?.emailSent);
      const deliveryMode = toString(inviteRecord?.emailDeliveryMode);
      if (email) {
        if (emailSent) {
          nextToast =
            deliveryMode === 'SMTP'
              ? 'Сотрудник добавлен, приглашение отправлено'
              : 'Сотрудник добавлен, приглашение отправлено (DEV_LOG)';
        } else {
          nextToast = 'Сотрудник добавлен, но приглашение не отправлено';
        }
      } else {
        nextToast = 'Сотрудник добавлен без email (приглашение не отправлено)';
      }
      const rows = await loadStaff();
      await loadStaffServiceMeta(rows);
      if (staffAvatarWebpBlob) {
        const created = rows.find((item) => {
          const samePhone =
            normalizePhoneForWhatsApp(item.phoneE164) ===
            normalizePhoneForWhatsApp(phone);
          const sameName = item.name.trim().toLowerCase() === name.trim().toLowerCase();
          return samePhone || sameName;
        });
        if (created) {
          const uploadResult = await uploadStaffAvatarIfNeeded(created.id);
          if (uploadResult.warning) {
            nextToast = uploadResult.warning;
          }
        } else {
          nextToast = 'Сотрудник создан, но не удалось определить ID для загрузки фото';
        }
      }
      closeStaffForm();
      setPage('staff');
      setToast(nextToast);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.message.toLowerCase().includes('email already in use')
      ) {
        setToast('Email уже используется другим сотрудником');
        return;
      }
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleUpdateStaff = async () => {
    if (!canEdit(EDIT_PERMISSION.staff)) {
      setToast('Нет прав на редактирование сотрудников');
      return;
    }
    const id = editingStaffId;
    if (!id) {
      return;
    }
    const name = staffDraft.name.trim();
    const phone = staffDraft.phone.trim();
    if (!name || !phone) {
      setToast('Имя и телефон обязательны');
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      let nextToast = 'Сотрудник обновлен';
      await api.patch<unknown>(`/staff/${id}/contact`, {
        name,
        phone,
        email: staffDraft.email.trim() ? staffDraft.email.trim() : null,
        positionName: staffDraft.positionName.trim() || undefined,
      });
      if (staffDraft.role !== originalEditRole) {
        await api.patch<unknown>(`/staff/${id}/role`, { role: staffDraft.role });
      }

      if (!editorAccessEnabled) {
        await api.post<unknown>(`/staff/${id}/fire`, {
          firedAt: toISODate(new Date()),
        });
      }

      const rows = await loadStaff();
      await loadStaffServiceMeta(rows);
      if (staffAvatarWebpBlob) {
        const uploadResult = await uploadStaffAvatarIfNeeded(id);
        if (uploadResult.warning) {
          nextToast = uploadResult.warning;
        }
      }
      closeStaffForm();
      setPage('staff');
      setToast(nextToast);
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleFireStaff = async () => {
    if (!canEdit(EDIT_PERMISSION.staff)) {
      setToast('Нет прав на редактирование сотрудников');
      return;
    }
    if (!editingStaffId) {
      return;
    }
    const firedStaffId = editingStaffId;
    const confirmed = window.confirm('Уволить сотрудника?');
    if (!confirmed) {
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      await api.post<unknown>(`/staff/${firedStaffId}/fire`, {
        firedAt: toISODate(new Date()),
      });
      setStaff((prev) =>
        prev.map((item) =>
          item.id === firedStaffId ? { ...item, isActive: false } : item,
        ),
      );
      setStaffFilter((prev) => ({ ...prev, withAccess: true }));
      const rows = await loadStaff();
      await loadStaffServiceMeta(rows);
      closeStaffForm();
      setPage('staff');
      setToast('Сотрудник уволен');
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleClientDetails = async (client: ClientItem) => {
    setLoadingKey(setLoading, 'action', true);
    try {
      const data = await api.get<unknown>(`/clients/${client.id}`);
      const record = toRecord(data);
      const discount = toRecord(record?.discount);
      setPanel({
        title: `Клиент: ${client.name}`,
        lines: [
          `Телефон: ${client.phone || '—'}`,
          `ID: ${client.id}`,
          `Скидка: ${discount ? JSON.stringify(discount) : 'нет'}`,
        ],
      });
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleOpenClientActions = (client: ClientItem) => {
    setClientActionsFor(client);
  };

  const handleCloseClientActions = () => {
    setClientActionsFor(null);
  };

  const handleOpenClientLoyalty = async () => {
    if (!clientActionsFor) {
      return;
    }
    await handleClientDetails(clientActionsFor);
    setClientActionsFor(null);
  };

  const fetchClientHistoryFromAppointments = async (client: ClientItem) => {
    const sortHistory = (items: AppointmentItem[]) =>
      [...items].sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
    const matchHistory = (items: AppointmentItem[]) =>
      items.filter((item) => appointmentMatchesClient(item, client));

    const localHistory = sortHistory(matchHistory(journalListAppointments));
    if (localHistory.length > 0) {
      return localHistory;
    }

    const now = new Date();
    const from = new Date(now);
    from.setFullYear(now.getFullYear() - 2);
    const historyEndpoint =
      session?.staff.role === 'MASTER' ? '/master/appointments' : '/appointments';
    const merged: AppointmentItem[] = [];
    const limit = 200;
    let page = 1;

    while (page <= 20) {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        from: toISODate(from),
        to: toISODate(now),
      });
      const data = await api.get<unknown>(`${historyEndpoint}?${params.toString()}`);
      const parsed = extractItems(data).map(parseAppointment).filter(Boolean) as AppointmentItem[];
      merged.push(...parsed);

      const root = toRecord(data);
      const meta = toRecord(root?.meta);
      const totalPages =
        toNumber(meta?.totalPages) ?? toNumber(meta?.pages) ?? toNumber(meta?.pageCount);

      if (totalPages && page >= totalPages) {
        break;
      }
      if (parsed.length < limit) {
        break;
      }
      page += 1;
    }

    return sortHistory(matchHistory(merged));
  };

  const handleOpenClientHistory = async () => {
    const client = clientActionsFor;
    if (!client) {
      return;
    }
    setClientHistoryTarget(client);
    setClientHistoryLoading(true);
    setClientActionsFor(null);
    try {
      const filtered = await fetchClientHistoryFromAppointments(client);
      setClientHistoryAppointments(filtered);
      setPage('clientHistory');
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setClientHistoryLoading(false);
    }
  };

  const handleCloseClientHistory = () => {
    setPage('tabs');
    setTab('clients');
  };

  const handleOpenJournalAppointment = (appointment: AppointmentItem) => {
    const fallbackClient: ClientItem = {
      id: appointment.clientId,
      name: appointment.clientName || 'Клиент',
      phone: appointment.clientPhone || '',
    };
    setJournalAppointmentTarget(appointment);
    setJournalClientTarget(null);
    setJournalClientDraft({
      name: '',
      phone: '',
      email: '',
      comment: '',
    });
    setJournalClientHistory([]);
    setJournalClientLoading(true);
    setPage('journalAppointment');
    setTab('journal');
    void (async () => {
      try {
        const history = await fetchClientHistoryFromAppointments(fallbackClient);
        setJournalClientHistory(history);
      } catch {
        setJournalClientHistory([]);
      } finally {
        setJournalClientLoading(false);
      }
    })();
  };

  const handleCloseJournalAppointment = () => {
    setJournalAppointmentTarget(null);
    setJournalClientTarget(null);
    setJournalClientDraft({
      name: '',
      phone: '',
      email: '',
      comment: '',
    });
    setJournalClientHistory([]);
    setJournalClientLoading(false);
    setJournalClientSaving(false);
    setPage('tabs');
    setTab('journal');
  };

  const handleUpdateJournalAppointmentStatus = async (
    status: 'PENDING' | 'ARRIVED' | 'NO_SHOW' | 'CONFIRMED',
  ) => {
    const appointment = journalAppointmentTarget;
    if (!appointment) {
      return;
    }
    if (!canEdit(EDIT_PERMISSION.journal)) {
      setToast('Нет прав на редактирование журнала');
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      await api.patch<unknown>(`/appointments/${appointment.id}/status`, { status });
      setAppointments((prev) =>
        prev.map((item) => (item.id === appointment.id ? { ...item, status } : item)),
      );
      setJournalAppointmentTarget((prev) =>
        prev && prev.id === appointment.id ? { ...prev, status } : prev,
      );
      setJournalClientHistory((prev) =>
        prev.map((item) => (item.id === appointment.id ? { ...item, status } : item)),
      );
      setClientHistoryAppointments((prev) =>
        prev.map((item) => (item.id === appointment.id ? { ...item, status } : item)),
      );
      setToast('Статус записи обновлен');
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleOpenJournalClient = async () => {
    const appointment = journalAppointmentTarget;
    if (!appointment) {
      return;
    }
    const fallbackClient: ClientItem = {
      id: appointment.clientId,
      name: appointment.clientName || 'Клиент',
      phone: appointment.clientPhone || '',
    };

    setJournalClientTarget(fallbackClient);
    setJournalClientDraft({
      name: fallbackClient.name,
      phone: fallbackClient.phone,
      email: '',
      comment: '',
    });
    setJournalClientHistory([]);
    setJournalClientLoading(true);
    setPage('journalClient');
    setTab('journal');

    try {
      const nextDraft = {
        name: fallbackClient.name,
        phone: fallbackClient.phone,
        email: '',
        comment: '',
      };

      if (fallbackClient.id) {
        try {
          const detailsData = await api.get<unknown>(`/clients/${fallbackClient.id}`);
          const details = toRecord(detailsData);
          nextDraft.name = toString(details?.name) || fallbackClient.name;
          nextDraft.phone =
            toString(details?.phoneE164) ||
            toString(details?.phone) ||
            fallbackClient.phone;
          nextDraft.email = toString(details?.email);
          nextDraft.comment = toString(details?.comment);
        } catch {
          // Ignore details fetch errors here: history and base info still work.
        }
      }

      const history = await fetchClientHistoryFromAppointments(fallbackClient);
      setJournalClientHistory(history);
      setJournalClientDraft(nextDraft);
      setJournalClientTarget((prev) =>
        prev
          ? {
              ...prev,
              name: nextDraft.name || prev.name,
              phone: nextDraft.phone || prev.phone,
            }
          : prev,
      );
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setJournalClientLoading(false);
    }
  };

  const handleCloseJournalClient = () => {
    if (journalAppointmentTarget) {
      setPage('journalAppointment');
      setTab('journal');
      return;
    }
    setPage('tabs');
    setTab('journal');
  };

  const handleSaveJournalClient = async () => {
    if (!canEdit(EDIT_PERMISSION.clients)) {
      setToast('Нет прав на редактирование клиентов');
      return;
    }
    if (!journalClientTarget?.id) {
      setToast('Нельзя сохранить клиента без ID');
      return;
    }
    const payload = {
      name: journalClientDraft.name.trim(),
      phone: journalClientDraft.phone.trim(),
      email: journalClientDraft.email.trim(),
      comment: journalClientDraft.comment.trim(),
    };
    if (!payload.name || !payload.phone) {
      setToast('Имя и телефон обязательны');
      return;
    }

    setJournalClientSaving(true);
    try {
      const data = await api.patch<unknown>(`/clients/${journalClientTarget.id}`, {
        name: payload.name,
        phone: payload.phone,
        email: payload.email || null,
        comment: payload.comment || null,
      });
      const root = toRecord(data);
      const updated = toRecord(root?.client) ?? root;
      const nextName = toString(updated?.name) || payload.name;
      const nextPhone = toString(updated?.phoneE164) || payload.phone;
      const nextEmail = toString(updated?.email) || payload.email;
      const nextComment = toString(updated?.comment) || payload.comment;

      setJournalClientDraft({
        name: nextName,
        phone: nextPhone,
        email: nextEmail,
        comment: nextComment,
      });
      setJournalClientTarget((prev) =>
        prev
          ? {
              ...prev,
              name: nextName,
              phone: nextPhone,
            }
          : prev,
      );
      setClients((prev) =>
        prev.map((item) =>
          item.id === journalClientTarget.id
            ? { ...item, name: nextName, phone: nextPhone }
            : item,
        ),
      );
      setAppointments((prev) =>
        prev.map((item) =>
          item.clientId === journalClientTarget.id
            ? { ...item, clientName: nextName, clientPhone: nextPhone }
            : item,
        ),
      );
      setJournalAppointmentTarget((prev) =>
        prev && prev.clientId === journalClientTarget.id
          ? { ...prev, clientName: nextName, clientPhone: nextPhone }
          : prev,
      );
      setJournalClientHistory((prev) =>
        prev.map((item) =>
          item.clientId === journalClientTarget.id
            ? { ...item, clientName: nextName, clientPhone: nextPhone }
            : item,
        ),
      );
      setToast('Карточка клиента обновлена');
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setJournalClientSaving(false);
    }
  };

  const handleCallJournalClient = () => {
    const phone =
      journalAppointmentTarget?.clientPhone || journalClientTarget?.phone || journalClientDraft.phone;
    if (!phone) {
      setToast('Телефон клиента не найден');
      return;
    }
    window.location.href = `tel:${normalizePhoneForLink(phone)}`;
  };

  const handleSmsJournalClient = () => {
    const phone =
      journalAppointmentTarget?.clientPhone || journalClientTarget?.phone || journalClientDraft.phone;
    if (!phone) {
      setToast('Телефон клиента не найден');
      return;
    }
    window.location.href = `sms:${normalizePhoneForLink(phone)}`;
  };

  const handleWhatsAppJournalClient = () => {
    const phone =
      journalAppointmentTarget?.clientPhone || journalClientTarget?.phone || journalClientDraft.phone;
    if (!phone) {
      setToast('Телефон клиента не найден');
      return;
    }
    const digits = normalizePhoneForWhatsApp(phone);
    window.open(`https://wa.me/${digits}`, '_blank', 'noopener,noreferrer');
  };

  const handleCallClient = () => {
    if (!clientActionsFor?.phone) {
      setToast('Телефон клиента не найден');
      return;
    }
    window.location.href = `tel:${normalizePhoneForLink(clientActionsFor.phone)}`;
  };

  const handleSmsClient = () => {
    if (!clientActionsFor?.phone) {
      setToast('Телефон клиента не найден');
      return;
    }
    window.location.href = `sms:${normalizePhoneForLink(clientActionsFor.phone)}`;
  };

  const handleWhatsAppClient = () => {
    if (!clientActionsFor?.phone) {
      setToast('Телефон клиента не найден');
      return;
    }
    const digits = normalizePhoneForWhatsApp(clientActionsFor.phone);
    window.open(`https://wa.me/${digits}`, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteClient = () => {
    setClientActionsFor(null);
    setToast('Удаление клиента недоступно в текущем API');
  };

  const handleImportClientsFromContacts = async (
    contacts: Array<{ name: string; phone: string }>,
  ) => {
    if (!canEdit(EDIT_PERMISSION.clients)) {
      throw new Error('Нет прав на редактирование клиентов');
    }
    const normalized = contacts
      .map((item) => ({
        name: item.name.trim(),
        phone: item.phone.trim(),
      }))
      .filter((item) => item.phone.length > 0);

    if (normalized.length === 0) {
      return { imported: 0, skipped: contacts.length };
    }

    const dedupedMap = new Map<string, { name: string; phone: string }>();
    normalized.forEach((item) => {
      const dedupeKey = normalizePhoneForWhatsApp(item.phone);
      if (!dedupeKey) {
        return;
      }
      if (!dedupedMap.has(dedupeKey)) {
        dedupedMap.set(dedupeKey, item);
      }
    });
    const deduped = Array.from(dedupedMap.values());
    const skipped = contacts.length - deduped.length;
    if (deduped.length === 0) {
      return { imported: 0, skipped: contacts.length };
    }

    setLoadingKey(setLoading, 'action', true);
    try {
      const results = await Promise.allSettled(
        deduped.map((item) =>
          api.post<unknown>('/clients/loyalty/upsert', {
            phone: item.phone,
            name: item.name || undefined,
            discount: {
              mode: 'PERMANENT',
              type: 'NONE',
            },
          }),
        ),
      );
      const imported = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.length - imported;
      await loadClients(debouncedClientsQuery);

      const firstRejected = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );
      if (imported === 0 && firstRejected) {
        throw firstRejected.reason;
      }

      return {
        imported,
        skipped: skipped + failed,
      };
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleSetDate = () => {
    setJournalDatePickerOpen(true);
  };

  const closeJournalDatePicker = () => {
    setJournalDatePickerOpen(false);
  };

  const selectJournalDate = (value: Date) => {
    setSelectedDate(value);
    setJournalDatePickerOpen(false);
  };

  const handleCreateAppointment = async () => {
    if (!canEdit(EDIT_PERMISSION.journal)) {
      setToast('Нет прав на редактирование журнала');
      return;
    }
    if (staff.length === 0 || services.length === 0) {
      setToast('Нет данных staff/services для создания записи');
      return;
    }

    const clientName = prompt('Имя клиента');
    if (!clientName) {
      return;
    }
    const phone = prompt('Телефон клиента в формате +7...');
    if (!phone) {
      return;
    }
    const time = prompt('Время начала HH:mm', '10:00');
    if (!time) {
      return;
    }
    const durationMin = Number(prompt('Длительность (мин)', '60') || '60');
    const duration = Number.isFinite(durationMin) && durationMin > 0 ? durationMin : 60;

    const [hh, mm] = time.split(':').map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
      setToast('Неверное время');
      return;
    }

    const start = new Date(selectedDate);
    start.setHours(hh, mm, 0, 0);
    const end = new Date(start.getTime() + duration * 60_000);

    const staffId = staff[0].id;
    const serviceId = services[0].id;
    const payloadCandidates: Record<string, unknown>[] = [
      {
        startAt: start.toISOString(),
        staffId,
        anyStaff: false,
        serviceIds: [serviceId],
        clientName,
        phone,
      },
      {
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        staffId,
        anyStaff: false,
        serviceId,
        client: {
          name: clientName,
          phone,
        },
      },
    ];

    setLoadingKey(setLoading, 'action', true);
    try {
      let lastError: unknown = null;
      for (const payload of payloadCandidates) {
        try {
          await api.post<unknown>('/appointments', payload);
          setToast('Запись создана');
          await loadAppointments(selectedDate);
          return;
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleScheduleEdit = async () => {
    if (!canEdit(EDIT_PERMISSION.schedule)) {
      setToast('Нет прав на редактирование графика');
      return;
    }
    const target =
      visibleStaff[0] ||
      staffWithServices[0] ||
      null;
    if (!target) {
      setToast('Нет сотрудников с услугами');
      return;
    }
    await openScheduleEditorForStaff(target);
  };

  const runServiceMutations = async (mutations: Array<() => Promise<unknown>>) => {
    let lastError: unknown = null;
    for (const mutate of mutations) {
      try {
        await mutate();
        return { ok: true, notFound: false };
      } catch (error) {
        lastError = error;
        if (error instanceof ApiError && error.code === 'NOT_FOUND') {
          continue;
        }
        throw error;
      }
    }
    if (lastError instanceof ApiError && lastError.code === 'NOT_FOUND') {
      return { ok: false, notFound: true };
    }
    if (lastError) {
      throw lastError;
    }
    return { ok: false, notFound: true };
  };

  const handleSelectStaffAvatarFile = async (file: File) => {
    setLoadingKey(setLoading, 'action', true);
    try {
      const converted = await convertImageFileToWebp(file);
      clearBlobPreview(staffAvatarBlobUrlRef);
      staffAvatarBlobUrlRef.current = converted.previewUrl;
      setStaffAvatarPreviewUrl(converted.previewUrl);
      setStaffAvatarWebpBlob(converted.blob);
      setStaffAvatarOriginalName(file.name || 'avatar');
      setToast('Фото сотрудника подготовлено (WEBP)');
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleSelectOwnerAvatarFile = async (file: File) => {
    setLoadingKey(setLoading, 'action', true);
    try {
      const converted = await convertImageFileToWebp(file);
      clearBlobPreview(ownerAvatarBlobUrlRef);
      ownerAvatarBlobUrlRef.current = converted.previewUrl;
      setOwnerAvatarPreviewUrl(converted.previewUrl);
      setOwnerAvatarWebpBlob(converted.blob);
      setOwnerAvatarOriginalName(file.name || 'avatar');
      setToast('Фото профиля подготовлено (WEBP)');
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleSelectServiceImageFile = async (file: File) => {
    setLoadingKey(setLoading, 'action', true);
    try {
      const converted = await convertImageFileToWebp(file);
      clearBlobPreview(serviceImageBlobUrlRef);
      serviceImageBlobUrlRef.current = converted.previewUrl;
      setServiceImagePreviewUrl(converted.previewUrl);
      setServiceImageWebpBlob(converted.blob);
      setServiceImageOriginalName(file.name || 'service');
      setServiceDraft((prev) => ({ ...prev, imageUrl: converted.previewUrl }));
      setToast('Изображение услуги подготовлено (WEBP)');
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const patchStaffAvatarAsset = async (staffId: string, photoAssetId: string | null) => {
    const payload = await api.patch<unknown>(`/staff/${staffId}/avatar`, { photoAssetId });
    const record = toRecord(payload);
    return {
      avatarUrl: toString(record?.avatarUrl) || null,
      avatarAssetId: toString(record?.avatarAssetId) || null,
      previousAvatarAssetId: toString(record?.previousAvatarAssetId) || null,
    };
  };

  const deleteMediaAssetById = async (assetId: string | null) => {
    if (!assetId) {
      return;
    }
    try {
      await api.delete<unknown>(`/client-front/staff/media/${assetId}`);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 404 || error.code === 'NOT_FOUND')
      ) {
        return;
      }
      throw error;
    }
  };

  const applyAvatarLocally = (
    staffId: string,
    avatarUrl: string | null,
    avatarAssetId: string | null,
  ) => {
    setStaff((prev) =>
      prev.map((item) =>
        item.id === staffId ? { ...item, avatarUrl, avatarAssetId } : item,
      ),
    );
  };

  const uploadAvatarIfNeeded = async ({
    staffId,
    webpBlob,
    originalName,
    previousAssetId,
  }: {
    staffId: string;
    webpBlob: Blob | null;
    originalName: string;
    previousAssetId: string | null;
  }) => {
    if (!webpBlob) {
      return { url: null as string | null, assetId: previousAssetId, warning: '' };
    }
    try {
      const uploaded = await uploadWebpImage({
        scope: 'staff-avatar',
        entityId: staffId,
        webpBlob,
        originalName,
      });
      if (!uploaded.assetId) {
        return {
          url: null,
          assetId: previousAssetId,
          warning: 'Не удалось получить ID загруженного файла',
        };
      }
      const linked = await patchStaffAvatarAsset(staffId, uploaded.assetId);
      const nextAssetId = linked.avatarAssetId || uploaded.assetId;
      const nextUrl = linked.avatarUrl || uploaded.url;
      if (previousAssetId && previousAssetId !== nextAssetId) {
        await deleteMediaAssetById(previousAssetId);
      }
      applyAvatarLocally(staffId, nextUrl, nextAssetId);
      return { url: nextUrl, assetId: nextAssetId, warning: '' };
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 403 || error.code === 'FORBIDDEN')
      ) {
        return {
          url: null,
          assetId: previousAssetId,
          warning: 'Недостаточно прав для media upload/delete (нужно MANAGE_MEDIA)',
        };
      }
      const message = toErrorMessage(error);
      if (message.startsWith('UPLOAD_ENDPOINT_NOT_FOUND')) {
        return {
          url: null,
          assetId: previousAssetId,
          warning:
            'Серверный upload endpoint не найден. Проверьте API путь: /client-front/staff/media/upload',
        };
      }
      throw error;
    }
  };

  const uploadStaffAvatarIfNeeded = async (staffId: string) => {
    const result = await uploadAvatarIfNeeded({
      staffId,
      webpBlob: staffAvatarWebpBlob,
      originalName: staffAvatarOriginalName,
      previousAssetId: staffAvatarAssetId,
    });
    if (result.url) {
      setStaffAvatarPreviewUrl(result.url);
    }
    if (result.assetId !== undefined) {
      setStaffAvatarAssetId(result.assetId ?? null);
    }
    return result;
  };

  const uploadOwnerAvatarIfNeeded = async (staffId: string) => {
    const result = await uploadAvatarIfNeeded({
      staffId,
      webpBlob: ownerAvatarWebpBlob,
      originalName: ownerAvatarOriginalName,
      previousAssetId: ownerAvatarAssetId,
    });
    if (result.url) {
      setOwnerAvatarPreviewUrl(result.url);
    }
    if (result.assetId !== undefined) {
      setOwnerAvatarAssetId(result.assetId ?? null);
    }
    return result;
  };

  const handleDeleteStaffAvatar = async () => {
    if (!staffAvatarPreviewUrl) {
      return;
    }
    const staffId = editingStaffId;
    if (!staffId) {
      resetStaffAvatarState();
      return;
    }

    setLoadingKey(setLoading, 'action', true);
    try {
      await patchStaffAvatarAsset(staffId, null);
      await deleteMediaAssetById(staffAvatarAssetId);
      resetStaffAvatarState();
      applyAvatarLocally(staffId, null, null);
      setToast('Аватар сотрудника удален');
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleDeleteOwnerAvatar = async () => {
    if (!ownerAvatarPreviewUrl) {
      return;
    }
    if (!ownerEditId) {
      resetOwnerAvatarState();
      return;
    }
    if (!canEditOwnProfile) {
      setToast('Недостаточно прав для удаления аватара');
      return;
    }

    setLoadingKey(setLoading, 'action', true);
    try {
      await patchStaffAvatarAsset(ownerEditId, null);
      await deleteMediaAssetById(ownerAvatarAssetId);
      resetOwnerAvatarState();
      applyAvatarLocally(ownerEditId, null, null);
      setToast('Аватар профиля удален');
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const uploadServiceImageIfNeeded = async (serviceId: string) => {
    if (!serviceImageWebpBlob) {
      return { url: null, warning: '' };
    }
    try {
      const uploaded = await uploadWebpImage({
        scope: 'service-image',
        entityId: serviceId,
        webpBlob: serviceImageWebpBlob,
        originalName: serviceImageOriginalName,
      });
      setServiceImagePreviewUrl(uploaded.url);
      setServiceDraft((prev) => ({ ...prev, imageUrl: uploaded.url }));
      setServices((prev) =>
        prev.map((item) =>
          item.id === serviceId ? { ...item, imageUrl: uploaded.url } : item,
        ),
      );
      return { url: uploaded.url, warning: '' };
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 403 || error.code === 'FORBIDDEN')
      ) {
        return {
          url: null,
          warning: 'Недостаточно прав для media upload (нужно MANAGE_MEDIA)',
        };
      }
      const message = toErrorMessage(error);
      if (message.startsWith('UPLOAD_ENDPOINT_NOT_FOUND')) {
        return {
          url: null,
          warning:
            'Серверный upload endpoint не найден. Проверьте API путь: /client-front/staff/media/upload',
        };
      }
      throw error;
    }
  };

  const openServicesPage = async () => {
    setServicesCategorySearch('');
    setServicesItemsSearch('');
    setSelectedServiceCategoryId(null);
    setSelectedServiceCategoryName('');
    await loadServices();
    setPage('servicesCategories');
  };

  const closeClientSiteEditor = () => {
    setPage('tabs');
    setTab('more');
  };

  const closeServicesPage = () => {
    setPage('tabs');
    setTab('more');
    setServicesCategorySearch('');
    setServicesItemsSearch('');
    setSelectedServiceCategoryId(null);
    setSelectedServiceCategoryName('');
  };

  const openServiceCategory = (categoryId: string) => {
    const category = serviceCategories.find((item) => item.id === categoryId);
    if (!category) {
      return;
    }
    setSelectedServiceCategoryId(category.id);
    setSelectedServiceCategoryName(category.name);
    setServicesItemsSearch('');
    setPage('servicesCategory');
  };

  const closeServiceCategory = () => {
    setPage('servicesCategories');
    setServicesItemsSearch('');
  };

  const openServiceCategoryEditor = (categoryId: string | null) => {
    if (!canEdit(EDIT_PERMISSION.services)) {
      setToast('Нет прав на редактирование услуг');
      return;
    }
    if (!categoryId) {
      setServiceCategoryEditorId(null);
      setServiceCategoryEditorName('');
      setPage('serviceCategoryEditor');
      return;
    }
    const found = serviceCategories.find((item) => item.id === categoryId);
    if (!found) {
      setToast('Категория не найдена');
      return;
    }
    setServiceCategoryEditorId(found.id);
    setServiceCategoryEditorName(found.name);
    setPage('serviceCategoryEditor');
  };

  const closeServiceCategoryEditor = () => {
    setServiceCategoryEditorId(null);
    setServiceCategoryEditorName('');
    setPage('servicesCategories');
  };

  const createLocalCategory = (name: string) => {
    const nextId = `local-cat-${Date.now()}`;
    setLocalServiceCategories((prev) => [...prev, { id: nextId, name, count: 0 }]);
  };

  const saveServiceCategoryEditor = async () => {
    if (!canEdit(EDIT_PERMISSION.services)) {
      setToast('Нет прав на редактирование услуг');
      return;
    }
    const name = serviceCategoryEditorName.trim();
    if (!name) {
      setToast('Название категории обязательно');
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      if (serviceCategoryEditorId) {
        const result = await runServiceMutations([
          () => api.patch(`/services/categories/${serviceCategoryEditorId}`, { name }),
          () => api.patch(`/service-categories/${serviceCategoryEditorId}`, { name }),
          () => api.patch(`/services/category/${serviceCategoryEditorId}`, { name }),
          () => api.put(`/service-categories/${serviceCategoryEditorId}`, { name }),
        ]);
        if (result.ok) {
          await loadServices();
          setToast('Категория обновлена');
        } else {
          setServices((prev) =>
            prev.map((item) =>
              item.categoryId === serviceCategoryEditorId
                ? { ...item, categoryName: name }
                : item,
            ),
          );
          setLocalServiceCategories((prev) => {
            const exists = prev.some((item) => item.id === serviceCategoryEditorId);
            if (exists) {
              return prev.map((item) =>
                item.id === serviceCategoryEditorId ? { ...item, name } : item,
              );
            }
            return [...prev, { id: serviceCategoryEditorId, name, count: 0 }];
          });
          if (selectedServiceCategoryId === serviceCategoryEditorId) {
            setSelectedServiceCategoryName(name);
          }
          setToast('Категория обновлена локально (API read-only)');
        }
      } else {
        const result = await runServiceMutations([
          () => api.post('/services/categories', { name }),
          () => api.post('/service-categories', { name }),
          () => api.post('/services/category', { name }),
        ]);
        if (result.ok) {
          await loadServices();
          setToast('Категория создана');
        } else {
          createLocalCategory(name);
          setToast('Категория создана локально (API read-only)');
        }
      }
      closeServiceCategoryEditor();
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const deleteServiceCategoryEditor = async () => {
    if (!canEdit(EDIT_PERMISSION.services)) {
      setToast('Нет прав на редактирование услуг');
      return;
    }
    if (!serviceCategoryEditorId) {
      return;
    }
    const confirmed = window.confirm('Удалить категорию?');
    if (!confirmed) {
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      const result = await runServiceMutations([
        () => api.delete(`/services/categories/${serviceCategoryEditorId}`),
        () => api.delete(`/service-categories/${serviceCategoryEditorId}`),
        () => api.delete(`/services/category/${serviceCategoryEditorId}`),
      ]);
      if (result.ok) {
        await loadServices();
        setToast('Категория удалена');
      } else {
        setLocalServiceCategories((prev) =>
          prev.filter((item) => item.id !== serviceCategoryEditorId),
        );
        setServices((prev) =>
          prev.map((item) =>
            item.categoryId === serviceCategoryEditorId
              ? { ...item, categoryId: 'uncategorized', categoryName: 'Без категории' }
              : item,
          ),
        );
        setToast('Категория удалена локально (API read-only)');
      }
      if (selectedServiceCategoryId === serviceCategoryEditorId) {
        setSelectedServiceCategoryId(null);
        setSelectedServiceCategoryName('');
      }
      closeServiceCategoryEditor();
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const getStaffServiceIds = async (staffId: string) => {
    const data = await api.get<unknown>(`/staff/${staffId}/services`);
    return extractItems(data)
      .map((row) => toString(toRecord(row)?.id))
      .filter(Boolean);
  };

  const loadServiceProvidersForEditor = async (serviceId: string) => {
    const masters = staff.filter((item) => item.role === 'MASTER' && item.isActive);
    setServiceAssignableStaff(masters);
    if (masters.length === 0) {
      setServiceProviders([]);
      return;
    }

    setServiceProvidersLoading(true);
    try {
      const rows = await Promise.all(
        masters.map(async (member) => {
          try {
            const ids = await getStaffServiceIds(member.id);
            return ids.includes(serviceId) ? member : null;
          } catch {
            return null;
          }
        }),
      );
      setServiceProviders(rows.filter(Boolean) as StaffItem[]);
    } finally {
      setServiceProvidersLoading(false);
    }
  };

  const syncServiceProvidersForCurrentService = async (staffIds: string[]) => {
    if (!canEdit(EDIT_PERMISSION.staff)) {
      setToast('Нет прав на редактирование сотрудников');
      return;
    }
    if (!serviceDraft.id) {
      setToast('Сначала сохраните услугу');
      return;
    }
    const targetIds = Array.from(new Set(staffIds));
    const currentIds = serviceProviders.map((item) => item.id);
    const changedIds = Array.from(new Set([...targetIds, ...currentIds]));
    if (changedIds.length === 0) {
      setServiceProviders([]);
      return;
    }

    setLoadingKey(setLoading, 'action', true);
    try {
      await Promise.all(
        changedIds.map(async (staffId) => {
          const currentServiceIds = await getStaffServiceIds(staffId);
          const hasService = currentServiceIds.includes(serviceDraft.id!);
          const shouldHaveService = targetIds.includes(staffId);
          if (hasService === shouldHaveService) {
            return;
          }
          const nextServiceIds = shouldHaveService
            ? Array.from(new Set([...currentServiceIds, serviceDraft.id!]))
            : currentServiceIds.filter((id) => id !== serviceDraft.id);
          await api.put<unknown>(`/staff/${staffId}/services`, {
            serviceIds: nextServiceIds,
          });
        }),
      );
      await loadServiceProvidersForEditor(serviceDraft.id);
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const removeServiceProviderFromCurrentService = async (staffId: string) => {
    const nextIds = serviceProviders
      .map((item) => item.id)
      .filter((itemId) => itemId !== staffId);
    await syncServiceProvidersForCurrentService(nextIds);
  };

  const openServiceEditor = (serviceId: string | null) => {
    if (!canEdit(EDIT_PERMISSION.services)) {
      setToast('Нет прав на редактирование услуг');
      return;
    }
    setServiceEditorReturnPage(page === 'servicesCategories' ? 'servicesCategories' : 'servicesCategory');
    if (!serviceId) {
      resetServiceImageState();
      setServiceDraft({
        ...EMPTY_SERVICE_DRAFT,
        categoryId: selectedServiceCategoryId || '',
        categoryName: selectedServiceCategoryName || '',
      });
      setServiceProviders([]);
      setServiceAssignableStaff(staff.filter((item) => item.role === 'MASTER' && item.isActive));
      setServiceProvidersLoading(false);
      setPage('serviceEditor');
      return;
    }
    const found = services.find((item) => item.id === serviceId);
    if (!found) {
      setToast('Услуга не найдена');
      return;
    }
    setServiceDraft({
      id: found.id,
      name: found.name,
      categoryId: found.categoryId,
      categoryName: found.categoryName,
      description: found.description || '',
      imageUrl: found.imageUrl || '',
      durationSec: found.durationSec || 0,
      priceMin: found.priceMin || 0,
      priceMax: found.priceMin || 0,
      isActive: found.isActive,
    });
    setServiceAssignableStaff(staff.filter((item) => item.role === 'MASTER' && item.isActive));
    resetServiceImageState();
    setServiceImagePreviewUrl(found.imageUrl || '');
    void loadServiceProvidersForEditor(found.id);
    setPage('serviceEditor');
  };

  const openServiceCreateForCategory = (categoryId: string) => {
    if (!canEdit(EDIT_PERMISSION.services)) {
      setToast('Нет прав на редактирование услуг');
      return;
    }
    const category = serviceCategories.find((item) => item.id === categoryId);
    if (!category) {
      setToast('Категория не найдена');
      return;
    }
    setSelectedServiceCategoryId(category.id);
    setSelectedServiceCategoryName(category.name);
    setServiceEditorReturnPage('servicesCategories');
    resetServiceImageState();
    setServiceDraft({
      ...EMPTY_SERVICE_DRAFT,
      categoryId: category.id,
      categoryName: category.name,
    });
    setServiceProviders([]);
    setServiceAssignableStaff(staff.filter((item) => item.role === 'MASTER' && item.isActive));
    setServiceProvidersLoading(false);
    setPage('serviceEditor');
  };

  const closeServiceEditor = () => {
    setServiceDraft(EMPTY_SERVICE_DRAFT);
    setServiceProviders([]);
    setServiceAssignableStaff([]);
    setServiceProvidersLoading(false);
    resetServiceImageState();
    setPage(serviceEditorReturnPage);
  };

  const persistLocalServiceDraft = (id: string) => {
    setServices((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              name: serviceDraft.name.trim(),
              categoryId: serviceDraft.categoryId || item.categoryId,
              categoryName: serviceDraft.categoryName || item.categoryName,
              description: serviceDraft.description || null,
              imageUrl: serviceImagePreviewUrl || serviceDraft.imageUrl || item.imageUrl,
              durationSec: Math.max(0, serviceDraft.durationSec),
              priceMin: Math.max(0, serviceDraft.priceMin),
              priceMax: Math.max(0, serviceDraft.priceMin),
              isActive: serviceDraft.isActive,
            }
          : item,
      ),
    );
  };

  const saveServiceEditor = async () => {
    if (!canEdit(EDIT_PERMISSION.services)) {
      setToast('Нет прав на редактирование услуг');
      return;
    }
    const name = serviceDraft.name.trim();
    if (!name) {
      setToast('Название услуги обязательно');
      return;
    }
    if (!serviceDraft.categoryId || !serviceDraft.categoryName) {
      setToast('Выберите категорию');
      return;
    }

    const payload = {
      name,
      nameOnline: name,
      categoryId: serviceDraft.categoryId,
      description: serviceDraft.description.trim() || undefined,
      durationSec: Math.max(600, Math.round(serviceDraft.durationSec)),
      priceMin: Math.max(0, Math.round(serviceDraft.priceMin)),
      priceMax: Math.max(0, Math.round(serviceDraft.priceMin)),
      isActive: serviceDraft.isActive,
    };

    setLoadingKey(setLoading, 'action', true);
    try {
      let nextToast = '';
      if (serviceDraft.id) {
        const result = await runServiceMutations([
          () => api.patch(`/services/${serviceDraft.id}`, payload),
          () => api.put(`/services/${serviceDraft.id}`, payload),
        ]);
        if (result.ok) {
          await loadServices();
          if (serviceImageWebpBlob) {
            const uploadResult = await uploadServiceImageIfNeeded(serviceDraft.id);
            if (uploadResult.warning) {
              nextToast = uploadResult.warning;
            }
          }
          if (!nextToast) {
            nextToast = 'Услуга обновлена';
          }
        } else {
          persistLocalServiceDraft(serviceDraft.id);
          nextToast = 'Услуга обновлена локально (API read-only)';
        }
      } else {
        const result = await runServiceMutations([
          () => api.post('/services', payload),
          () => api.post('/services/create', payload),
        ]);
        if (result.ok) {
          const rows = await loadServices();
          if (serviceImageWebpBlob) {
            const sameCategoryAndName = rows.filter(
              (item) =>
                item.categoryId === payload.categoryId &&
                item.name.trim().toLowerCase() === payload.name.trim().toLowerCase(),
            );
            const sameName = rows.filter(
              (item) => item.name.trim().toLowerCase() === payload.name.trim().toLowerCase(),
            );
            const created =
              sameCategoryAndName[sameCategoryAndName.length - 1] ||
              sameName[sameName.length - 1] ||
              null;
            if (created) {
              const uploadResult = await uploadServiceImageIfNeeded(created.id);
              if (uploadResult.warning) {
                nextToast = uploadResult.warning;
              }
            } else {
              nextToast =
                'Услуга создана, но не удалось определить ID для загрузки изображения';
            }
          }
          if (!nextToast) {
            nextToast = 'Услуга создана';
          }
        } else {
          const localId = `local-service-${Date.now()}`;
          setServices((prev) => [
            ...prev,
            {
              id: localId,
              name: payload.name,
              categoryId: payload.categoryId,
              categoryName: serviceDraft.categoryName,
              nameOnline: payload.nameOnline,
              description: payload.description || null,
              imageUrl: serviceImagePreviewUrl || serviceDraft.imageUrl || null,
              durationSec: payload.durationSec,
              priceMin: payload.priceMin,
              priceMax: payload.priceMax,
              isActive: payload.isActive,
            },
          ]);
          nextToast = 'Услуга создана локально (API read-only)';
        }
      }
      if (serviceDraft.categoryId) {
        setSelectedServiceCategoryId(serviceDraft.categoryId);
        setSelectedServiceCategoryName(serviceDraft.categoryName);
      }
      closeServiceEditor();
      setToast(nextToast);
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const deleteServiceEditor = async () => {
    if (!canEdit(EDIT_PERMISSION.services)) {
      setToast('Нет прав на редактирование услуг');
      return;
    }
    if (!serviceDraft.id) {
      closeServiceEditor();
      return;
    }
    const confirmed = window.confirm('Удалить услугу?');
    if (!confirmed) {
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      const result = await runServiceMutations([
        () => api.delete(`/services/${serviceDraft.id}`),
      ]);
      if (result.ok) {
        await loadServices();
        setToast('Услуга удалена');
      } else {
        setServices((prev) => prev.filter((item) => item.id !== serviceDraft.id));
        setToast('Услуга удалена локально (API read-only)');
      }
      closeServiceEditor();
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const toggleServiceActiveInline = async (serviceId: string, enabled: boolean) => {
    if (!canEdit(EDIT_PERMISSION.services)) {
      setToast('Нет прав на редактирование услуг');
      return;
    }
    const found = services.find((item) => item.id === serviceId);
    if (!found) {
      setToast('Услуга не найдена');
      return;
    }

    const payload = {
      name: found.name,
      nameOnline: found.nameOnline || found.name,
      categoryId: found.categoryId,
      description: found.description || undefined,
      durationSec: Math.max(600, Math.round(found.durationSec || 0)),
      priceMin: Math.max(0, Math.round(found.priceMin || 0)),
      priceMax: Math.max(0, Math.round(found.priceMax || found.priceMin || 0)),
      isActive: enabled,
    };

    try {
      const result = await runServiceMutations([
        () => api.patch(`/services/${serviceId}`, payload),
        () => api.put(`/services/${serviceId}`, payload),
      ]);
      setServices((prev) =>
        prev.map((item) =>
          item.id === serviceId
            ? {
                ...item,
                isActive: enabled,
                nameOnline: payload.nameOnline,
              }
            : item,
        ),
      );
      if (!result.ok) {
        setToast('Статус услуги обновлен локально (API read-only)');
      }
    } catch (error) {
      setToast(toErrorMessage(error));
    }
  };

  const handleMoreAction = async (title: string) => {
    if (!session) {
      return;
    }
    const requiredPermission = MORE_ACTION_PERMISSION_CODE[title];
    if (!hasPermissionAccess(requiredPermission)) {
      setToast('Нет доступа к разделу');
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      switch (title) {
        case 'Сотрудники': {
          const rows = await loadStaff();
          await loadStaffServiceMeta(rows);
          setPanel(null);
          setStaffSearch('');
          setStaffFilter(EMPTY_STAFF_FILTER);
          closeStaffForm();
          setPage('staff');
          return;
        }
        case 'Услуги': {
          await openServicesPage();
          return;
        }
        case 'Аналитика': {
          setPanel(null);
          setPage('tabs');
          setTab('analytics');
          return;
        }
        case 'Онлайн-запись': {
          setPage('clientSiteEditor');
          return;
        }
        case 'Политика конфиденциальности': {
          await loadSettings();
          setPage('privacyPolicy');
          return;
        }
        case 'Настройки': {
          const currentSettings = await loadSettings();
          const currentNotice = currentSettings?.clientCancelMinNoticeMinutes ?? null;
          if (session.staff.role !== 'OWNER') {
            setPanel({
              title: 'Настройки',
              lines: [
                `minNoticeMinutes: ${
                  currentNotice !== null ? currentNotice : 'нет данных'
                }`,
                'Изменение доступно только Владелец',
              ],
            });
            return;
          }
          const next = prompt(
            'Новый minNoticeMinutes',
            String(currentNotice ?? 120),
          );
          if (!next) {
            return;
          }
          const value = Number(next);
          if (!Number.isFinite(value) || value < 0) {
            setToast('Неверное значение');
            return;
          }
          await api.patch<unknown>('/settings/client-cancel-policy', {
            minNoticeMinutes: value,
          });
          setToast('Настройки обновлены');
          return;
        }
        case 'Поддержка': {
          window.location.href = 'mailto:support@mari-beauty.local?subject=Mari%20Staff%20Support';
          setToast('Открываю почтовый клиент');
          return;
        }
        default:
          return;
      }
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const savePrivacyPolicy = async (value: string) => {
    if (!canEditPrivacyPolicy) {
      setToast('Нет прав на редактирование политики');
      return false;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      const normalized = value.replace(/\r\n/g, '\n');
      const data = await api.patch<unknown>('/settings/privacy-policy', {
        content: normalized,
      });
      const record = toRecord(data);
      const privacyPolicyRecord = toRecord(record?.privacyPolicy);
      const nextText = toString(privacyPolicyRecord?.content) || normalized;
      setPrivacyPolicyText(nextText);
      setToast('Политика конфиденциальности сохранена');
      return true;
    } catch (error) {
      setToast(toErrorMessage(error));
      return false;
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const openEditorServicesPanel = () => {
    if (!canEdit(EDIT_PERMISSION.staff)) {
      setToast('Нет прав на редактирование сотрудников');
      return;
    }
    const staffId = editingStaffId;
    if (!staffId) {
      setToast('Сначала сохраните сотрудника, затем назначьте услуги');
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    void (async () => {
      try {
        if (services.length === 0) {
          await loadServices();
        }
        const data = await api.get<unknown>(`/staff/${staffId}/services`);
        const ids = extractItems(data)
          .map((item) => toString(toRecord(item)?.id))
          .filter((value): value is string => Boolean(value));
        setStaffServicesEditorSelectedIds(ids);
        setStaffServicesEditorQuery('');
        setPage('staffServicesEditor');
      } catch (error) {
        setToast(toErrorMessage(error));
      } finally {
        setLoadingKey(setLoading, 'action', false);
      }
    })();
  };

  const toggleStaffServiceSelection = (serviceId: string) => {
    setStaffServicesEditorSelectedIds((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      }
      return [...prev, serviceId];
    });
  };

  const toggleStaffServiceCategorySelection = (categoryId: string) => {
    setStaffServicesEditorSelectedIds((prev) => {
      const categoryServiceIds = services
        .filter((item) => item.categoryId === categoryId)
        .map((item) => item.id);
      if (categoryServiceIds.length === 0) {
        return prev;
      }
      const prevSet = new Set(prev);
      const allSelected = categoryServiceIds.every((id) => prevSet.has(id));
      if (allSelected) {
        return prev.filter((id) => !categoryServiceIds.includes(id));
      }
      categoryServiceIds.forEach((id) => prevSet.add(id));
      return Array.from(prevSet);
    });
  };

  const saveStaffServicesEditor = async () => {
    if (!canEdit(EDIT_PERMISSION.staff)) {
      setToast('Нет прав на редактирование сотрудников');
      return;
    }
    if (!editingStaffId) {
      setToast('Сотрудник не выбран');
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      await api.put<unknown>(`/staff/${editingStaffId}/services`, {
        serviceIds: staffServicesEditorSelectedIds,
      });
      const selectedSet = new Set(staffServicesEditorSelectedIds);
      const selectedNames = services
        .filter((item) => selectedSet.has(item.id))
        .map((item) => item.name);
      setEditorServiceCount(staffServicesEditorSelectedIds.length);
      setEditorServiceNames(selectedNames);
      setStaffServiceCounts((prev) => ({
        ...prev,
        [editingStaffId]: staffServicesEditorSelectedIds.length,
      }));
      setPage('staffEditor');
      setToast('Услуги сотрудника обновлены');
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const openEditorPermissionsPanel = () => {
    if (!canEdit(EDIT_PERMISSION.staff)) {
      setToast('Нет прав на редактирование сотрудников');
      return;
    }
    if (!editingStaffId) {
      setToast('Сначала сохраните сотрудника, затем настраивайте права');
      return;
    }

    if (editorPermissionCatalog.length > 0) {
      setEditorPermissionsSheetOpen(true);
      return;
    }

    setLoadingKey(setLoading, 'action', true);
    void (async () => {
      try {
        const [catalog, assignedCodes] = await Promise.all([
          api.getStaffPermissionsCatalog(),
          api.getStaffPermissions(editingStaffId),
        ]);
        setEditorPermissionCatalog(catalog);
        setEditorPermissionCodes(assignedCodes);
        setEditorPermissionsSheetOpen(true);
      } catch (error) {
        setToast(toErrorMessage(error));
      } finally {
        setLoadingKey(setLoading, 'action', false);
      }
    })();
  };

  const closeEditorPermissionsPanel = () => {
    setEditorPermissionsSheetOpen(false);
    setEditorPermissionBusyCode(null);
  };

  const toggleEditorPermission = async (code: string, enabled: boolean) => {
    if (!canEdit(EDIT_PERMISSION.staff)) {
      setToast('Нет прав на редактирование сотрудников');
      return;
    }
    if (!editingStaffId) {
      return;
    }
    setEditorPermissionBusyCode(code);
    try {
      if (enabled) {
        await api.grantStaffPermission(editingStaffId, code);
        setEditorPermissionCodes((prev) => (prev.includes(code) ? prev : [...prev, code]));
      } else {
        await api.revokeStaffPermission(editingStaffId, code);
        setEditorPermissionCodes((prev) => prev.filter((value) => value !== code));
      }

      setSession((prev) => {
        if (!prev || prev.staff.id !== editingStaffId) {
          return prev;
        }
        const current = Array.isArray(prev.staff.permissions) ? prev.staff.permissions : [];
        const next = enabled
          ? Array.from(new Set([...current, code]))
          : current.filter((value) => value !== code);
        return {
          ...prev,
          staff: {
            ...prev.staff,
            permissions: next,
          },
        };
      });
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setEditorPermissionBusyCode(null);
    }
  };

  const fetchStaffWorkingHours = async (staffId: string) => {
    try {
      const data = await api.get<unknown>(`/schedule/staff/${staffId}/working-hours`);
      return parseWorkingHours(data);
    } catch {
      return workingHoursByStaff[staffId] ?? {};
    }
  };

  const putStaffWorkingHours = async (
    staffId: string,
    hours: Record<number, string[]>,
  ) => {
    const flatItems = toFlatWorkingHours(hours);
    const payloads: unknown[] = [
      { items: flatItems },
      flatItems,
      { workingHours: flatItems },
    ];
    let lastError: unknown = null;
    for (const payload of payloads) {
      try {
        await api.put<unknown>(`/schedule/staff/${staffId}/working-hours`, payload);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };

  const openScheduleEditorForStaff = async (item: StaffItem) => {
    if (!canEdit(EDIT_PERMISSION.schedule)) {
      setToast('Нет прав на редактирование графика');
      return;
    }
    if (item.role === 'OWNER') {
      return;
    }
    setScheduleEditorStaff(item);
    setScheduleEditorDays([]);
    setScheduleEditorStart('10:00');
    setScheduleEditorEnd('18:00');
    setPage('scheduleEditor');

    setLoadingKey(setLoading, 'action', true);
    try {
      const hours = await fetchStaffWorkingHours(item.id);
      const days = Object.entries(hours)
        .filter(([_, slots]) => slots.length > 0)
        .map(([day]) => Number(day))
        .filter((day) => Number.isFinite(day) && day >= 1 && day <= 7)
        .sort((a, b) => a - b);

      const { start, end } = deriveEditorTimes(hours, days);

      setScheduleEditorDays(days);
      setScheduleEditorStart(start);
      setScheduleEditorEnd(end);
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const closeScheduleEditor = () => {
    setPage('tabs');
    setTab('schedule');
    setScheduleEditorStaff(null);
    setScheduleEditorDays([]);
    setScheduleEditorStart('10:00');
    setScheduleEditorEnd('18:00');
  };

  const toggleScheduleEditorDay = (day: number) => {
    if (day < 1 || day > 7) {
      return;
    }
    setScheduleEditorDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((item) => item !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const applyScheduleEditorPreset = (value: string) => {
    const parsed = parseSlot(value);
    if (!parsed) {
      return;
    }
    setScheduleEditorStart(parsed.start);
    setScheduleEditorEnd(parsed.end);
  };

  const saveScheduleEditor = async () => {
    if (!canEdit(EDIT_PERMISSION.schedule)) {
      setToast('Нет прав на редактирование графика');
      return;
    }
    if (!scheduleEditorStaff) {
      setToast('Сотрудник не выбран');
      return;
    }
    if (!isValidTime(scheduleEditorStart) || !isValidTime(scheduleEditorEnd)) {
      setToast('Время в формате HH:mm');
      return;
    }
    if (scheduleEditorStart >= scheduleEditorEnd) {
      setToast('Время окончания должно быть позже начала');
      return;
    }
    if (scheduleEditorDays.length === 0) {
      setToast('Выберите рабочие дни');
      return;
    }

    const next: Record<number, string[]> = {};
    scheduleEditorDays.forEach((day) => {
      next[day] = [`${scheduleEditorStart}-${scheduleEditorEnd}`];
    });

    setLoadingKey(setLoading, 'action', true);
    try {
      await putStaffWorkingHours(scheduleEditorStaff.id, next);
      await loadWorkingHours(staff);
      setToast('График сохранен');
      closeScheduleEditor();
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const clearScheduleEditor = async () => {
    if (!canEdit(EDIT_PERMISSION.schedule)) {
      setToast('Нет прав на редактирование графика');
      return;
    }
    if (!scheduleEditorStaff) {
      return;
    }
    const confirmed = window.confirm('Очистить график сотрудника полностью?');
    if (!confirmed) {
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      await putStaffWorkingHours(scheduleEditorStaff.id, {});
      await loadWorkingHours(staff);
      setScheduleEditorDays([]);
      setToast('График очищен');
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleOpenJournalStaffActions = (item: StaffItem) => {
    if (item.role === 'OWNER') {
      return;
    }
    setJournalActionStaff(item);
  };

  const handleCloseJournalStaffActions = () => {
    setJournalActionStaff(null);
  };

  const handleOpenJournalDayEditPage = () => {
    if (!canEdit(EDIT_PERMISSION.schedule)) {
      setToast('Нет прав на редактирование графика');
      return;
    }
    if (!journalActionStaff) {
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    void (async () => {
      try {
        const day = toISODay(selectedDate);
        const hours = await fetchStaffWorkingHours(journalActionStaff.id);
        const daySlots = hours[day] ?? [];
        const firstSlot = daySlots.length > 0 ? parseSlot(daySlots[0]) : null;
        setJournalDayStart(firstSlot?.start || '10:00');
        setJournalDayEnd(firstSlot?.end || '18:00');
        setPage('journalDayEdit');
      } finally {
        setLoadingKey(setLoading, 'action', false);
      }
    })();
  };

  const handleOpenJournalDayRemovePage = () => {
    if (!canEdit(EDIT_PERMISSION.schedule)) {
      setToast('Нет прав на редактирование графика');
      return;
    }
    if (!journalActionStaff) {
      return;
    }
    setPage('journalDayRemove');
  };

  const handleOpenJournalSchedulePage = () => {
    setJournalActionStaff(null);
    setPage('tabs');
    setTab('schedule');
  };

  const handleBackFromJournalDayAction = () => {
    setPage('tabs');
    setTab('journal');
    setJournalActionStaff(null);
  };

  const updateStaffScheduleForSelectedDay = async (slots: string[]) => {
    const target = journalActionStaff;
    if (!target) {
      setToast('Сотрудник не выбран');
      return false;
    }
    const day = toISODay(selectedDate);
    setLoadingKey(setLoading, 'action', true);
    try {
      const current = await fetchStaffWorkingHours(target.id);
      const next: Record<number, string[]> = { ...current };
      if (slots.length === 0) {
        delete next[day];
      } else {
        next[day] = slots;
      }
      await putStaffWorkingHours(target.id, next);
      await loadWorkingHours(staff);
      return true;
    } catch (error) {
      setToast(toErrorMessage(error));
      return false;
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleSaveJournalDayEdit = async () => {
    if (!canEdit(EDIT_PERMISSION.schedule)) {
      setToast('Нет прав на редактирование графика');
      return;
    }
    if (!isValidTime(journalDayStart) || !isValidTime(journalDayEnd)) {
      setToast('Время в формате HH:mm');
      return;
    }
    if (journalDayStart >= journalDayEnd) {
      setToast('Время окончания должно быть позже начала');
      return;
    }
    const success = await updateStaffScheduleForSelectedDay([
      `${journalDayStart}-${journalDayEnd}`,
    ]);
    if (!success) {
      return;
    }
    setToast('График на день обновлен');
    setJournalActionStaff(null);
    setPage('tabs');
    setTab('journal');
  };

  const handleSaveJournalDayRemove = async () => {
    if (!canEdit(EDIT_PERMISSION.schedule)) {
      setToast('Нет прав на редактирование графика');
      return;
    }
    const success = await updateStaffScheduleForSelectedDay([]);
    if (!success) {
      return;
    }
    setToast('Сотрудник удален из графика на день');
    setJournalActionStaff(null);
    setPage('tabs');
    setTab('journal');
  };

  const handleTabChange = (next: TabKey) => {
    if (!visibleTabKeys.includes(next)) {
      setToast('Нет доступа к разделу');
      return;
    }
    closeStaffForm();
    setClientActionsFor(null);
    setJournalActionStaff(null);
    setScheduleEditorStaff(null);
    setScheduleEditorDays([]);
    setScheduleEditorStart('10:00');
    setScheduleEditorEnd('18:00');
    setJournalDatePickerOpen(false);
    setServiceCategoryEditorId(null);
    setServiceCategoryEditorName('');
    setServiceDraft(EMPTY_SERVICE_DRAFT);
    setServiceProviders([]);
    setServiceAssignableStaff([]);
    setServiceProvidersLoading(false);
    setJournalAppointmentTarget(null);
    setJournalClientTarget(null);
    setJournalClientDraft({
      name: '',
      phone: '',
      email: '',
      comment: '',
    });
    setJournalClientHistory([]);
    setJournalClientLoading(false);
    setJournalClientSaving(false);
    if (next !== 'clients') {
      setClientHistoryTarget(null);
      setClientHistoryAppointments([]);
    }
    setPage('tabs');
    setTab(next);
  };

  const loadAppointmentsForSelectedDate = async () => {
    await Promise.all([
      loadAppointments(selectedDate),
      loadJournalListAppointments(),
      loadJournalMarkedDates(selectedDate),
    ]);
  };

  const loadClientsByDebouncedQuery = async () => {
    await loadClients(debouncedClientsQuery);
  };

  const resetAndLoadClients = async () => {
    setClientsQuery('');
    await loadClients('');
  };

  const journalCards = useMemo<JournalCard[]>(() => {
    const staffById = new Map(journalStaff.map((item, index) => [item.id, index]));
    const staffByName = new Map(
      journalStaff.map((item, index) => [item.name.trim().toLowerCase(), index]),
    );
    return appointments
      .map((item) => {
        let column = staffById.get(item.staffId);
        if (column === undefined && item.staffName.trim()) {
          column = staffByName.get(item.staffName.trim().toLowerCase());
        }
        if (column === undefined) {
          return null;
        }
        const left =
          JOURNAL_TIME_COLUMN_WIDTH +
          JOURNAL_GRID_GAP +
          column * (JOURNAL_CARD_COLUMN_WIDTH + JOURNAL_GRID_GAP);
        const startDecimal = item.startAt.getHours() + item.startAt.getMinutes() / 60;
        const endDecimal = item.endAt.getHours() + item.endAt.getMinutes() / 60;
        const clampedStart = Math.max(startDecimal, journalBounds.startHour);
        const clampedEnd = Math.min(endDecimal, journalBounds.endHour + 1);
        const top = (clampedStart - journalBounds.startHour) * HOUR_HEIGHT + 8;
        const height = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT, 62);
        return {
          ...item,
          left,
          top,
          height,
          timeLabel: `${formatTime(item.startAt)}-${formatTime(item.endAt)}`,
          topTone: item.status === 'CONFIRMED' || item.status === 'ARRIVED' ? 'green' : 'violet',
        };
      })
      .filter(Boolean) as JournalCard[];
  }, [appointments, journalBounds.endHour, journalBounds.startHour, journalStaff]);

  return {
    state: {
      page,
      tab,
      session,
      selectedDate,
      weekDates,
      staff,
      visibleStaff,
      journalStaff,
      filteredStaff,
      staffSearch,
      staffFilter,
      staffServiceCounts,
      clients,
      clientsQuery,
      services,
      serviceCategories,
      filteredServiceCategories,
      selectedServiceCategoryId,
      selectedServiceCategoryName,
      selectedCategoryServices,
      filteredSelectedCategoryServices,
      servicesCategorySearch,
      servicesItemsSearch,
      serviceCategoryEditorId,
      serviceCategoryEditorName,
      serviceDraft,
      serviceProviders,
      serviceAssignableStaff,
      serviceProvidersLoading,
      scheduleEditorStaff,
      scheduleEditorDays,
      scheduleEditorStart,
      scheduleEditorEnd,
      appointments,
      journalListAppointments,
      journalCards,
      notifications,
      workingHoursByStaff,
      journalHours,
      panel,
      toast,
      appError,
      authPhone,
      authPin,
      authError,
      loading,
      moreMenu,
      visibleTabs,
      clientActionsFor,
      clientHistoryTarget,
      clientHistoryAppointments,
      clientHistoryLoading,
      journalAppointmentTarget,
      journalClientTarget,
      journalClientDraft,
      journalClientHistory,
      journalClientLoading,
      journalClientSaving,
      staffFormMode,
      staffDraft,
      editorAccessEnabled,
      editorServiceCount,
      editorServiceNames,
      staffServicesEditorQuery,
      staffServicesEditorSelectedIds,
      filteredStaffServicesForEditor,
      ownerDraft,
      ownerCanEdit: canEditOwnProfile,
      ownerAvatarPreviewUrl,
      journalDatePickerOpen,
      journalMarkedDates,
      journalActionStaff,
      journalDayStart,
      journalDayEnd,
      staffAvatarPreviewUrl,
      serviceImagePreviewUrl,
      staffAvatarServerDirHint,
      serviceImageServerDirHint,
      editorPermissionsSheetOpen,
      editorPermissionCatalog,
      editorPermissionCodes,
      editorPermissionBusyCode,
      canEditClients: canEdit(EDIT_PERMISSION.clients),
      canEditJournal: canEdit(EDIT_PERMISSION.journal),
      canEditPrivacyPolicy,
      settingsClientCancelMinNoticeMinutes,
      privacyPolicyText,
    },
    actions: {
      setAuthPhone,
      setAuthPin,
      handleLogin,
      handleSetPin,
      handleRequestPinReset,
      handleConfirmPinReset,
      handleLogout,
      setClientsQuery,
      setSelectedDate,
      setStaffSearch,
      setStaffFilter,
      setStaffDraft,
      setOwnerDraft,
      setEditorAccessEnabled,
      setTab,
      setPanel,
      closePanel: () => setPanel(null),
      handleTabChange,
      refreshAll,
      loadAppointmentsForSelectedDate,
      loadClientsByDebouncedQuery,
      resetAndLoadClients,
      openStaffCreate,
      openStaffEdit,
      backFromStaffEditor,
      closeStaffServicesEditor,
      backFromStaffList,
      closeOwnerPage,
      closePrivacyPolicyPage,
      handleOpenOwnerEditor,
      handleSaveOwner,
      handleCreateStaff,
      handleUpdateStaff,
      handleFireStaff,
      refreshStaffAndMeta,
      handleOpenClientActions,
      handleCloseClientActions,
      handleOpenClientHistory,
      handleOpenClientLoyalty,
      handleCloseClientHistory,
      handleOpenJournalAppointment,
      handleCloseJournalAppointment,
      handleUpdateJournalAppointmentStatus,
      handleOpenJournalClient,
      handleCloseJournalClient,
      setJournalClientDraft,
      handleSaveJournalClient,
      handleCallJournalClient,
      handleSmsJournalClient,
      handleWhatsAppJournalClient,
      handleCallClient,
      handleSmsClient,
      handleWhatsAppClient,
      handleDeleteClient,
      handleImportClientsFromContacts,
      handleSetDate,
      closeJournalDatePicker,
      selectJournalDate,
      handleCreateAppointment,
      handleScheduleEdit,
      openScheduleEditorForStaff,
      closeScheduleEditor,
      toggleScheduleEditorDay,
      setScheduleEditorStart,
      setScheduleEditorEnd,
      applyScheduleEditorPreset,
      saveScheduleEditor,
      clearScheduleEditor,
      handleMoreAction,
      openEditorServicesPanel,
      setStaffServicesEditorQuery,
      toggleStaffServiceSelection,
      toggleStaffServiceCategorySelection,
      saveStaffServicesEditor,
      openEditorPermissionsPanel,
      closeEditorPermissionsPanel,
      toggleEditorPermission,
      handleOpenJournalStaffActions,
      handleCloseJournalStaffActions,
      handleOpenJournalDayEditPage,
      handleOpenJournalDayRemovePage,
      handleOpenJournalSchedulePage,
      handleBackFromJournalDayAction,
      setJournalDayStart,
      setJournalDayEnd,
      handleSaveJournalDayEdit,
      handleSaveJournalDayRemove,
      setServicesCategorySearch,
      setServicesItemsSearch,
      openServicesPage,
      closeClientSiteEditor,
      closeServicesPage,
      openServiceCategory,
      closeServiceCategory,
      openServiceCategoryEditor,
      closeServiceCategoryEditor,
      setServiceCategoryEditorName,
      saveServiceCategoryEditor,
      deleteServiceCategoryEditor,
      openServiceEditor,
      openServiceCreateForCategory,
      closeServiceEditor,
      setServiceDraft,
      toggleServiceActiveInline,
      syncServiceProvidersForCurrentService,
      removeServiceProviderFromCurrentService,
      saveServiceEditor,
      deleteServiceEditor,
      handleSelectStaffAvatarFile,
      handleDeleteStaffAvatar,
      handleSelectOwnerAvatarFile,
      handleDeleteOwnerAvatar,
      handleSelectServiceImageFile,
      savePrivacyPolicy,
    },
  };
}
