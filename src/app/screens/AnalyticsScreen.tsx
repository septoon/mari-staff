import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { api } from '../../api';
import {
  CalendarRange,
  ChevronDown,
  RefreshCcw,
  Users,
  Wallet,
} from 'lucide-react';
import {
  formatGroupedRub,
  normalizePhoneForWhatsApp,
  toISODate,
} from '../helpers';
import {
  JOURNAL_END_HOUR,
  JOURNAL_START_HOUR,
} from '../constants';
import type { AppointmentItem, StaffItem } from '../types';

type AnalyticsScreenProps = {
  selectedDate: Date;
  staff: StaffItem[];
  appointments: AppointmentItem[];
  loading: boolean;
  onReload: () => void;
};

type AnalyticsFilters = {
  from: string;
  to: string;
  position: string;
  staffId: string;
};

type ChartMode = 'revenue' | 'appointments' | 'occupancy';

type DistributionItem = {
  label: string;
  value: number;
  color: string;
};

type BucketItem = {
  label: string;
  shortLabel: string;
  value: number;
};

const DONUT_COLORS = ['#f4c900', '#222b33', '#4c84ff', '#79c8a8', '#f39a5c', '#c7ceda'];
const BUCKET_LABEL_COUNT = 6;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, value: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + value);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(date: Date, value: number) {
  return new Date(date.getFullYear(), date.getMonth() + value, 1);
}

function daysBetweenInclusive(from: Date, to: Date) {
  return Math.max(1, Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000) + 1);
}

function roundValue(value: number, digits = 0) {
  const pow = 10 ** digits;
  return Math.round(value * pow) / pow;
}

function getAmount(item: AppointmentItem) {
  return item.amountAfterDiscount ?? item.amountBeforeDiscount ?? 0;
}

function getDurationMinutes(item: AppointmentItem) {
  return Math.max(0, Math.round((item.endAt.getTime() - item.startAt.getTime()) / 60_000));
}

function isCancelledStatus(status: string) {
  return status.trim().toUpperCase().includes('CANCEL');
}

function isCompletedStatus(status: string) {
  const normalized = status.trim().toUpperCase();
  return normalized === 'ARRIVED' || normalized === 'DONE' || normalized === 'COMPLETED';
}

function getStatusLabel(status: string) {
  const normalized = status.trim().toUpperCase();
  if (isCompletedStatus(normalized)) {
    return 'Завершен';
  }
  if (normalized === 'CONFIRMED') {
    return 'Подтвержден';
  }
  if (normalized === 'NO_SHOW') {
    return 'Не пришел';
  }
  if (isCancelledStatus(normalized)) {
    return 'Отменен';
  }
  return 'Ожидание';
}

function getDefaultFilters(selectedDate: Date): AnalyticsFilters {
  const to = startOfDay(selectedDate);
  const from = addDays(to, -69);
  return {
    from: toISODate(from),
    to: toISODate(to),
    position: 'all',
    staffId: '',
  };
}

function getClientKey(item: AppointmentItem) {
  const clientId = item.clientId.trim();
  if (clientId) {
    return clientId;
  }
  const phone = normalizePhoneForWhatsApp(item.clientPhone);
  if (phone) {
    return phone;
  }
  return item.clientName.trim().toLowerCase() || item.id;
}

function buildDistribution(
  items: Map<string, number>,
  mode: 'value' | 'money' = 'value',
): DistributionItem[] {
  return Array.from(items.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([label, value], index) => ({
      label,
      value: mode === 'money' ? roundValue(value) : value,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
    }));
}

