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
  WorkingHoursMap,
} from '../types';

type UseDataLoadersParams = {
  isAuthorized: boolean;
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
  const loadStaff = useCallback(async () => {
    if (!isAuthorized) {
      return [];
    }
    setLoadingKey(setLoading, 'staff', true);
    try {
      const candidates = ['/staff?page=1&limit=100', '/staff'];
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
  }, [isAuthorized, setAppError, setLoading, setStaff]);

  const loadServices = useCallback(async () => {
    if (!isAuthorized) {
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
  }, [isAuthorized, setAppError, setLoading, setServices]);

  const loadStaffServiceMeta = useCallback(
    async (rows: StaffItem[]) => {
      if (!isAuthorized || rows.length === 0) {
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
    [isAuthorized, setStaffServiceCounts],
  );

  const loadStaffServicesForEditor = useCallback(async (staffId: string) => {
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
  }, [setEditorServiceCount, setEditorServiceNames, setToast]);

  const loadClients = useCallback(
    async (search = '') => {
      if (!isAuthorized) {
        return;
      }
      setLoadingKey(setLoading, 'clients', true);
      try {
        const params = new URLSearchParams({
          page: '1',
          limit: '50',
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
    [isAuthorized, setAppError, setClients, setLoading],
  );

  const fetchAppointmentsRange = useCallback(
    async (from: string, to: string, maxPages = 20) => {
      const limit = 100;
      const merged: AppointmentItem[] = [];
      let page = 1;

      while (page <= maxPages) {
        const data = await api.get<unknown>(
          `/appointments?page=${page}&limit=${limit}&from=${from}&to=${to}`,
        );
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

      return merged;
    },
    [],
  );

  const loadAppointments = useCallback(
    async (date: Date) => {
      if (!isAuthorized) {
        return;
      }
      setLoadingKey(setLoading, 'appointments', true);
      try {
        const dayFrom = toISODate(date);
        const parsed = await fetchAppointmentsRange(dayFrom, dayFrom, 10);
        const onlySelectedDay = parsed.filter((item) => toISODate(item.startAt) === dayFrom);
        setAppointments(onlySelectedDay);
      } catch (error) {
        setAppError(toErrorMessage(error));
      } finally {
        setLoadingKey(setLoading, 'appointments', false);
      }
    },
    [fetchAppointmentsRange, isAuthorized, setAppError, setAppointments, setLoading],
  );

  const loadJournalMarkedDates = useCallback(
    async (date: Date) => {
      if (!isAuthorized) {
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
        const days = Array.from(new Set(parsed.map((item) => toISODate(item.startAt))));
        setJournalMarkedDates(days);
      } catch {
        setJournalMarkedDates([]);
      }
    },
    [fetchAppointmentsRange, isAuthorized, setJournalMarkedDates],
  );

  const loadSettings = useCallback(async () => {
    if (!isAuthorized) {
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
  }, [isAuthorized, setAppError, setLoading]);

  const loadReports = useCallback(async () => {
    if (!isAuthorized) {
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
  }, [isAuthorized, selectedDate, setAppError, setLoading]);

  const loadWorkingHours = useCallback(
    async (staffRows: StaffItem[]) => {
      if (!isAuthorized || staffRows.length === 0) {
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
          staffRows.map(async (item) => {
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
    [isAuthorized, selectedDate, setLoading, setWorkingHoursByStaff],
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
    const rows = await loadStaff();
    await loadStaffServiceMeta(rows);
    await Promise.all([
      loadClients(debouncedClientsQuery),
      loadServices(),
      loadAppointments(selectedDate),
      loadJournalMarkedDates(selectedDate),
      loadSettings(),
      loadReports(),
    ]);
    await loadWorkingHours(rows);
  }, [
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
