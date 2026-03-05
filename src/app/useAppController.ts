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
  JOURNAL_END_HOUR,
  JOURNAL_START_HOUR,
  MORE_MENU,
  SESSION_STORAGE_KEY,
} from './constants';
import {
  asArray,
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

const JOURNAL_TIME_COLUMN_WIDTH = 72;
const JOURNAL_CARD_COLUMN_WIDTH = 160;
const JOURNAL_GRID_GAP = 8;

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
    staffAvatarPreviewUrl,
    setStaffAvatarPreviewUrl,
    serviceImagePreviewUrl,
    setServiceImagePreviewUrl,
    staffAvatarWebpBlob,
    setStaffAvatarWebpBlob,
    serviceImageWebpBlob,
    setServiceImageWebpBlob,
    staffAvatarOriginalName,
    setStaffAvatarOriginalName,
    serviceImageOriginalName,
    setServiceImageOriginalName,
    routeSyncSourceRef,
    staffAvatarBlobUrlRef,
    serviceImageBlobUrlRef,
    loading,
    setLoading,
  } = useAppState();
  const pageRef = useRef(page);
  const tabRef = useRef(tab);

  useEffect(() => {
    pageRef.current = page;
    tabRef.current = tab;
  }, [page, tab]);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const isAuthorized = Boolean(session);
  const visibleStaff = useMemo(() => staff.filter((item) => item.role !== 'OWNER'), [staff]);
  const journalHours = useMemo(() => {
    const hours: string[] = [];
    for (let hour = JOURNAL_START_HOUR; hour <= JOURNAL_END_HOUR; hour += 1) {
      hours.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return hours;
  }, []);

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
    const withoutOwner = staff.filter((item) => item.role !== 'OWNER');
    const filteredByFlags = withoutOwner.filter((item) => {
      if (staffFilter.withAccess && !item.isActive) {
        return false;
      }
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
  }, [staff, staffFilter.withAccess, staffFilter.withServices, staffSearch, staffServiceCounts]);

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
  }, [
    clearBlobPreview,
    setStaffAvatarOriginalName,
    setStaffAvatarPreviewUrl,
    setStaffAvatarWebpBlob,
    staffAvatarBlobUrlRef,
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
      if (serviceImageBlobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(serviceImageBlobUrlRef.current);
      }
    };
  }, [serviceImageBlobUrlRef, staffAvatarBlobUrlRef]);

  const {
    loadStaff,
    loadServices,
    loadStaffServiceMeta,
    loadStaffServicesForEditor,
    loadClients,
    loadAppointments,
    loadJournalMarkedDates,
    loadSettings,
    loadReports,
    loadWorkingHours,
    refreshStaffAndMeta,
    refreshAll,
  } = useDataLoaders({
    isAuthorized,
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
    setJournalMarkedDates,
    setWorkingHoursByStaff,
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

      try {
        const parsed = JSON.parse(raw) as StaffSession;
        api.setSession(parsed);
        const refreshed = await api.refresh();
        setSession(refreshed);
      } catch {
        api.clearSession();
        localStorage.removeItem(SESSION_STORAGE_KEY);
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
    if (!isAuthorized) {
      return;
    }
    void refreshAll();
  }, [isAuthorized, refreshAll]);

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
    void loadReports();
  }, [isAuthorized, loadAppointments, loadReports, selectedDate]);

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }
    void loadJournalMarkedDates(selectedDate);
  }, [isAuthorized, loadJournalMarkedDates, selectedDate]);

  useEffect(() => {
    if (!isAuthorized || staff.length === 0) {
      return;
    }
    void loadWorkingHours(staff);
  }, [isAuthorized, loadWorkingHours, staff]);

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
    resetStaffAvatarState();
  }, [
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
      setTab('journal');
      setToast('Вы вошли в систему');
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
      setTab('journal');
      setToast('PIN установлен, вход выполнен');
    } catch (error) {
      setAuthError(toErrorMessage(error));
      throw error;
    } finally {
      setLoadingKey(setLoading, 'auth', false);
    }
  };

  const handleRequestPinReset = async (phone: string) => {
    setAuthError('');
    setLoadingKey(setLoading, 'auth', true);
    try {
      return await api.requestStaffPinReset(phone.trim());
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
      setTab('journal');
      setToast('PIN сброшен, вход выполнен');
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
      resetStaffAvatarState();
      resetServiceImageState();
      setToast('Сессия завершена');
    }
  };

  const openStaffCreate = () => {
    setEditingStaffId(null);
    setStaffDraft(EMPTY_STAFF_DRAFT);
    setEditorAccessEnabled(true);
    setOriginalEditRole(DEFAULT_STAFF_ROLE);
    setEditorServiceCount(0);
    setEditorServiceNames([]);
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
      role: item.role === 'ADMIN' ? 'ADMIN' : 'MASTER',
    });
    setOriginalEditRole(item.role === 'ADMIN' ? 'ADMIN' : 'MASTER');
    setEditorAccessEnabled(item.isActive);
    resetStaffAvatarState();
    setStaffAvatarPreviewUrl(item.avatarUrl || '');
    setStaffFormMode('edit');
    setPage('staffEditor');
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
    setPage('tabs');
    setTab('more');
  };

  const handleOpenOwnerEditor = async () => {
    if (!session) {
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      let rows = staff;
      if (rows.length === 0) {
        rows = await loadStaff();
      }
      const owner = rows.find((item) => item.role === 'OWNER');
      const fallback =
        session.staff.role === 'OWNER'
          ? {
              id: session.staff.id,
              name: session.staff.name,
              role: session.staff.role,
              phoneE164: session.staff.phoneE164,
              email: session.staff.email,
              isActive: true,
              positionName: null,
            }
          : null;
      const target = owner || fallback;
      if (!target) {
        setToast('Владелец не найден');
        return;
      }
      setOwnerEditId(target.id);
      setOwnerDraft({
        name: target.name,
        phone: target.phoneE164 || '',
        email: target.email || '',
        positionName: target.positionName || '',
      });
      setPage('owner');
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleSaveOwner = async () => {
    if (!ownerEditId) {
      setToast('ID владельца не найден');
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
      await api.patch<unknown>(`/staff/${ownerEditId}/contact`, {
        name,
        phone,
        email: ownerDraft.email.trim() ? ownerDraft.email.trim() : null,
        positionName: ownerDraft.positionName.trim() || undefined,
      });
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
      setToast('Данные владельца обновлены');
    } catch (error) {
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleCreateStaff = async () => {
    const name = staffDraft.name.trim();
    const phone = staffDraft.phone.trim();
    if (!name || !phone) {
      setToast('Имя и телефон обязательны');
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      let nextToast = 'Сотрудник создан';
      await api.post<unknown>('/staff/invite', {
        phone,
        name,
        role: staffDraft.role,
        email: staffDraft.email.trim() || undefined,
        positionName: staffDraft.positionName.trim() || undefined,
      });
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
      setToast(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'action', false);
    }
  };

  const handleUpdateStaff = async () => {
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
      if (session?.staff.role === 'OWNER' && staffDraft.role !== originalEditRole) {
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
    if (!editingStaffId) {
      return;
    }
    const confirmed = window.confirm('Уволить сотрудника?');
    if (!confirmed) {
      return;
    }
    setLoadingKey(setLoading, 'action', true);
    try {
      await api.post<unknown>(`/staff/${editingStaffId}/fire`, {
        firedAt: toISODate(new Date()),
      });
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

  const handleOpenClientHistory = async () => {
    const client = clientActionsFor;
    if (!client) {
      return;
    }
    setClientHistoryTarget(client);
    setClientHistoryLoading(true);
    setClientActionsFor(null);
    try {
      const now = new Date();
      const from = new Date(now);
      from.setFullYear(now.getFullYear() - 2);
      const data = await api.get<unknown>(
        `/appointments?page=1&limit=500&from=${toISODate(from)}&to=${toISODate(now)}`,
      );
      const parsed = extractItems(data).map(parseAppointment).filter(Boolean) as AppointmentItem[];
      const filtered = parsed
        .filter((item) => {
          if (item.clientId) {
            return item.clientId === client.id;
          }
          const samePhone =
            normalizePhoneForWhatsApp(item.clientPhone) ===
            normalizePhoneForWhatsApp(client.phone);
          const sameName =
            item.clientName.trim().toLowerCase() === client.name.trim().toLowerCase();
          return samePhone || sameName;
        })
        .sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
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
    const target =
      visibleStaff[0] ||
      staff.find((item) => item.role !== 'OWNER') ||
      null;
    if (!target) {
      setToast('Нет сотрудников');
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

  const uploadStaffAvatarIfNeeded = async (staffId: string) => {
    if (!staffAvatarWebpBlob) {
      return { url: null, warning: '' };
    }
    try {
      const uploaded = await uploadWebpImage({
        scope: 'staff-avatar',
        entityId: staffId,
        webpBlob: staffAvatarWebpBlob,
        originalName: staffAvatarOriginalName,
      });
      setStaffAvatarPreviewUrl(uploaded.url);
      setStaff((prev) =>
        prev.map((item) =>
          item.id === staffId ? { ...item, avatarUrl: uploaded.url } : item,
        ),
      );
      return { url: uploaded.url, warning: '' };
    } catch (error) {
      const message = toErrorMessage(error);
      if (message.startsWith('UPLOAD_ENDPOINT_NOT_FOUND')) {
        return {
          url: null,
          warning: `Серверный upload endpoint не найден. Проверьте API загрузки и путь: ${getServerMediaDirHint(
            'staff-avatar',
            staffId,
          )}`,
        };
      }
      throw error;
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
      const message = toErrorMessage(error);
      if (message.startsWith('UPLOAD_ENDPOINT_NOT_FOUND')) {
        return {
          url: null,
          warning: `Серверный upload endpoint не найден. Проверьте API загрузки и путь: ${getServerMediaDirHint(
            'service-image',
            serviceId,
          )}`,
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

  const openServiceEditor = (serviceId: string | null) => {
    if (!serviceId) {
      resetServiceImageState();
      setServiceDraft({
        ...EMPTY_SERVICE_DRAFT,
        categoryId: selectedServiceCategoryId || '',
        categoryName: selectedServiceCategoryName || '',
      });
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
      priceMax: found.priceMax || found.priceMin || 0,
      isActive: found.isActive,
    });
    resetServiceImageState();
    setServiceImagePreviewUrl(found.imageUrl || '');
    setPage('serviceEditor');
  };

  const closeServiceEditor = () => {
    setServiceDraft(EMPTY_SERVICE_DRAFT);
    resetServiceImageState();
    setPage('servicesCategory');
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
              priceMax: Math.max(serviceDraft.priceMin, serviceDraft.priceMax),
              isActive: serviceDraft.isActive,
            }
          : item,
      ),
    );
  };

  const saveServiceEditor = async () => {
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
      priceMax: Math.max(
        Math.round(serviceDraft.priceMin),
        Math.round(serviceDraft.priceMax),
      ),
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

  const handleMoreAction = async (title: string) => {
    if (!session) {
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
          closeStaffForm();
          setPage('staff');
          return;
        }
        case 'Услуги': {
          await openServicesPage();
          return;
        }
        case 'Аналитика': {
          const overview = await loadReports();
          if (!overview) {
            setPanel({ title: 'Аналитика', lines: ['Нет данных'] });
            return;
          }
          setPanel({
            title: 'Аналитика',
            lines: [
              `Записей: ${toNumber(overview.appointmentsCount) ?? 0}`,
              `Пришли: ${toNumber(overview.arrivedCount) ?? 0}`,
              `No-show: ${toNumber(overview.noShowCount) ?? 0}`,
              `Отменено: ${toNumber(overview.cancelledCount) ?? 0}`,
            ],
          });
          return;
        }
        case 'Расчет зарплат': {
          const overview = await loadReports();
          const byStaffRaw = asArray(toRecord(overview)?.byStaff);
          const lines = byStaffRaw.map((item) => {
            const record = toRecord(item);
            return `${toString(record?.name) || 'Сотрудник'}: ${
              toNumber(record?.arrivedCount) ?? 0
            } визитов`;
          });
          setPanel({
            title: 'Расчет зарплат',
            lines: lines.length > 0 ? lines : ['Нет данных по сотрудникам'],
          });
          return;
        }
        case 'Онлайн-запись': {
          setTab('journal');
          setToast('Открыт журнал записей');
          return;
        }
        case 'Настройки': {
          const currentNotice = await loadSettings();
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

  const openEditorServicesPanel = () => {
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
    setPanel({
      title: 'Права доступа',
      lines: ['Журнал записи'],
    });
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
    if (!journalActionStaff) {
      return;
    }
    const day = toISODay(selectedDate);
    const daySlots = workingHoursByStaff[journalActionStaff.id]?.[day] ?? [];
    const firstSlot = daySlots.length > 0 ? parseSlot(daySlots[0]) : null;
    setJournalDayStart(firstSlot?.start || '10:00');
    setJournalDayEnd(firstSlot?.end || '18:00');
    setPage('journalDayEdit');
  };

  const handleOpenJournalDayRemovePage = () => {
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
    const staffById = new Map(visibleStaff.map((item, index) => [item.id, index]));
    return appointments
      .filter((item) => staffById.has(item.staffId))
      .map((item) => {
        const column = staffById.get(item.staffId);
        if (column === undefined) {
          return null;
        }
        const left =
          JOURNAL_TIME_COLUMN_WIDTH +
          JOURNAL_GRID_GAP +
          column * (JOURNAL_CARD_COLUMN_WIDTH + JOURNAL_GRID_GAP);
        const startDecimal = item.startAt.getHours() + item.startAt.getMinutes() / 60;
        const endDecimal = item.endAt.getHours() + item.endAt.getMinutes() / 60;
        const clampedStart = Math.max(startDecimal, JOURNAL_START_HOUR);
        const clampedEnd = Math.min(endDecimal, JOURNAL_END_HOUR + 1);
        const top = (clampedStart - JOURNAL_START_HOUR) * HOUR_HEIGHT + 8;
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
  }, [appointments, visibleStaff]);

  return {
    state: {
      page,
      tab,
      session,
      selectedDate,
      weekDates,
      staff,
      visibleStaff,
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
      scheduleEditorStaff,
      scheduleEditorDays,
      scheduleEditorStart,
      scheduleEditorEnd,
      appointments,
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
      moreMenu: MORE_MENU,
      clientActionsFor,
      clientHistoryTarget,
      clientHistoryAppointments,
      clientHistoryLoading,
      staffFormMode,
      staffDraft,
      editorAccessEnabled,
      editorServiceCount,
      editorServiceNames,
      staffServicesEditorQuery,
      staffServicesEditorSelectedIds,
      filteredStaffServicesForEditor,
      ownerDraft,
      journalDatePickerOpen,
      journalMarkedDates,
      journalActionStaff,
      journalDayStart,
      journalDayEnd,
      staffAvatarPreviewUrl,
      serviceImagePreviewUrl,
      staffAvatarServerDirHint,
      serviceImageServerDirHint,
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
      handleCallClient,
      handleSmsClient,
      handleWhatsAppClient,
      handleDeleteClient,
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
      closeServicesPage,
      openServiceCategory,
      closeServiceCategory,
      openServiceCategoryEditor,
      closeServiceCategoryEditor,
      setServiceCategoryEditorName,
      saveServiceCategoryEditor,
      deleteServiceCategoryEditor,
      openServiceEditor,
      closeServiceEditor,
      setServiceDraft,
      saveServiceEditor,
      deleteServiceEditor,
      handleSelectStaffAvatarFile,
      handleSelectServiceImageFile,
    },
  };
}