function buildBuckets(
  from: Date,
  to: Date,
  items: AppointmentItem[],
  mode: ChartMode,
  staffCount: number,
) {
  const totalDays = daysBetweenInclusive(from, to);
  const bucketType = totalDays > 62 ? 'month' : totalDays > 24 ? 'week' : 'day';
  const buckets: Array<{ key: string; label: string; shortLabel: string; start: Date; end: Date; days: number; raw: number }> = [];

  if (bucketType === 'month') {
    for (let cursor = startOfMonth(from); cursor <= to; cursor = addMonths(cursor, 1)) {
      const start = startOfMonth(cursor);
      const end = endOfMonth(cursor);
      const label = cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      buckets.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        label,
        shortLabel: cursor.toLocaleDateString('ru-RU', { month: 'short' }),
        start,
        end,
        days: daysBetweenInclusive(start > from ? start : from, end < to ? end : to),
        raw: 0,
      });
    }
  } else if (bucketType === 'week') {
    for (let cursor = startOfWeek(from); cursor <= to; cursor = addDays(cursor, 7)) {
      const start = cursor < from ? from : cursor;
      const rawEnd = addDays(cursor, 6);
      const end = rawEnd > to ? to : rawEnd;
      buckets.push({
        key: `${toISODate(start)}`,
        label: `${start.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}`,
        shortLabel: `${start.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`,
        start,
        end,
        days: daysBetweenInclusive(start, end),
        raw: 0,
      });
    }
  } else {
    for (let cursor = startOfDay(from); cursor <= to; cursor = addDays(cursor, 1)) {
      buckets.push({
        key: toISODate(cursor),
        label: cursor.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }),
        shortLabel: cursor.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        start: cursor,
        end: endOfDay(cursor),
        days: 1,
        raw: 0,
      });
    }
  }

  items.forEach((item) => {
    const bucket = buckets.find((candidate) => item.startAt >= candidate.start && item.startAt <= candidate.end);
    if (!bucket) {
      return;
    }
    if (mode === 'revenue') {
      bucket.raw += getAmount(item);
      return;
    }
    if (mode === 'appointments') {
      bucket.raw += 1;
      return;
    }
    bucket.raw += getDurationMinutes(item);
  });

  return buckets.map((bucket) => {
    if (mode === 'occupancy') {
      const denominator =
        staffCount > 0
          ? bucket.days * staffCount * (JOURNAL_END_HOUR - JOURNAL_START_HOUR) * 60
          : 0;
      return {
        label: bucket.label,
        shortLabel: bucket.shortLabel,
        value: denominator > 0 ? roundValue((bucket.raw / denominator) * 100, 1) : 0,
      };
    }
    return {
      label: bucket.label,
      shortLabel: bucket.shortLabel,
      value: roundValue(bucket.raw, mode === 'revenue' ? 0 : 1),
    };
  });
}

function buildPolylinePoints(values: number[], width: number, height: number, padding = 18) {
  if (values.length === 0) {
    return '';
  }
  const max = Math.max(...values, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : padding + (index / (values.length - 1)) * innerWidth;
      const y = padding + innerHeight - (value / max) * innerHeight;
      return `${x},${y}`;
    })
    .join(' ');
}

function pickVisibleLabels(items: BucketItem[]) {
  if (items.length <= BUCKET_LABEL_COUNT) {
    return items.map((item, index) => ({ ...item, index }));
  }
  const step = Math.max(1, Math.floor((items.length - 1) / (BUCKET_LABEL_COUNT - 1)));
  const indices = new Set<number>([0, items.length - 1]);
  for (let index = step; index < items.length - 1; index += step) {
    indices.add(index);
  }
  return Array.from(indices)
    .sort((left, right) => left - right)
    .map((index) => ({ ...items[index], index }));
}

