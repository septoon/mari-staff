import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { api } from '../../api';
import {
  getWeekDates,
  monthRange,
  setLoadingKey,
  toErrorMessage,
  toISODate,
  toNumber,
  toRecord,
} from '../helpers';
import {
  extractItems,
  parseAppointment,
  parseClient,
  parseService,
  parseStaff,
  parseWorkingHours,
} from '../parsers';
import type {
  AppointmentItem,
  ClientItem,
  LoadingState,
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
  setStaffServiceCounts: (value: Record<string, number>) => void;
  setEditorServiceCount: (value: number) => void;
  setEditorServiceNames: (value: string[]) => void;
  setToast: (value: string) => void;
  setClients: (value: ClientItem[]) => void;
  setAppointments: (value: AppointmentItem[]) => void;
  setJournalMarkedDates: (value: string[]) => void;
  setWorkingHoursByStaff: (value: WorkingHoursMap) => void;
};

export function useDataLoaders({
  isAuthorized,
  sessionRole,
  sessionStaffId,
  sessionStaffName,
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
  setJournalMarkedDates,
  setWorkingHoursByStaff,
}: UseDataLoadersParams) {
  const canUseStaffDirectory = canViewStaff || canViewJournal || canViewSchedule;

  const loadStaff = useCallback(async () => {
    if (!isAuthorized || !canUseStaffDirectory) {
      setStaff([]);
      return [];
    }
    setLoadingKey(setLoading, 'staff', true);
    try {
      const candidates = [
        '/staff?page=1&limit=200&isActive=true',
        '/staff?isActive=true',
        '/staff?page=1&limit=200',
        '/staff',
      ];
      let parsed: StaffItem[] = [];
      for (const path of candidates) {
        try {
          const data = await api.get<unknown>(path);
          parsed = (extractItems(data).map(parseStaff).filter(Boolean) as StaffItem[]).filter(
            (item) => item.isActive,
          );
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
      return [];
    }
    setLoadingKey(setLoading, 'services', true);
    try {
      const data = await api.get<unknown>('/services');
      const parsed = extractItems(data).map(parseService).filter(Boolean) as ServiceItem[];
      setServices(parsed);
      return parsed;
    } catch (error) {
      setAppError(toErrorMessage(error));
      return [];
    } finally {
      setLoadingKey(setLoading, 'services', false);
    }
  }, [canViewServices, isAuthorized, setAppError, setLoading, setServices]);

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

  const appointmentsBasePath = sessionRole === 'MASTER' ? '/master/appointments' : '/appointments';

  const fetchAppointmentsRange = useCallback(
    async (from: string, to: string, maxPages = 20) => {
      const limit = 100;
      const merged: AppointmentItem[] = [];
      let page = 1;

      while (page <= maxPages) {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          from,
          to,
        });
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
        const parsed = await fetchAppointmentsRange(dayFrom, dayFrom, 10);
        setAppointments(parsed);
      } catch (error) {
        setAppError(toErrorMessage(error));
      } finally {
        setLoadingKey(setLoading, 'appointments', false);
      }
    },
    [canViewJournal, fetchAppointmentsRange, isAuthorized, setAppError, setAppointments, setLoading],
  );

  const loadJournalMarkedDates = useCallback(
    async (date: Date) => {
      if (!isAuthorized || !canViewJournal) {
        setJournalMarkedDates([]);
        return;
      }
      try {
        const from = new Date(date.getFullYear(), date.getMonth(), 1);
        const to = new Date(date.getFullYear(), date.getMonth() + 2, 0);
        const parsed = await fetchAppointmentsRange(
          toISODate(from),
          toISODate(to),
          40,
        );
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
    if (!isAuthorized || sessionRole !== 'OWNER') {
      return null;
    }
    setLoadingKey(setLoading, 'settings', true);
    try {
      const data = await api.get<unknown>('/settings/staff');
      const asRecord = toRecord(data);
      const policyRecord = toRecord(asRecord?.clientCancelPolicy) ?? toRecord(asRecord?.cancelPolicy);
      const minNotice = toNumber(policyRecord?.minNoticeMinutes);
      return minNotice ?? null;
    } catch (error) {
      setAppError(toErrorMessage(error));
      return null;
    } finally {
      setLoadingKey(setLoading, 'settings', false);
    }
  }, [isAuthorized, sessionRole, setAppError, setLoading]);

  const loadReports = useCallback(async () => {
    if (!isAuthorized || !canViewReports) {
      return null;
    }
    setLoadingKey(setLoading, 'reports', true);
    try {
      const [from, to] = monthRange(selectedDate);
      const data = await api.get<unknown>(`/reports/overview?from=${from}&to=${to}`);
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
      try {
        const data = await api.get<unknown>('/staff?page=1&limit=200&role=MASTER&isActive=true');
        const parsed = extractItems(data).map(parseStaff).filter(Boolean) as StaffItem[];
        if (parsed.length > 0) {
          scheduleStaff = parsed;
        }
      } catch {
        // fallback на уже загруженный список staff
      }
      if (scheduleStaff.length === 0) {
        setWorkingHoursByStaff({});
        return;
      }
      const week = getWeekDates(selectedDate);
      const from = toISODate(week[0]);
      const to = toISODate(week[week.length - 1]);
      const hasSlots = (hours: Record<number, string[]>) =>
        Object.values(hours).some((slots) => slots.length > 0);

      setLoadingKey(setLoading, 'schedule', true);
      try {
        const responses = await Promise.all(
          scheduleStaff.map(async (item) => {
            const candidates = [
              `/schedule/staff/${item.id}/working-hours?from=${from}&to=${to}`,
              `/schedule/staff/${item.id}/working-hours`,
            ];
            try {
              for (const path of candidates) {
                try {
                  const data = await api.get<unknown>(path);
                  const parsed = parseWorkingHours(data);
                  if (hasSlots(parsed)) {
                    return [item.id, parsed] as const;
                  }
                } catch {
                  // пробуем следующий endpoint
                }
              }
              return [item.id, {} as Record<number, string[]>] as const;
            } catch {
              return [item.id, {} as Record<number, string[]>] as const;
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
    if (canViewStaff) {
      await loadStaffServiceMeta(rows);
    } else {
      setStaffServiceCounts({});
    }
    await Promise.all([
      canViewClients ? loadClients(debouncedClientsQuery) : Promise.resolve(),
      canViewServices ? loadServices() : Promise.resolve([]),
      canViewJournal ? loadAppointments(selectedDate) : Promise.resolve(),
      canViewJournal ? loadJournalMarkedDates(selectedDate) : Promise.resolve(),
      loadSettings(),
      canViewReports ? loadReports() : Promise.resolve(null),
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
    canViewReports,
    canViewSchedule,
    canViewServices,
    canViewStaff,
    debouncedClientsQuery,
    isAuthorized,
    loadAppointments,
    loadClients,
    loadJournalMarkedDates,
    loadReports,
    loadServices,
    loadStaffServiceMeta,
    loadSettings,
    loadStaff,
    loadWorkingHours,
    selectedDate,
    setAppError,
    setStaffServiceCounts,
    setWorkingHoursByStaff,
  ]);

  return {
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
  };
}
