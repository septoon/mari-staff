import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { api } from '../../api';
import {
  monthRange,
  setLoadingKey,
  toErrorMessage,
  toISODate,
  toNumber,
  toRecord,
  toString,
} from '../helpers';
import {
  extractItems,
  parseAppointment,
  parseClient,
  parseScheduleCalendar,
  parseServiceCategory,
  parseService,
  parseStaff,
} from '../parsers';
import type {
  AppointmentItem,
  ClientItem,
  LoadingState,
  SettingsNotificationSection,
  ServiceCategoryItem,
  ServiceItem,
  StaffItem,
  StaffRole,
  WorkingHoursMap,
} from '../types';

type UseDataLoadersParams = {
  isAuthorized: boolean;
  sessionRole: StaffRole | null;
  sessionStaffId: string | null;
  sessionStaffName: string | null;
  useFullJournalEndpoint: boolean;
  canViewStaff: boolean;
  canViewServices: boolean;
  canViewClients: boolean;
  canViewJournal: boolean;
  canViewSchedule: boolean;
  canViewReports: boolean;
  journalVisibleStaffIdsKey: string;
  selectedDate: Date;
  debouncedClientsQuery: string;
  setLoading: Dispatch<SetStateAction<LoadingState>>;
  setAppError: (value: string) => void;
  setStaff: (value: StaffItem[]) => void;
  setServices: (value: ServiceItem[]) => void;
  setLocalServiceCategories: (value: ServiceCategoryItem[]) => void;
  setStaffServiceCounts: (value: Record<string, number>) => void;
  setEditorServiceCount: (value: number) => void;
  setEditorServiceNames: (value: string[]) => void;
  setToast: (value: string) => void;
  setClients: (value: ClientItem[]) => void;
  setAppointments: (value: AppointmentItem[]) => void;
  setJournalListAppointments: (value: AppointmentItem[]) => void;
  setJournalMarkedDates: (value: string[]) => void;
  setWorkingHoursByStaff: (value: WorkingHoursMap) => void;
  setSettingsClientCancelMinNoticeMinutes: (value: number | null) => void;
  setSettingsNotificationMinNoticeMinutes: (value: number | null) => void;
  setSettingsNotificationSections: (value: SettingsNotificationSection[]) => void;
  setPrivacyPolicyText: (value: string) => void;
};

type SettingsPayload = {
  clientCancelMinNoticeMinutes: number | null;
  notificationMinNoticeMinutes: number | null;
  notificationSections: SettingsNotificationSection[];
  privacyPolicyText: string;
};