function MetricCard({
  title,
  value,
  accent,
  subtitle,
}: {
  title: string;
  value: string;
  accent?: 'gold' | 'ink' | 'blue' | 'green';
  subtitle: string;
}) {
  const accentClass =
    accent === 'gold'
      ? 'text-[#9b7322]'
      : accent === 'blue'
        ? 'text-[#2d5fd6]'
        : accent === 'green'
          ? 'text-[#20804a]'
          : 'text-ink';

  return (
    <section className="rounded-[28px] border border-[#e3e8ef] bg-white px-5 py-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">{title}</p>
      <p className={clsx('mt-3 text-[34px] font-extrabold leading-none', accentClass)}>{value}</p>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#7d8693]">{subtitle}</p>
    </section>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="relative block">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full appearance-none rounded-2xl border border-[#dce2ea] bg-white pl-4 pr-11 text-sm font-semibold text-ink outline-none transition focus:border-[#c8d1dd]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8791a0]" />
    </label>
  );
}

function DonutCard({
  title,
  items,
  formatter,
}: {
  title: string;
  items: DistributionItem[];
  formatter?: (value: number) => string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const background =
    total > 0
      ? `conic-gradient(${items
          .map((item, index) => {
            const previous = items
              .slice(0, index)
              .reduce((sum, current) => sum + current.value, 0);
            const start = (previous / total) * 100;
            const end = ((previous + item.value) / total) * 100;
            return `${item.color} ${start}% ${end}%`;
          })
          .join(', ')})`
      : '#eef2f6';

  return (
    <section className="rounded-[28px] border border-[#e3e8ef] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">{title}</p>
          <p className="mt-3 text-[30px] font-extrabold leading-none text-ink">
            {total > 0 ? formatter?.(total) || Math.round(total).toString() : '—'}
          </p>
        </div>
        <div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background }}>
          <div className="absolute inset-[14px] rounded-full bg-white" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 text-sm font-semibold text-[#55606f]">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.label}</span>
              </div>
              <span className="shrink-0 text-ink">
                {formatter ? formatter(item.value) : Math.round(item.value)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm font-semibold text-[#8a94a3]">Недостаточно данных</p>
        )}
      </div>
    </section>
  );
}

export function AnalyticsScreen({
  selectedDate,
  staff,
  appointments,
  loading,
  onReload,
}: AnalyticsScreenProps) {
  const defaultFilters = useMemo(() => getDefaultFilters(selectedDate), [selectedDate]);
  const [draftFilters, setDraftFilters] = useState<AnalyticsFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<AnalyticsFilters>(defaultFilters);
  const [chartMode, setChartMode] = useState<ChartMode>('revenue');
  const [apiSyncState, setApiSyncState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [apiSyncMessage, setApiSyncMessage] = useState('');

  const activeStaff = useMemo(
    () => staff.filter((item) => item.isActive),
    [staff],
  );
  const staffById = useMemo(
    () => new Map(activeStaff.map((item) => [item.id, item])),
    [activeStaff],
  );
  const staffByName = useMemo(
    () => new Map(activeStaff.map((item) => [item.name.trim().toLowerCase(), item])),
    [activeStaff],
  );
  const positionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          activeStaff
            .map((item) => item.positionName?.trim() || '')
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right, 'ru')),
    [activeStaff],
  );
  const staffOptions = useMemo(() => {
    const rows =
      draftFilters.position === 'all'
        ? activeStaff
        : activeStaff.filter((item) => (item.positionName?.trim() || '') === draftFilters.position);
    return rows.sort((left, right) => left.name.localeCompare(right.name, 'ru'));
  }, [activeStaff, draftFilters.position]);

  const syncApi = async (filters: AnalyticsFilters) => {
    setApiSyncState('loading');
    setApiSyncMessage('Синхронизация API аналитики...');
    try {
      await api.getAnalyticsOverview({
        from: filters.from,
        to: filters.to,
        masterId: filters.staffId || null,
      });
      setApiSyncState('success');
      setApiSyncMessage('Только для владельца');
    } catch {
      setApiSyncState('error');
      setApiSyncMessage('API аналитики недоступен, расчеты построены локально');
    }
  };

  useEffect(() => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    void syncApi(defaultFilters);
  }, [defaultFilters]);

  const appliedFromDate = useMemo(
    () => startOfDay(new Date(`${appliedFilters.from}T00:00:00`)),
    [appliedFilters.from],
  );
  const appliedToDate = useMemo(
    () => endOfDay(new Date(`${appliedFilters.to}T00:00:00`)),
    [appliedFilters.to],
  );

  const matchesStaffFilters = useCallback((item: AppointmentItem) => {
    const byId = item.staffId ? staffById.get(item.staffId) : null;
    const byName = item.staffName ? staffByName.get(item.staffName.trim().toLowerCase()) : null;
    const staffRow = byId || byName || null;

    if (appliedFilters.staffId && item.staffId !== appliedFilters.staffId) {
      if (!staffRow || staffRow.id !== appliedFilters.staffId) {
        return false;
      }
    }

    if (appliedFilters.position !== 'all') {
      const position = staffRow?.positionName?.trim() || '';
      if (position !== appliedFilters.position) {
        return false;
      }
    }

    return true;
  }, [appliedFilters.position, appliedFilters.staffId, staffById, staffByName]);

  const filteredAppointments = useMemo(
    () =>
      appointments.filter(
        (item) =>
          item.startAt >= appliedFromDate &&
          item.startAt <= appliedToDate &&
          matchesStaffFilters(item),
      ),
    [appointments, appliedFromDate, appliedToDate, matchesStaffFilters],
  );

  const allRelevantAppointments = useMemo(
    () =>
      appointments.filter(
        (item) =>
          item.startAt <= appliedToDate &&
          (appliedFilters.staffId || appliedFilters.position !== 'all' ? matchesStaffFilters(item) : true),
      ),
    [appointments, appliedToDate, appliedFilters.position, appliedFilters.staffId, matchesStaffFilters],
  );

  const filteredStaffCount = useMemo(() => {
    const rows =
      appliedFilters.position === 'all'
        ? activeStaff
        : activeStaff.filter((item) => (item.positionName?.trim() || '') === appliedFilters.position);
    if (appliedFilters.staffId) {
      return rows.filter((item) => item.id === appliedFilters.staffId).length || 1;
    }
    return rows.length || 1;
  }, [activeStaff, appliedFilters.position, appliedFilters.staffId]);

  const totalRevenue = filteredAppointments.reduce((sum, item) => sum + getAmount(item), 0);
  const totalPaid = filteredAppointments.reduce((sum, item) => sum + Math.max(item.paidAmount ?? 0, 0), 0);
  const totalBookedMinutes = filteredAppointments.reduce((sum, item) => sum + getDurationMinutes(item), 0);
  const totalAppointments = filteredAppointments.length;
  const cancelledAppointments = filteredAppointments.filter((item) => isCancelledStatus(item.status)).length;
  const completedAppointments = filteredAppointments.filter((item) => isCompletedStatus(item.status)).length;
  const pendingAppointments = Math.max(0, totalAppointments - cancelledAppointments - completedAppointments);
  const averageCheck = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
  const averageOccupancy =
    filteredStaffCount > 0
      ? roundValue(
          (totalBookedMinutes /
            (daysBetweenInclusive(appliedFromDate, appliedToDate) *
              filteredStaffCount *
              (JOURNAL_END_HOUR - JOURNAL_START_HOUR) *
              60)) *
            100,
          1,
        )
      : 0;

  const serviceTotals = useMemo(() => {
    const items = new Map<string, number>();
    filteredAppointments.forEach((item) => {
      const key = item.serviceName || 'Без услуги';
      items.set(key, (items.get(key) || 0) + getAmount(item));
    });
    return buildDistribution(items, 'money');
  }, [filteredAppointments]);

  const staffTotals = useMemo(() => {
    const items = new Map<string, number>();
    filteredAppointments.forEach((item) => {
      const key = item.staffName || 'Без сотрудника';
      items.set(key, (items.get(key) || 0) + getAmount(item));
    });
    return buildDistribution(items, 'money');
  }, [filteredAppointments]);

  const statusTotals = useMemo(() => {
    const items = new Map<string, number>();
    filteredAppointments.forEach((item) => {
      const key = getStatusLabel(item.status);
      items.set(key, (items.get(key) || 0) + 1);
    });
    return buildDistribution(items);
  }, [filteredAppointments]);

  const clientSegments = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>();
    allRelevantAppointments.forEach((item) => {
      const key = getClientKey(item);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(item);
    });

    let newClients = 0;
    let repeatClients = 0;
    let lostClients = 0;
    const lostBoundary = addDays(startOfDay(appliedToDate), -60);

    map.forEach((items) => {
      const sorted = [...items].sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
      const firstVisit = sorted[0]?.startAt;
      const lastVisit = sorted[sorted.length - 1]?.startAt;
      const hasVisitInPeriod = sorted.some(
        (item) => item.startAt >= appliedFromDate && item.startAt <= appliedToDate,
      );

      if (hasVisitInPeriod) {
        if (firstVisit && firstVisit >= appliedFromDate && firstVisit <= appliedToDate) {
          newClients += 1;
        } else {
          repeatClients += 1;
        }
      }
      if (lastVisit && lastVisit < lostBoundary) {
        lostClients += 1;
      }
    });

    return {
      newClients,
      repeatClients,
      lostClients,
    };
  }, [allRelevantAppointments, appliedFromDate, appliedToDate]);

  const chartSeries = useMemo(
    () => buildBuckets(appliedFromDate, appliedToDate, filteredAppointments, chartMode, filteredStaffCount),
    [appliedFromDate, appliedToDate, chartMode, filteredAppointments, filteredStaffCount],
  );
  const chartPoints = useMemo(
    () => buildPolylinePoints(chartSeries.map((item) => item.value), 760, 220),
    [chartSeries],
  );
  const visibleChartLabels = useMemo(() => pickVisibleLabels(chartSeries), [chartSeries]);

  const chartTotalLabel =
    chartMode === 'revenue'
      ? formatGroupedRub(chartSeries.reduce((sum, item) => sum + item.value, 0))
      : chartMode === 'appointments'
        ? `${Math.round(chartSeries.reduce((sum, item) => sum + item.value, 0))}`
        : `${roundValue(
            chartSeries.length > 0
              ? chartSeries.reduce((sum, item) => sum + item.value, 0) / chartSeries.length
              : 0,
            1,
          )}%`;

  if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches) {
    return (
      <div className="pb-6 pt-4 md:hidden">
        <div className="rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-5 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Аналитика</p>
          <h1 className="mt-3 text-[28px] font-extrabold leading-none text-ink">Раздел доступен на desktop</h1>
          <p className="mt-4 text-sm font-semibold leading-6 text-[#7c8491]">
            На мобильной версии аналитика скрыта из навигации и открывается только на широком экране.
          </p>
          <button
            type="button"
            onClick={onReload}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-[#f4c900] px-4 text-sm font-extrabold text-[#222b33]"
          >
            <RefreshCcw className="h-4 w-4" />
            Обновить данные
          </button>
        </div>
      </div>
    );
  }

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    void syncApi(draftFilters);
  };

  return (
    <div className="hidden pb-6 md:block">
      <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Аналитика</p>
            <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
              Основные показатели
            </h1>
            <p className="mt-4 max-w-[700px] text-[15px] font-semibold leading-6 text-[#7c8491]">
              Все показатели считаются по журналу записей.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onReload}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-semibold text-ink"
            >
              <RefreshCcw className="h-4 w-4 text-[#8892a2]" />
              Обновить журнал
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">С</span>
            <input
              type="date"
              value={draftFilters.from}
              max={draftFilters.to}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, from: event.target.value }))}
              className="h-12 w-full rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-ink outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">По</span>
            <input
              type="date"
              value={draftFilters.to}
              min={draftFilters.from}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, to: event.target.value }))}
              className="h-12 w-full rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-ink outline-none"
            />
          </label>
          <div className="rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Доступ</p>
            <p
              className={clsx(
                'mt-3 text-sm font-extrabold',
                apiSyncState === 'success'
                  ? 'text-[#20804a]'
                  : apiSyncState === 'error'
                    ? 'text-[#c14d39]'
                    : 'text-[#7d8693]',
              )}
            >
              {apiSyncState === 'loading' ? 'Проверяю...' : apiSyncMessage || 'Ожидает синхронизации'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Должность</span>
            <FilterSelect
              value={draftFilters.position}
              onChange={(next) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  position: next,
                  staffId:
                    next !== 'all' &&
                    prev.staffId &&
                    !staffOptions.some((item) => item.id === prev.staffId)
                      ? ''
                      : prev.staffId,
                }))
              }
              options={[
                { value: 'all', label: 'Все должности' },
                ...positionOptions.map((item) => ({ value: item, label: item })),
              ]}
            />
          </div>
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Сотрудник</span>
            <FilterSelect
              value={draftFilters.staffId}
              onChange={(next) => setDraftFilters((prev) => ({ ...prev, staffId: next }))}
              options={[
                { value: '', label: 'Все сотрудники' },
                ...staffOptions.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleApplyFilters}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#f4c900] px-10 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)]"
            >
              Показать
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="mt-5 animate-pulse space-y-5">
          <div className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
            <div className="h-8 w-64 rounded-full bg-[#edf1f5]" />
            <div className="mt-4 h-[280px] rounded-[26px] bg-[#f4f7fb]" />
          </div>
          <div className="grid gap-5 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-36 rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] shadow-[0_18px_40px_rgba(42,49,56,0.08)]" />
            ))}
          </div>
        </div>
      ) : null}

      {!loading ? (
        <>
          <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_320px]">
            <div className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Динамика</p>
                  <p className="mt-2 text-[30px] font-extrabold leading-none text-ink">{chartTotalLabel}</p>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-[#e2e6ed] bg-[#f7f9fc] p-1">
                  {[
                    { key: 'revenue', label: 'Выручка' },
                    { key: 'appointments', label: 'Записи' },
                    { key: 'occupancy', label: 'Заполненность' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setChartMode(item.key as ChartMode)}
                      className={clsx(
                        'rounded-2xl px-4 py-2 text-sm font-extrabold transition',
                        chartMode === item.key
                          ? 'bg-white text-ink shadow-[0_8px_18px_rgba(42,49,56,0.08)]'
                          : 'text-[#7d8693] hover:text-ink',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-[28px] border border-[#e5e9f0] bg-[#f8fafc] p-5">
                {chartSeries.length > 0 ? (
                  <>
                    <svg viewBox="0 0 760 220" className="h-[260px] w-full">
                      <defs>
                        <linearGradient id="analyticsArea" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#f4c900" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#f4c900" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[0, 1, 2, 3].map((row) => {
                        const y = 18 + row * 61;
                        return <line key={row} x1="18" y1={y} x2="742" y2={y} stroke="#e4e9f0" strokeWidth="1" />;
                      })}
                      {chartPoints ? (
                        <>
                          <polyline
                            fill="none"
                            stroke="#f4c900"
                            strokeWidth="4"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            points={chartPoints}
                          />
                          <polyline
                            fill="url(#analyticsArea)"
                            stroke="none"
                            points={`${chartPoints} 742,202 18,202`}
                          />
                        </>
                      ) : null}
                    </svg>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">
                      {visibleChartLabels.map((item) => (
                        <span key={`${item.label}-${item.index}`}>{item.shortLabel}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex h-[260px] items-center justify-center rounded-[22px] bg-white text-sm font-semibold text-[#7d8693]">
                    Нет данных за выбранный период
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-5">
              <MetricCard
                title="Новые клиенты"
                value={String(clientSegments.newClients)}
                accent="blue"
                subtitle="Первый визит клиента пришелся на выбранный период."
              />
              <MetricCard
                title="Повторные клиенты"
                value={String(clientSegments.repeatClients)}
                accent="green"
                subtitle="Клиенты с повторными визитами внутри текущего периода."
              />
              <MetricCard
                title="Потерянные клиенты"
                value={String(clientSegments.lostClients)}
                accent="ink"
                subtitle="Последний визит был более 60 дней назад."
              />
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-4">
            <MetricCard
              title="Всего записей"
              value={String(totalAppointments)}
              accent="ink"
              subtitle="Суммарное количество записей за выбранный период."
            />
            <MetricCard
              title="Отмененных"
              value={String(cancelledAppointments)}
              accent="gold"
              subtitle={totalAppointments > 0 ? `${roundValue((cancelledAppointments / totalAppointments) * 100, 1)}% от всех записей` : 'Нет записей'}
            />
            <MetricCard
              title="Завершенных"
              value={String(completedAppointments)}
              accent="green"
              subtitle={totalAppointments > 0 ? `${roundValue((completedAppointments / totalAppointments) * 100, 1)}% от всех записей` : 'Нет записей'}
            />
            <MetricCard
              title="Незавершенных"
              value={String(pendingAppointments)}
              accent="blue"
              subtitle={totalAppointments > 0 ? `${roundValue((pendingAppointments / totalAppointments) * 100, 1)}% от всех записей` : 'Нет записей'}
            />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-3">
            <MetricCard
              title="Доход"
              value={formatGroupedRub(totalRevenue)}
              accent="ink"
              subtitle="Суммарный доход по услугам из журнала записей."
            />
            <MetricCard
              title="Доход по услугам"
              value={formatGroupedRub(totalRevenue)}
              accent="ink"
              subtitle="Отдельного товарного учета в журнале нет, поэтому считаем только услуги."
            />
            <MetricCard
              title="Доход по товарам"
              value={formatGroupedRub(0)}
              accent="ink"
              subtitle="Товары в журнале отсутствуют, метрика оставлена нулевой."
            />
            <MetricCard
              title="Средний чек"
              value={formatGroupedRub(averageCheck)}
              accent="blue"
              subtitle="Средний чек на одну запись в выбранном периоде."
            />
            <MetricCard
              title="Оплачено"
              value={formatGroupedRub(totalPaid)}
              accent="green"
              subtitle={totalRevenue > 0 ? `${roundValue((totalPaid / totalRevenue) * 100, 1)}% от выручки зафиксировано как оплата` : 'Оплаченных записей нет'}
            />
            <MetricCard
              title="Средняя заполненность"
              value={`${averageOccupancy}%`}
              accent="gold"
              subtitle="Оценка загрузки от доступных часов по сетке 10:00-18:00."
            />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-3">
            <DonutCard
              title="Услуги"
              items={serviceTotals}
              formatter={(value) => formatGroupedRub(value)}
            />
            <DonutCard
              title="Сотрудники"
              items={staffTotals}
              formatter={(value) => formatGroupedRub(value)}            />
            <DonutCard
              title="Статусы визитов"
              items={statusTotals}
            />
          </section>

          <section className="mt-5 rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Сводка</p>
                <h2 className="mt-2 text-[28px] font-extrabold leading-none text-ink">Что попало в расчет</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-[#e5e9f0] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#5f6978]">
                  <CalendarRange className="h-4 w-4 text-[#f4c900]" />
                  {appliedFilters.from} - {appliedFilters.to}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-[#e5e9f0] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#5f6978]">
                  <Users className="h-4 w-4 text-[#2d5fd6]" />
                  {appliedFilters.staffId
                    ? activeStaff.find((item) => item.id === appliedFilters.staffId)?.name || 'Сотрудник'
                    : 'Все сотрудники'}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-[#e5e9f0] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#5f6978]">
                  <Wallet className="h-4 w-4 text-[#20804a]" />
                  {appliedFilters.position === 'all' ? 'Все должности' : appliedFilters.position}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              <div className="rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Журнал записей</p>
                <p className="mt-3 text-[30px] font-extrabold leading-none text-ink">{appointments.length}</p>
                <p className="mt-3 text-sm font-semibold text-[#7d8693]">Всего записей доступно в локальном срезе журнала.</p>
              </div>
              <div className="rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">После фильтра</p>
                <p className="mt-3 text-[30px] font-extrabold leading-none text-ink">{filteredAppointments.length}</p>
                <p className="mt-3 text-sm font-semibold text-[#7d8693]">Количество записей, вошедших в текущую аналитику.</p>
              </div>
              <div className="rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Источник расчетов</p>
                <p className="mt-3 text-[30px] font-extrabold leading-none text-ink">Журнал</p>
                <p className="mt-3 text-sm font-semibold text-[#7d8693]">UI-метрики считаются локально по `journalListAppointments`.</p>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