export function useDataLoaders({
  isAuthorized,
  sessionRole,
  sessionStaffId,
  sessionStaffName,
  useFullJournalEndpoint,
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
  setLocalServiceCategories,
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
  setSettingsNotificationMinNoticeMinutes,
  setSettingsNotificationSections,
  setPrivacyPolicyText,
}: UseDataLoadersParams) {
  const canUseStaffDirectory = canViewStaff || canViewJournal || canViewSchedule;
  const buildScheduleRange = (anchor: Date) => {
    const from = new Date(anchor.getFullYear(), anchor.getMonth() - 4, 1);
    const to = new Date(anchor.getFullYear(), anchor.getMonth() + 6, 0);
    return {
      from: toISODate(from),
      to: toISODate(to),
    };
  };

  const loadStaff = useCallback(async () => {
    if (!isAuthorized || !canUseStaffDirectory) {
      setStaff([]);
      return [];
    }
    setLoadingKey(setLoading, 'staff', true);
    try {
      const candidates = [
        '/staff?page=1&limit=200&employmentStatus=all',
        '/staff?page=1&limit=200',
        '/staff',
      ];
      let parsed: StaffItem[] = [];
      for (const path of candidates) {
        try {
          const data = await api.get<unknown>(path);
          parsed = extractItems(data).map(parseStaff).filter(Boolean) as StaffItem[];
          if (parsed.length > 0) {
            break;
          }
        } catch {
          // попробуем следующий вариант запроса
        }
      }
      setStaff(parsed);
      return parsed;
    } catch (error) {
      setAppError(toErrorMessage(error));
      return [];
    } finally {
      setLoadingKey(setLoading, 'staff', false);
    }
  }, [canUseStaffDirectory, isAuthorized, setAppError, setLoading, setStaff]);

  const loadServices = useCallback(async () => {
    if (!isAuthorized || !canViewServices) {
      setServices([]);
      setLocalServiceCategories([]);
      return [];
    }
    setLoadingKey(setLoading, 'services', true);
    try {
      const [servicesData, categoriesData] = await Promise.all([
        api.get<unknown>('/services'),
        api.get<unknown>('/services/categories'),
      ]);
      const parsed = extractItems(servicesData).map(parseService).filter(Boolean) as ServiceItem[];
      const parsedCategories = extractItems(categoriesData)
        .map(parseServiceCategory)
        .filter(Boolean) as ServiceCategoryItem[];
      setServices(parsed);
      setLocalServiceCategories(parsedCategories);
      return parsed;
    } catch (error) {
      setAppError(toErrorMessage(error));
      return [];
    } finally {
      setLoadingKey(setLoading, 'services', false);
    }
  }, [canViewServices, isAuthorized, setAppError, setLoading, setLocalServiceCategories, setServices]);

  const loadStaffServiceMeta = useCallback(
    async (rows: StaffItem[]) => {
      if (!isAuthorized || !canViewStaff || rows.length === 0) {
        setStaffServiceCounts({});
        return;
      }
      try {
        const pairs = await Promise.all(
          rows.map(async (item) => {
            try {
              const data = await api.get<unknown>(`/staff/${item.id}/services`);
              const record = toRecord(data);
              const count =
                toNumber(record?.servicesCount) ?? extractItems(data).length ?? 0;
              return [item.id, count] as const;
            } catch {
              return [item.id, 0] as const;
            }
          }),
        );
        const next: Record<string, number> = {};
        pairs.forEach(([id, count]) => {
          next[id] = count;
        });
        setStaffServiceCounts(next);
      } catch {
        setStaffServiceCounts({});
      }
    },
    [canViewStaff, isAuthorized, setStaffServiceCounts],
  );

  const loadStaffServicesForEditor = useCallback(async (staffId: string) => {
    if (!canViewStaff) {
      setEditorServiceCount(0);
      setEditorServiceNames([]);
      return;
    }
    try {
      const data = await api.get<unknown>(`/staff/${staffId}/services`);
      const record = toRecord(data);
      const items = extractItems(data).map(parseService).filter(Boolean) as ServiceItem[];
      setEditorServiceCount(toNumber(record?.servicesCount) ?? items.length);
      setEditorServiceNames(items.map((item) => item.name));
    } catch (error) {
      setEditorServiceCount(0);
      setEditorServiceNames([]);
      setToast(toErrorMessage(error));
    }
  }, [canViewStaff, setEditorServiceCount, setEditorServiceNames, setToast]);

  const loadClients = useCallback(
    async (search = '') => {
      if (!isAuthorized || !canViewClients) {
        setClients([]);
        return;
      }
      setLoadingKey(setLoading, 'clients', true);
      try {
        const params = new URLSearchParams({
          page: '1',
          limit: '200',
        });
        const normalizedSearch = search.trim();
        if (normalizedSearch.length > 0) {
          params.set('search', normalizedSearch);
        }
        const data = await api.get<unknown>(`/clients?${params.toString()}`);
        const parsed = extractItems(data).map(parseClient).filter(Boolean) as ClientItem[];
        setClients(parsed);
      } catch (error) {
        setAppError(toErrorMessage(error));
      } finally {
        setLoadingKey(setLoading, 'clients', false);
      }
    },
    [canViewClients, isAuthorized, setAppError, setClients, setLoading],
  );

  const appointmentsBasePath =
    sessionRole === 'MASTER' && !useFullJournalEndpoint ? '/master/appointments' : '/appointments';

  const fetchAppointmentsRange = useCallback(
    async ({
      from,
      to,
      maxPages = 20,
    }: {
      from?: string;
      to?: string;
      maxPages?: number;
    }) => {
      const limit = 100;
      const merged: AppointmentItem[] = [];
      let page = 1;

      while (page <= maxPages) {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (from) {
          params.set('from', from);
        }
        if (to) {
          params.set('to', to);
        }
        const data = await api.get<unknown>(`${appointmentsBasePath}?${params.toString()}`);
        const parsed = extractItems(data).map(parseAppointment).filter(Boolean) as AppointmentItem[];
        const normalized = parsed.map((item) => {
          if (item.staffId) {
            return item;
          }
          if (sessionRole === 'MASTER' && sessionStaffId) {
            return {
              ...item,
              staffId: sessionStaffId,
              staffName: sessionStaffName || item.staffName,
            };
          }
          return item;
        });
        merged.push(...normalized);

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

      return merged;
    },
    [appointmentsBasePath, sessionRole, sessionStaffId, sessionStaffName],
  );

  const loadAppointments = useCallback(
    async (date: Date) => {
      if (!isAuthorized || !canViewJournal) {
        setAppointments([]);
        return;
      }
      setLoadingKey(setLoading, 'appointments', true);
      try {
        const dayFrom = toISODate(date);
        const parsed = await fetchAppointmentsRange({ from: dayFrom, to: dayFrom, maxPages: 10 });
        setAppointments(parsed);
      } catch (error) {
        setAppError(toErrorMessage(error));
      } finally {
        setLoadingKey(setLoading, 'appointments', false);
      }
    },
    [canViewJournal, fetchAppointmentsRange, isAuthorized, setAppError, setAppointments, setLoading],
  );

  const loadJournalListAppointments = useCallback(async () => {
    if (!isAuthorized || !canViewJournal) {
      setJournalListAppointments([]);
      return;
    }
    setLoadingKey(setLoading, 'appointments', true);
    try {
      // Backend can return 200 with an empty payload for `/appointments` without an explicit date range.
      // For the journal list we always request a wide bounded range to keep desktop history stable.
      const now = new Date();
      const from = new Date(now.getFullYear() - 3, 0, 1);
      const to = new Date(now.getFullYear() + 1, 11, 31);
      const parsed = await fetchAppointmentsRange({
        from: toISODate(from),
        to: toISODate(to),
        maxPages: 60,
      });
      parsed.sort((left, right) => {
        const createdDiff = right.createdAt.getTime() - left.createdAt.getTime();
        if (createdDiff !== 0) {
          return createdDiff;
        }
        return right.startAt.getTime() - left.startAt.getTime();
      });
      setJournalListAppointments(parsed);
    } catch (error) {
      setAppError(toErrorMessage(error));
    } finally {
      setLoadingKey(setLoading, 'appointments', false);
    }
  }, [
    canViewJournal,
    fetchAppointmentsRange,
    isAuthorized,
    setAppError,
    setJournalListAppointments,
    setLoading,
  ]);

  const loadJournalMarkedDates = useCallback(
    async (date: Date) => {
      if (!isAuthorized || !canViewJournal) {
        setJournalMarkedDates([]);
        return;
      }
      try {
        const from = new Date(date.getFullYear(), date.getMonth(), 1);
        const to = new Date(date.getFullYear(), date.getMonth() + 2, 0);
        const parsed = await fetchAppointmentsRange({
          from: toISODate(from),
          to: toISODate(to),
          maxPages: 40,
        });
        const allowedStaffIds = new Set(
          journalVisibleStaffIdsKey
            .split('|')
            .map((value) => value.trim())
            .filter(Boolean),
        );
        const filtered = allowedStaffIds.size
          ? parsed.filter((item) => allowedStaffIds.has(item.staffId))
          : parsed;
        const days = Array.from(new Set(filtered.map((item) => toISODate(item.startAt))));
        setJournalMarkedDates(days);
      } catch {
        setJournalMarkedDates([]);
      }
    },
    [
      canViewJournal,
      fetchAppointmentsRange,
      isAuthorized,
      journalVisibleStaffIdsKey,
      setJournalMarkedDates,
    ],
  );

  const loadSettings = useCallback(async () => {
    if (!isAuthorized) {
      setSettingsClientCancelMinNoticeMinutes(null);
      setSettingsNotificationMinNoticeMinutes(null);
      setSettingsNotificationSections([]);
      setPrivacyPolicyText('');
      return null;
    }
    setLoadingKey(setLoading, 'settings', true);
    try {
      const data = await api.get<unknown>('/settings/staff');
      const asRecord = toRecord(data);
      const policyRecord = toRecord(asRecord?.clientCancelPolicy) ?? toRecord(asRecord?.cancelPolicy);
      const minNotice = toNumber(policyRecord?.minNoticeMinutes);
      const notificationsRecord = toRecord(asRecord?.notifications);
      const notificationMinNotice = toNumber(
        notificationsRecord?.minNoticeMinutes ?? asRecord?.notificationMinNoticeMinutes,
      );
      const rawSections = Array.isArray(notificationsRecord?.sections)
        ? (notificationsRecord?.sections as unknown[])
        : [];
      const notificationSections = rawSections
        .map((section) => {
          const sectionRecord = toRecord(section);
          const rawGroups = Array.isArray(sectionRecord?.groups)
            ? (sectionRecord?.groups as unknown[])
            : [];
          const groups = rawGroups
            .map((group) => {
              const groupRecord = toRecord(group);
              const rawItems = Array.isArray(groupRecord?.items)
                ? (groupRecord?.items as unknown[])
                : [];
              const items = rawItems
                .map((item) => {
                  const itemRecord = toRecord(item);
                  const id = toString(itemRecord?.id);
                  const title = toString(itemRecord?.title);
                  if (!id || !title) {
                    return null;
                  }
                  return {
                    id,
                    title,
                    enabled: Boolean(itemRecord?.enabled),
                    channel: 'email' as const,
                    channelLabel: toString(itemRecord?.channelLabel) || 'Эл. почта',
                  };
                })
                .filter(Boolean);
              const id = toString(groupRecord?.id);
              if (!id || items.length === 0) {
                return null;
              }
              return {
                id,
                title: toString(groupRecord?.title),
                items,
              };
            })
            .filter(Boolean);
          const id = toString(sectionRecord?.id);
          const title = toString(sectionRecord?.title);
          if (!id || !title || groups.length === 0) {
            return null;
          }
          return {
            id,
            title,
            groups,
          };
        })
        .filter(Boolean) as SettingsNotificationSection[];
      const privacyPolicyRecord = toRecord(asRecord?.privacyPolicy);
      const privacyPolicyText = toString(privacyPolicyRecord?.content) || toString(asRecord?.privacyPolicy);
      const nextSettings: SettingsPayload = {
        clientCancelMinNoticeMinutes: minNotice ?? null,
        notificationMinNoticeMinutes: notificationMinNotice ?? null,
        notificationSections,
        privacyPolicyText,
      };
      setSettingsClientCancelMinNoticeMinutes(nextSettings.clientCancelMinNoticeMinutes);
      setSettingsNotificationMinNoticeMinutes(nextSettings.notificationMinNoticeMinutes);
      setSettingsNotificationSections(nextSettings.notificationSections);
      setPrivacyPolicyText(nextSettings.privacyPolicyText);
      return nextSettings;
    } catch (error) {
      setAppError(toErrorMessage(error));
      return null;
    } finally {
      setLoadingKey(setLoading, 'settings', false);
    }
  }, [
    isAuthorized,
    setAppError,
    setLoading,
    setPrivacyPolicyText,
    setSettingsClientCancelMinNoticeMinutes,
    setSettingsNotificationMinNoticeMinutes,
    setSettingsNotificationSections,
  ]);

  const loadReports = useCallback(async (params?: { from?: string; to?: string; masterId?: string | null }) => {
    if (!isAuthorized || !canViewReports) {
      return null;
    }
    setLoadingKey(setLoading, 'reports', true);
    try {
      const [defaultFrom, defaultTo] = monthRange(selectedDate);
      const from = params?.from || defaultFrom;
      const to = params?.to || defaultTo;
      const data = await api.getAnalyticsOverview({
        from,
        to,
        masterId: params?.masterId || null,
      });
      return toRecord(data);
    } catch (error) {
      setAppError(toErrorMessage(error));
      return null;
    } finally {
      setLoadingKey(setLoading, 'reports', false);
    }
  }, [canViewReports, isAuthorized, selectedDate, setAppError, setLoading]);

  const loadWorkingHours = useCallback(
    async (staffRows: StaffItem[]) => {
      if (!isAuthorized || !canViewSchedule) {
        setWorkingHoursByStaff({});
        return;
      }
      let scheduleStaff = staffRows.filter((item) => item.role === 'MASTER' && item.isActive);
      if (scheduleStaff.length === 0) {
        try {
          const data = await api.get<unknown>('/staff?page=1&limit=200&role=MASTER&isActive=true');
          const parsed = extractItems(data).map(parseStaff).filter(Boolean) as StaffItem[];
          if (parsed.length > 0) {
            scheduleStaff = parsed;
          }
        } catch {
          // fallback на уже загруженный список staff
        }
      }
      if (scheduleStaff.length === 0) {
        setWorkingHoursByStaff({});
        return;
      }
      const { from, to } = buildScheduleRange(selectedDate);
      const hasSlots = (hours: Record<string, string[]>) =>
        Object.values(hours).some((slots) => slots.length > 0);

      setLoadingKey(setLoading, 'schedule', true);
      try {
        const responses = await Promise.all(
          scheduleStaff.map(async (item) => {
            try {
              const data = await api.get<unknown>(
                `/schedule/staff/${item.id}/working-hours?from=${from}&to=${to}`,
              );
              const parsed = parseScheduleCalendar(data);
              return [item.id, hasSlots(parsed) ? parsed : {} as Record<string, string[]>] as const;
            } catch {
              return [item.id, {} as Record<string, string[]>] as const;
            }
          }),
        );
        const merged: WorkingHoursMap = {};
        responses.forEach(([staffId, value]) => {
          merged[staffId] = value;
        });
        setWorkingHoursByStaff(merged);
      } finally {
        setLoadingKey(setLoading, 'schedule', false);
      }
    },
    [canViewSchedule, isAuthorized, selectedDate, setLoading, setWorkingHoursByStaff],
  );

  const refreshStaffAndMeta = useCallback(async () => {
    const rows = await loadStaff();
    await loadStaffServiceMeta(rows);
  }, [loadStaff, loadStaffServiceMeta]);

  const refreshAll = useCallback(async () => {
    if (!isAuthorized) {
      return;
    }
    setAppError('');
    const rows = canUseStaffDirectory ? await loadStaff() : [];
    await Promise.all([
      canViewClients ? loadClients(debouncedClientsQuery) : Promise.resolve(),
      canViewServices ? loadServices() : Promise.resolve([]),
      canViewJournal ? loadAppointments(selectedDate) : Promise.resolve(),
      canViewJournal ? loadJournalListAppointments() : Promise.resolve(),
      canViewJournal ? loadJournalMarkedDates(selectedDate) : Promise.resolve(),
      loadSettings(),
    ]);
    if (canViewSchedule) {
      await loadWorkingHours(rows);
    } else {
      setWorkingHoursByStaff({});
    }
  }, [
    canUseStaffDirectory,
    canViewClients,
    canViewJournal,
    canViewSchedule,
    canViewServices,
    debouncedClientsQuery,
    isAuthorized,
    loadAppointments,
    loadClients,
    loadJournalListAppointments,
    loadJournalMarkedDates,
    loadServices,
    loadSettings,
    loadStaff,
    loadWorkingHours,
    selectedDate,
    setAppError,
    setWorkingHoursByStaff,
  ]);

  return {
    loadStaff,
    loadServices,
    loadStaffServiceMeta,
    loadStaffServicesForEditor,
    loadClients,
    loadAppointments,
    loadJournalListAppointments,
    loadJournalMarkedDates,
    loadSettings,
    loadReports,
    loadWorkingHours,
    refreshStaffAndMeta,
    refreshAll,
  };
}
