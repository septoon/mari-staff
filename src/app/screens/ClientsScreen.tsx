import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { api } from '../../api';
import {
  BadgePercent,
  ChartPie,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  ImagePlus,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  PencilLine,
  Phone,
  RefreshCcw,
  Save,
  Search,
  SendHorizontal,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { convertImageFileToWebp } from '../media';
import { PageSheet } from '../components/shared/PageSheet';
import {
  formatGroupedRub,
  formatHistoryDate,
  formatTime,
  normalizePhoneForLink,
  toNumber,
  normalizePhoneForWhatsApp,
  toISODate,
  toRecord,
  toString,
} from '../helpers';
import type { AppointmentItem, ClientItem } from '../types';

type ClientsScreenProps = {
  clients: ClientItem[];
  appointments: AppointmentItem[];
  query: string;
  loading: boolean;
  canEdit: boolean;
  canManageAvatars: boolean;
  canManageDiscounts: boolean;
  canManagePromocodes: boolean;
  onQueryChange: (value: string) => void;
  onOpenTools: () => void;
  onReload: () => void;
  onOpenClientActions: (client: ClientItem) => void;
  onDeleteClient: (client: ClientItem) => Promise<boolean>;
};

type ClientSegment = 'all' | 'new' | 'repeat' | 'lost';
type ActivityFilter = 'all' | 'visited' | 'without-visits';
type SortMode = 'recent' | 'visits' | 'revenue';
type ClientModalTab = 'card' | 'history' | 'stats';
type HistoryFilter = 'all' | 'upcoming' | 'confirmed' | 'arrived' | 'no-show';

type ClientDraft = {
  name: string;
  phone: string;
  email: string;
  comment: string;
  avatarUrl: string | null;
  permanentDiscountPercent: string;
};

type PromoSendResult = {
  code: string;
  email: string;
  expiresAt: string | null;
};

type DistributionItem = {
  label: string;
  value: number;
  color: string;
};

type AppointmentLookup = {
  byClientId: Map<string, AppointmentItem[]>;
  byPhone: Map<string, AppointmentItem[]>;
  byName: Map<string, AppointmentItem[]>;
};

type ClientSummary = {
  client: ClientItem;
  appointments: AppointmentItem[];
  totalVisits: number;
  totalRevenue: number;
  totalPaid: number;
  averageDiscount: number;
  averageCheck: number;
  firstVisit: Date | null;
  lastVisit: Date | null;
  noShows: number;
  confirmed: number;
  upcoming: number;
  topServices: DistributionItem[];
  topStaff: DistributionItem[];
  statusBreakdown: DistributionItem[];
};

const PAGE_SIZE = 25;
const SEGMENT_LABELS: Record<ClientSegment, string> = {
  all: 'Все',
  new: 'Новые',
  repeat: 'Повторные',
  lost: 'Потерянные',
};
const DONUT_COLORS = ['#f4c900', '#222b33', '#4ba3ff', '#7bc8a4', '#f29f67', '#d4a8ff'];
const CHART_COLORS = ['#f4c900', '#222b33', '#5aa8ff', '#9bd6af', '#f09b53', '#c0c8d6'];

function mapClientToDraft(client: ClientItem): ClientDraft {
  return {
    name: client.name,
    phone: client.phone,
    email: client.email || '',
    comment: client.comment || '',
    avatarUrl: client.avatarUrl || null,
    permanentDiscountPercent:
      client.permanentDiscountType === 'PERCENT' && client.permanentDiscountValue !== null
        ? String(client.permanentDiscountValue)
        : '',
  };
}

function parsePercentInput(value: string) {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function isDesktopViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
}

function getAppointmentAmount(appointment: AppointmentItem) {
  return appointment.amountAfterDiscount ?? appointment.amountBeforeDiscount ?? 0;
}

function getAppointmentDiscount(appointment: AppointmentItem) {
  if (appointment.discountPercent !== null) {
    return Math.max(appointment.discountPercent, 0);
  }
  if (
    appointment.amountBeforeDiscount !== null &&
    appointment.amountAfterDiscount !== null &&
    appointment.amountBeforeDiscount > 0
  ) {
    return Math.max(
      0,
      Math.round(
        ((appointment.amountBeforeDiscount - appointment.amountAfterDiscount) /
          appointment.amountBeforeDiscount) *
          100,
      ),
    );
  }
  return 0;
}

function getStatusMeta(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'ARRIVED' || normalized === 'DONE' || normalized === 'COMPLETED') {
    return {
      label: 'Завершен',
      badgeClass: 'bg-[#e5f6ea] text-[#20804a]',
      dotClass: 'bg-[#25a659]',
    };
  }
  if (normalized === 'CONFIRMED') {
    return {
      label: 'Подтвержден',
      badgeClass: 'bg-[#e4edff] text-[#2d5fd6]',
      dotClass: 'bg-[#2d5fd6]',
    };
  }
  if (normalized === 'NO_SHOW') {
    return {
      label: 'Не пришел',
      badgeClass: 'bg-[#fde7e3] text-[#c14d39]',
      dotClass: 'bg-[#db6f54]',
    };
  }
  if (normalized.includes('CANCEL')) {
    return {
      label: 'Отменен',
      badgeClass: 'bg-[#f2f4f7] text-[#738094]',
      dotClass: 'bg-[#8a94a3]',
    };
  }
  return {
    label: 'Ожидание',
    badgeClass: 'bg-[#f5ebca] text-[#9b7322]',
    dotClass: 'bg-[#f4c900]',
  };
}

function buildDistribution(items: Map<string, number>, colors: string[]) {
  return Array.from(items.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([label, value], index) => ({
      label,
      value,
      color: colors[index % colors.length],
    }));
}

function appendToLookupMap(
  map: Map<string, AppointmentItem[]>,
  key: string,
  appointment: AppointmentItem,
) {
  if (!key) {
    return;
  }
  const bucket = map.get(key);
  if (bucket) {
    bucket.push(appointment);
    return;
  }
  map.set(key, [appointment]);
}

function buildAppointmentLookup(appointments: AppointmentItem[]): AppointmentLookup {
  const byClientId = new Map<string, AppointmentItem[]>();
  const byPhone = new Map<string, AppointmentItem[]>();
  const byName = new Map<string, AppointmentItem[]>();

  appointments.forEach((appointment) => {
    appendToLookupMap(byClientId, appointment.clientId.trim(), appointment);
    appendToLookupMap(byPhone, normalizePhoneForWhatsApp(appointment.clientPhone), appointment);
    appendToLookupMap(byName, appointment.clientName.trim().toLowerCase(), appointment);
  });

  return {
    byClientId,
    byPhone,
    byName,
  };
}

function getLinkedAppointmentsForClient(
  client: Pick<ClientItem, 'id' | 'name' | 'phone'>,
  lookup: AppointmentLookup,
) {
  const unique = new Map<string, AppointmentItem>();
  const clientId = client.id.trim();
  const clientPhone = normalizePhoneForWhatsApp(client.phone);
  const clientName = client.name.trim().toLowerCase();

  const addAppointments = (items?: AppointmentItem[]) => {
    items?.forEach((item) => {
      unique.set(item.id, item);
    });
  };

  if (clientId) {
    addAppointments(lookup.byClientId.get(clientId));
  }
  if (clientPhone) {
    addAppointments(lookup.byPhone.get(clientPhone));
  }
  if (unique.size === 0 && !clientId && !clientPhone && clientName) {
    addAppointments(lookup.byName.get(clientName));
  }

  return Array.from(unique.values()).sort((left, right) => right.startAt.getTime() - left.startAt.getTime());
}

function getClientSegment(summary: ClientSummary, nowMs: number): ClientSegment {
  if (!summary.lastVisit) {
    return 'new';
  }
  const ageMs = nowMs - summary.lastVisit.getTime();
  if (ageMs > 90 * 24 * 60 * 60 * 1000) {
    return 'lost';
  }
  if (summary.totalVisits <= 1) {
    return 'new';
  }
  return 'repeat';
}

function getClientInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) {
    return 'К';
  }
  return parts.map((part) => part[0]?.toUpperCase() || '').join('');
}

function formatDateTime(date: Date | null) {
  if (!date) {
    return '—';
  }
  return `${formatHistoryDate(date)} ${formatTime(date)}`;
}

function buildClientSummary(client: ClientItem, appointments: AppointmentItem[]): ClientSummary {
  const history = [...appointments].sort((left, right) => right.startAt.getTime() - left.startAt.getTime());
  const totalRevenue = history.reduce((sum, item) => sum + getAppointmentAmount(item), 0);
  const totalPaid = history.reduce((sum, item) => sum + Math.max(item.paidAmount ?? 0, 0), 0);
  const averageDiscount =
    history.length > 0
      ? history.reduce((sum, item) => sum + getAppointmentDiscount(item), 0) / history.length
      : 0;
  const noShows = history.filter((item) => item.status === 'NO_SHOW').length;
  const confirmed = history.filter((item) => item.status === 'CONFIRMED').length;
  const upcoming = history.filter((item) => item.status === 'PENDING').length;
  const firstVisit = history.length > 0 ? history[history.length - 1]?.startAt ?? null : null;
  const lastVisit = history[0]?.startAt ?? null;
  const serviceTotals = new Map<string, number>();
  const staffTotals = new Map<string, number>();
  const statusTotals = new Map<string, number>();

  history.forEach((item) => {
    const serviceName = item.serviceName || 'Без услуги';
    const staffName = item.staffName || 'Без сотрудника';
    const statusLabel = getStatusMeta(item.status).label;
    serviceTotals.set(serviceName, (serviceTotals.get(serviceName) || 0) + getAppointmentAmount(item));
    staffTotals.set(staffName, (staffTotals.get(staffName) || 0) + 1);
    statusTotals.set(statusLabel, (statusTotals.get(statusLabel) || 0) + 1);
  });

  return {
    client,
    appointments: history,
    totalVisits: history.length,
    totalRevenue,
    totalPaid,
    averageDiscount,
    averageCheck: history.length > 0 ? totalRevenue / history.length : 0,
    firstVisit,
    lastVisit,
    noShows,
    confirmed,
    upcoming,
    topServices: buildDistribution(serviceTotals, DONUT_COLORS),
    topStaff: buildDistribution(staffTotals, CHART_COLORS),
    statusBreakdown: buildDistribution(statusTotals, CHART_COLORS),
  };
}

function buildPages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 3) {
    return [1, 2, 3, 4, totalPages];
  }
  if (currentPage >= totalPages - 2) {
    return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
}

function buildRevenueSeries(appointments: AppointmentItem[], from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T23:59:59`);
  const safeFrom = Number.isNaN(fromDate.getTime()) ? new Date() : fromDate;
  const safeTo = Number.isNaN(toDate.getTime()) ? new Date() : toDate;
  const buckets = new Map<string, number>();
  const monthCursor = new Date(safeFrom.getFullYear(), safeFrom.getMonth(), 1);
  const monthEnd = new Date(safeTo.getFullYear(), safeTo.getMonth(), 1);

  while (monthCursor <= monthEnd) {
    const key = `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}`;
    const label = monthCursor.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
    buckets.set(`${key}|${label}`, 0);
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  appointments.forEach((item) => {
    if (item.startAt < safeFrom || item.startAt > safeTo) {
      return;
    }
    const key = `${item.startAt.getFullYear()}-${String(item.startAt.getMonth() + 1).padStart(2, '0')}`;
    const matchKey = Array.from(buckets.keys()).find((entry) => entry.startsWith(key));
    if (!matchKey) {
      return;
    }
    buckets.set(matchKey, (buckets.get(matchKey) || 0) + getAppointmentAmount(item));
  });

  return Array.from(buckets.entries()).map(([key, value]) => ({
    label: key.split('|')[1] || key,
    value,
  }));
}

function buildPolylinePoints(values: number[], width: number, height: number) {
  if (values.length === 0) {
    return '';
  }
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${x},${y}`;
    })
    .join(' ');
}

function DonutCard({
  title,
  items,
  valueFormatter,
}: {
  title: string;
  items: DistributionItem[];
  valueFormatter?: (value: number) => string;
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
          <p className="mt-2 text-[28px] font-extrabold leading-none text-ink">
            {total > 0 ? valueFormatter?.(total) || total : '—'}
          </p>
        </div>
        <div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background }}>
          <div className="absolute inset-[14px] rounded-full bg-white" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-sm font-semibold text-[#55606f]">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.label}</span>
              </div>
              <span className="shrink-0 text-ink">
                {valueFormatter ? valueFormatter(item.value) : item.value}
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

function SegmentChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
        active
          ? 'border-[#f4c900] bg-[#fff8d9] text-[#222b33]'
          : 'border-[#dde3eb] bg-white text-[#6b7582] hover:border-[#cfd7e1] hover:text-ink',
      )}
    >
      <span>{label}</span>
      <span
        className={clsx(
          'rounded-full px-2 py-0.5 text-xs font-extrabold',
          active ? 'bg-[#f4c900] text-[#222b33]' : 'bg-[#f1f4f8] text-[#7b8592]',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 min-w-[220px] appearance-none rounded-2xl border border-[#dce2ea] bg-white pl-4 pr-12 text-sm font-semibold text-ink outline-none transition focus:border-[#c2ccd9]"
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

export function ClientsScreen({
  clients,
  appointments,
  query,
  loading,
  canEdit,
  canManageAvatars,
  canManageDiscounts,
  canManagePromocodes,
  onQueryChange,
  onOpenTools,
  onReload,
  onOpenClientActions,
  onDeleteClient,
}: ClientsScreenProps) {
  const [desktopClient, setDesktopClient] = useState<ClientItem | null>(null);
  const [desktopTab, setDesktopTab] = useState<ClientModalTab>('card');
  const [segment, setSegment] = useState<ClientSegment>('all');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDesktop, setIsDesktop] = useState(isDesktopViewport);
  const [clientOverrides, setClientOverrides] = useState<Record<string, Partial<ClientItem>>>({});
  const [draft, setDraft] = useState<ClientDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [discountDirty, setDiscountDirty] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [statsFrom, setStatsFrom] = useState('');
  const [statsTo, setStatsTo] = useState('');
  const [promoDiscountPercent, setPromoDiscountPercent] = useState('');
  const [promoExpiresOn, setPromoExpiresOn] = useState('');
  const [promoSending, setPromoSending] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoResult, setPromoResult] = useState<PromoSendResult | null>(null);
  const clientAvatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const media = window.matchMedia('(min-width: 768px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };
    setIsDesktop(media.matches);
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!isDesktop || !desktopClient) {
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
      return undefined;
    }
    const previousRootOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [desktopClient, isDesktop]);

  const effectiveClients = useMemo(
    () =>
      clients.map((client) => ({
        ...client,
        ...(clientOverrides[client.id] || {}),
      })),
    [clientOverrides, clients],
  );
  const appointmentLookup = useMemo(() => buildAppointmentLookup(appointments), [appointments]);

  const clientSummaries = useMemo(
    () =>
      effectiveClients.map((client) =>
        buildClientSummary(client, getLinkedAppointmentsForClient(client, appointmentLookup)),
      ),
    [appointmentLookup, effectiveClients],
  );
  const summaryByClientId = useMemo(
    () => new Map(clientSummaries.map((summary) => [summary.client.id, summary])),
    [clientSummaries],
  );
  const nowMs = Date.now();
  const segmentCounts = useMemo(() => {
    const counts: Record<ClientSegment, number> = {
      all: clientSummaries.length,
      new: 0,
      repeat: 0,
      lost: 0,
    };
    clientSummaries.forEach((summary) => {
      counts[getClientSegment(summary, nowMs)] += 1;
    });
    return counts;
  }, [clientSummaries, nowMs]);

  const filteredSummaries = useMemo(() => {
    const rows = clientSummaries.filter((summary) => {
      if (segment !== 'all' && getClientSegment(summary, nowMs) !== segment) {
        return false;
      }
      if (activityFilter === 'visited' && summary.totalVisits === 0) {
        return false;
      }
      if (activityFilter === 'without-visits' && summary.totalVisits > 0) {
        return false;
      }
      return true;
    });

    rows.sort((left, right) => {
      if (sortMode === 'visits') {
        return right.totalVisits - left.totalVisits || left.client.name.localeCompare(right.client.name);
      }
      if (sortMode === 'revenue') {
        return right.totalRevenue - left.totalRevenue || left.client.name.localeCompare(right.client.name);
      }
      const leftTs = left.lastVisit?.getTime() ?? 0;
      const rightTs = right.lastVisit?.getTime() ?? 0;
      return rightTs - leftTs || left.client.name.localeCompare(right.client.name);
    });

    return rows;
  }, [activityFilter, clientSummaries, nowMs, segment, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredSummaries.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => filteredSummaries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, filteredSummaries],
  );
  const pageButtons = useMemo(() => buildPages(currentPage, totalPages), [currentPage, totalPages]);
  const totalRevenue = filteredSummaries.reduce((sum, item) => sum + item.totalRevenue, 0);
  const visitedClientsCount = filteredSummaries.filter((item) => item.totalVisits > 0).length;
  const repeatClientsCount = filteredSummaries.filter(
    (item) => getClientSegment(item, nowMs) === 'repeat',
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [query, segment, activityFilter, sortMode]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const activeClient = useMemo(
    () =>
      desktopClient
        ? {
            ...desktopClient,
            ...(clientOverrides[desktopClient.id] || {}),
          }
        : null,
    [clientOverrides, desktopClient],
  );
  const activeClientId = activeClient?.id || '';
  const activeClientName = activeClient?.name || '';
  const activeClientPhone = activeClient?.phone || '';
  const activeClientEmail = activeClient?.email || '';
  const activeClientComment = activeClient?.comment || '';
  const activeClientAvatarUrl = activeClient?.avatarUrl || null;
  const activeSummary = activeClient ? summaryByClientId.get(activeClient.id) ?? null : null;
  const filteredHistory = useMemo(() => {
    if (!activeSummary) {
      return [];
    }
    return activeSummary.appointments.filter((item) => {
      if (historyFilter === 'all') {
        return true;
      }
      if (historyFilter === 'upcoming') {
        return item.status === 'PENDING';
      }
      if (historyFilter === 'confirmed') {
        return item.status === 'CONFIRMED';
      }
      if (historyFilter === 'arrived') {
        return item.status === 'ARRIVED' || item.status === 'DONE' || item.status === 'COMPLETED';
      }
      return item.status === 'NO_SHOW';
    });
  }, [activeSummary, historyFilter]);

  const statsHistory = useMemo(() => {
    if (!activeSummary) {
      return [];
    }
    const fromBoundary = statsFrom ? new Date(`${statsFrom}T00:00:00`) : null;
    const toBoundary = statsTo ? new Date(`${statsTo}T23:59:59`) : null;
    return activeSummary.appointments.filter((item) => {
      if (fromBoundary && item.startAt < fromBoundary) {
        return false;
      }
      if (toBoundary && item.startAt > toBoundary) {
        return false;
      }
      return true;
    });
  }, [activeSummary, statsFrom, statsTo]);
  const statsSeries = useMemo(
    () => buildRevenueSeries(statsHistory, statsFrom || toISODate(new Date()), statsTo || toISODate(new Date())),
    [statsFrom, statsHistory, statsTo],
  );
  const statsPolyline = useMemo(
    () => buildPolylinePoints(statsSeries.map((item) => item.value), 640, 180),
    [statsSeries],
  );
  const activeStatsSummary = useMemo(
    () => (activeClient ? buildClientSummary(activeClient, statsHistory) : null),
    [activeClient, statsHistory],
  );

  useEffect(() => {
    if (!activeClientId) {
      setDraft(null);
      setDraftLoading(false);
      setDraftSaving(false);
      setDraftError('');
      setEditMode(false);
      setDiscountDirty(false);
      setHistoryFilter('all');
      setPromoDiscountPercent('');
      setPromoExpiresOn('');
      setPromoSending(false);
      setPromoError('');
      setPromoResult(null);
      return;
    }

    setDesktopTab('card');
    setHistoryFilter('all');
    setEditMode(false);
    setDiscountDirty(false);
    setDraftError('');
    setDraft({
      name: activeClientName,
      phone: activeClientPhone,
      email: activeClientEmail,
      comment: activeClientComment,
      avatarUrl: activeClientAvatarUrl,
      permanentDiscountPercent:
        activeClient?.permanentDiscountType === 'PERCENT' && activeClient.permanentDiscountValue !== null
          ? String(activeClient.permanentDiscountValue)
          : '',
    });
    setPromoDiscountPercent('');
    setPromoExpiresOn('');
    setPromoSending(false);
    setPromoError('');
    setPromoResult(null);

    const firstDate = activeSummary?.firstVisit ? toISODate(activeSummary.firstVisit) : toISODate(new Date());
    const lastDate = activeSummary?.lastVisit ? toISODate(activeSummary.lastVisit) : toISODate(new Date());
    setStatsFrom(firstDate);
    setStatsTo(lastDate);

    let cancelled = false;
    setDraftLoading(true);
    void (async () => {
      try {
        const data = await api.get<unknown>(`/clients/${activeClientId}`);
        if (cancelled) {
          return;
        }
        const root = toRecord(data);
        const details = toRecord(root?.client) ?? root;
        const nextClient: Partial<ClientItem> = {
          name: toString(details?.name) || activeClientName,
          phone: toString(details?.phoneE164) || toString(details?.phone) || activeClientPhone,
          email: toString(details?.email) || activeClientEmail || '',
          comment: toString(details?.comment) || activeClientComment || '',
          avatarUrl:
            toString(details?.avatarUrl) ||
            toString(details?.photoUrl) ||
            toString(details?.imageUrl) ||
            activeClientAvatarUrl ||
            null,
          permanentDiscountType:
            toString(toRecord(toRecord(details?.discount)?.permanent)?.type) ||
            toString(details?.discountType) ||
            activeClient?.permanentDiscountType ||
            'NONE',
          permanentDiscountValue:
            toNumber(toRecord(toRecord(details?.discount)?.permanent)?.value) ??
            toNumber(details?.discountValue) ??
            activeClient?.permanentDiscountValue ??
            null,
        };
        setClientOverrides((prev) => ({
          ...prev,
          [activeClientId]: {
            ...(prev[activeClientId] || {}),
            ...nextClient,
          },
        }));
        setDraft({
          name: nextClient.name || activeClientName,
          phone: nextClient.phone || activeClientPhone,
          email: nextClient.email || '',
          comment: nextClient.comment || '',
          avatarUrl: nextClient.avatarUrl || null,
          permanentDiscountPercent:
            nextClient.permanentDiscountType === 'PERCENT' &&
            typeof nextClient.permanentDiscountValue === 'number'
              ? String(nextClient.permanentDiscountValue)
              : '',
        });
      } catch {
        if (!cancelled) {
          setDraft({
            name: activeClientName,
            phone: activeClientPhone,
            email: activeClientEmail,
            comment: activeClientComment,
            avatarUrl: activeClientAvatarUrl,
            permanentDiscountPercent:
              activeClient?.permanentDiscountType === 'PERCENT' &&
              activeClient.permanentDiscountValue !== null
                ? String(activeClient.permanentDiscountValue)
                : '',
          });
        }
      } finally {
        if (!cancelled) {
          setDraftLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeClientAvatarUrl,
    activeClientComment,
    activeClient?.permanentDiscountType,
    activeClient?.permanentDiscountValue,
    activeClientEmail,
    activeClientId,
    activeClientName,
    activeClientPhone,
    activeSummary?.firstVisit,
    activeSummary?.lastVisit,
  ]);

  const handleOpenClient = (client: ClientItem) => {
    setDesktopClient(client);
    setDesktopTab('card');
  };

  const handleCloseDesktopClient = () => {
    setDesktopClient(null);
  };

  const handleDraftChange = (key: keyof ClientDraft, value: string) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            [key]: value,
          }
        : prev,
    );
  };

  const handlePermanentDiscountChange = (value: string) => {
    setDiscountDirty(true);
    handleDraftChange('permanentDiscountPercent', value);
  };

  const applyClientUpdateLocally = (clientId: string, nextClient: Partial<ClientItem>, nextDraft?: Partial<ClientDraft>) => {
    setClientOverrides((prev) => ({
      ...prev,
      [clientId]: {
        ...(prev[clientId] || {}),
        ...nextClient,
      },
    }));
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            ...(nextDraft || {}),
          }
        : prev,
    );
  };

  const extractUpdatedClient = (payload: unknown, fallback: ClientItem, fallbackDraft: ClientDraft | null) => {
    const root = toRecord(payload);
    const updated = toRecord(root?.client) ?? root;

    return {
      name: toString(updated?.name) || fallback.name,
      phone: toString(updated?.phoneE164) || toString(updated?.phone) || fallback.phone,
      email: toString(updated?.email) || fallback.email || '',
      comment: toString(updated?.comment) || fallback.comment || '',
      avatarUrl:
        toString(updated?.avatarUrl) ||
        toString(updated?.photoUrl) ||
        toString(updated?.imageUrl) ||
        fallbackDraft?.avatarUrl ||
        fallback.avatarUrl ||
        null,
      permanentDiscountType:
        toString(toRecord(toRecord(updated?.discount)?.permanent)?.type) ||
        toString(updated?.discountType) ||
        fallback.permanentDiscountType ||
        'NONE',
      permanentDiscountValue:
        toNumber(toRecord(toRecord(updated?.discount)?.permanent)?.value) ??
        toNumber(updated?.discountValue) ??
        fallback.permanentDiscountValue ??
        null,
    } satisfies Partial<ClientItem>;
  };

  const handleUploadAvatar = async (file: File) => {
    if (!activeClient) {
      return;
    }
    if (!canManageAvatars) {
      setDraftError('Нет прав на управление аватаркой клиента');
      return;
    }

    setAvatarBusy(true);
    setDraftError('');

    let previewUrlToRevoke = '';

    try {
      const converted = await convertImageFileToWebp(file);
      previewUrlToRevoke = converted.previewUrl;

      const formData = new FormData();
      formData.append(
        'file',
        new File([converted.blob], `${activeClient.id}.webp`, {
          type: 'image/webp',
        }),
      );

      const response = await api.postForm<unknown>(`/clients/${activeClient.id}/avatar`, formData);
      const nextClient = extractUpdatedClient(response, activeClient, draft);

      applyClientUpdateLocally(
        activeClient.id,
        nextClient,
        {
          avatarUrl: nextClient.avatarUrl || null,
        },
      );
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : 'Не удалось загрузить аватарку клиента');
    } finally {
      if (previewUrlToRevoke) {
        URL.revokeObjectURL(previewUrlToRevoke);
      }
      setAvatarBusy(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!activeClient) {
      return;
    }
    if (!canManageAvatars) {
      setDraftError('Нет прав на управление аватаркой клиента');
      return;
    }

    setAvatarBusy(true);
    setDraftError('');

    try {
      const response = await api.delete<unknown>(`/clients/${activeClient.id}/avatar`);
      const nextClient = extractUpdatedClient(response, activeClient, {
        ...(draft || mapClientToDraft(activeClient)),
        avatarUrl: null,
      });

      applyClientUpdateLocally(
        activeClient.id,
        {
          ...nextClient,
          avatarUrl: null,
        },
        {
          avatarUrl: null,
        },
      );
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : 'Не удалось удалить аватарку клиента');
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleOpenAvatarPicker = () => {
    if (!editMode || draftLoading || avatarBusy || !canManageAvatars) {
      return;
    }
    clientAvatarInputRef.current?.click();
  };

  const handleSaveClient = async () => {
    if (!activeClient || !draft) {
      return;
    }
    if (!canEdit) {
      setDraftError('Нет прав на редактирование клиента');
      return;
    }
    const payload = {
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      comment: draft.comment.trim(),
    };
    if (!payload.name || !payload.phone) {
      setDraftError('Имя и телефон обязательны');
      return;
    }

    const nextDiscountPercent = parsePercentInput(draft.permanentDiscountPercent);
    if (draft.permanentDiscountPercent.trim() && nextDiscountPercent === null) {
      setDraftError('Постоянная скидка должна быть числом');
      return;
    }
    if (nextDiscountPercent !== null && (nextDiscountPercent < 0 || nextDiscountPercent > 100)) {
      setDraftError('Постоянная скидка должна быть в диапазоне 0–100%');
      return;
    }
    if (discountDirty && !canManageDiscounts) {
      setDraftError('Нет прав на управление скидками клиента');
      return;
    }

    setDraftSaving(true);
    setDraftError('');
    try {
      const data = await api.patch<unknown>(`/clients/${activeClient.id}`, {
        name: payload.name,
        phone: payload.phone,
        email: payload.email || null,
        comment: payload.comment || null,
      });
      const root = toRecord(data);
      const updated = toRecord(root?.client) ?? root;
      const nextClient: Partial<ClientItem> = {
        name: toString(updated?.name) || payload.name,
        phone: toString(updated?.phoneE164) || toString(updated?.phone) || payload.phone,
        email: toString(updated?.email) || payload.email,
        comment: toString(updated?.comment) || payload.comment,
        avatarUrl:
          toString(updated?.avatarUrl) ||
          toString(updated?.photoUrl) ||
          toString(updated?.imageUrl) ||
          draft.avatarUrl,
        permanentDiscountType: activeClient.permanentDiscountType || 'NONE',
        permanentDiscountValue: activeClient.permanentDiscountValue ?? null,
      };

      if (discountDirty) {
        const discountResponse = await api.updateClientPermanentDiscount(activeClient.id, nextDiscountPercent);
        const discountRoot = toRecord(discountResponse);
        const discountClient = toRecord(discountRoot?.client) ?? discountRoot;
        nextClient.permanentDiscountType =
          toString(toRecord(toRecord(discountClient?.discount)?.permanent)?.type) ||
          toString(discountClient?.discountType) ||
          (nextDiscountPercent === null ? 'NONE' : 'PERCENT');
        nextClient.permanentDiscountValue =
          toNumber(toRecord(toRecord(discountClient?.discount)?.permanent)?.value) ??
          toNumber(discountClient?.discountValue) ??
          nextDiscountPercent;
      }

      setClientOverrides((prev) => ({
        ...prev,
        [activeClient.id]: {
          ...(prev[activeClient.id] || {}),
          ...nextClient,
        },
      }));
      setDraft({
        name: nextClient.name || payload.name,
        phone: nextClient.phone || payload.phone,
        email: nextClient.email || '',
        comment: nextClient.comment || '',
        avatarUrl: nextClient.avatarUrl || null,
        permanentDiscountPercent:
          nextClient.permanentDiscountType === 'PERCENT' &&
          typeof nextClient.permanentDiscountValue === 'number'
            ? String(nextClient.permanentDiscountValue)
            : '',
      });
      setDiscountDirty(false);
      setEditMode(false);
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : 'Не удалось сохранить клиента');
    } finally {
      setDraftSaving(false);
    }
  };

  const handleSendPromocode = async () => {
    if (!activeClient) {
      return;
    }
    if (!canManagePromocodes) {
      setPromoError('Нет прав на отправку промокодов');
      return;
    }

    const percent = parsePercentInput(promoDiscountPercent);
    if (percent === null || percent <= 0 || percent > 100) {
      setPromoError('Промокод должен быть в процентах от 1 до 100');
      return;
    }

    const targetEmail = draft?.email.trim() || activeClient.email || '';
    if (!targetEmail) {
      setPromoError('У клиента нет email для отправки промокода');
      return;
    }

    setPromoSending(true);
    setPromoError('');
    setPromoResult(null);
    try {
      const endsAt = promoExpiresOn
        ? new Date(`${promoExpiresOn}T23:59:59.999`).toISOString()
        : undefined;
      const created = await api.createPromoCode({
        generate: true,
        prefix: 'MARI',
        length: 8,
        name: `Клиентский промокод для ${activeClient.name}`,
        description: `One-time промокод для клиента ${activeClient.name} (${activeClient.phone})`,
        discountType: 'PERCENT',
        discountValue: percent,
        startsAt: new Date().toISOString(),
        ...(endsAt ? { endsAt } : {}),
        maxUsages: 1,
        perClientUsageLimit: 1,
        isActive: true,
      });
      const promo = created.promo;
      const sent = await api.sendPromoCode(promo.id, {
        clientId: activeClient.id,
        email: targetEmail,
      });
      setPromoResult({
        code: sent.promo.code,
        email: sent.email,
        expiresAt: sent.promo.endsAt,
      });
      setPromoDiscountPercent('');
      setPromoExpiresOn('');
    } catch (error) {
      setPromoError(error instanceof Error ? error.message : 'Не удалось отправить промокод');
    } finally {
      setPromoSending(false);
    }
  };

  const handleCallClient = () => {
    if (!activeClient?.phone) {
      return;
    }
    window.location.href = `tel:${normalizePhoneForLink(activeClient.phone)}`;
  };

  const handleSmsClient = () => {
    if (!activeClient?.phone) {
      return;
    }
    window.location.href = `sms:${normalizePhoneForLink(activeClient.phone)}`;
  };

  const handleTelegramClient = () => {
    if (!activeClient?.phone) {
      return;
    }
    window.open(`https://t.me/${normalizePhoneForLink(activeClient.phone)}`, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteActiveClient = async () => {
    if (!activeClient) {
      return;
    }

    const deleted = await onDeleteClient(activeClient);
    if (deleted) {
      setDesktopClient(null);
      setDraft(null);
      setEditMode(false);
      setDraftError('');
    }
  };

  return (
    <>
      <div className="pb-6 pt-4 md:hidden">
        <section className="rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-5 shadow-[0_16px_34px_rgba(42,49,56,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Клиентская база</p>
              <h1 className="mt-2 text-[28px] font-extrabold leading-none text-ink">Клиенты</h1>
            </div>
            <div className="flex items-center gap-2 text-ink">
              <button type="button" onClick={onOpenTools} className="rounded-2xl border border-[#dde3eb] bg-white p-2">
                <MoreVertical className="h-5 w-5" />
              </button>
              <button type="button" onClick={onReload} className="rounded-2xl border border-[#dde3eb] bg-white p-2">
                <RefreshCcw className="h-5 w-5" strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <label className="mt-5 flex items-center gap-3 rounded-2xl border border-[#dce2ea] bg-white px-4 py-3 text-muted">
            <Search className="h-5 w-5 text-[#97a0ad]" />
            <input
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Поиск по имени, телефону или email"
              className="w-full bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:text-muted"
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SelectField
              value={activityFilter}
              onChange={(next) => setActivityFilter(next as ActivityFilter)}
              options={[
                { value: 'all', label: 'Все клиенты' },
                { value: 'visited', label: 'Только с визитами' },
                { value: 'without-visits', label: 'Без визитов' },
              ]}
            />
            <SelectField
              value={sortMode}
              onChange={(next) => setSortMode(next as SortMode)}
              options={[
                { value: 'recent', label: 'По последнему визиту' },
                { value: 'visits', label: 'По числу визитов' },
                { value: 'revenue', label: 'По выручке' },
              ]}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(SEGMENT_LABELS) as ClientSegment[]).map((key) => (
              <SegmentChip
                key={key}
                active={segment === key}
                label={SEGMENT_LABELS[key]}
                count={segmentCounts[key]}
                onClick={() => setSegment(key)}
              />
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">После фильтра</p>
              <p className="mt-2 text-[24px] font-extrabold leading-none text-ink">{filteredSummaries.length}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">С визитами</p>
              <p className="mt-2 text-[24px] font-extrabold leading-none text-ink">{visitedClientsCount}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">Выручка</p>
              <p className="mt-2 text-[24px] font-extrabold leading-none text-ink">{formatGroupedRub(totalRevenue)}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">Повторные</p>
              <p className="mt-2 text-[24px] font-extrabold leading-none text-ink">{repeatClientsCount}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[28px] border border-[#e2e6ed] bg-[#fcfcfd] p-4 shadow-[0_16px_34px_rgba(42,49,56,0.08)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#eef2f6] px-1 pb-4">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8d95a1]">Список клиентов</p>
              <p className="mt-2 text-[24px] font-extrabold leading-none text-ink">{filteredSummaries.length}</p>
            </div>
            {loading ? (
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загружаю...
              </div>
            ) : null}
          </div>

          {!loading && filteredSummaries.length === 0 ? (
            <p className="px-1 py-6 text-[16px] font-semibold text-muted">Ничего не найдено</p>
          ) : null}

          <ul className="space-y-3 pt-4">
            {pageItems.map((summary) => {
              const clientSegment = getClientSegment(summary, nowMs);
              return (
                <li key={summary.client.id}>
                  <div className="flex items-start gap-3 rounded-[24px] border border-[#edf1f5] bg-white px-4 py-4">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      onClick={() => handleOpenClient(summary.client)}
                    >
                      {summary.client.avatarUrl ? (
                        <img
                          src={summary.client.avatarUrl}
                          alt={summary.client.name}
                          className="h-14 w-14 shrink-0 rounded-[18px] object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#eff3f7] text-sm font-extrabold text-[#5f6978]">
                          {getClientInitials(summary.client.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[18px] font-extrabold text-ink">{summary.client.name}</p>
                          <span
                            className={clsx(
                              'inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em]',
                              clientSegment === 'repeat'
                                ? 'bg-[#e8f0ff] text-[#2d5fd6]'
                                : clientSegment === 'lost'
                                  ? 'bg-[#f2f4f7] text-[#7f8897]'
                                  : 'bg-[#fff3cc] text-[#9b7322]',
                            )}
                          >
                            {SEGMENT_LABELS[clientSegment]}
                          </span>
                        </div>
                        <p className="mt-2 text-[14px] font-semibold text-[#6e7784]">
                          {summary.client.phone || 'нет телефона'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#f4f6f9] px-3 py-1 text-[12px] font-bold text-[#5f6978]">
                            {summary.totalVisits} визитов
                          </span>
                          <span className="rounded-full bg-[#f4f6f9] px-3 py-1 text-[12px] font-bold text-[#5f6978]">
                            {formatGroupedRub(summary.totalRevenue)}
                          </span>
                        </div>
                      </div>
                    </button>

                    <button type="button" className="shrink-0 p-2 text-ink" onClick={() => onOpenClientActions(summary.client)}>
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eef2f6] px-1 pt-4">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-4 text-sm font-semibold text-ink disabled:opacity-45"
              >
                <ChevronLeft className="h-4 w-4" />
                Назад
              </button>
              <div className="text-sm font-semibold text-[#7d8693]">
                {currentPage} / {totalPages}
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-4 text-sm font-semibold text-ink disabled:opacity-45"
              >
                Вперед
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <div className="hidden pb-6 md:block">
        <section className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">Клиентская база</p>
              <h1 className="mt-3 text-[44px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                Клиенты
              </h1>
              <p className="mt-4 max-w-[560px] text-[15px] font-semibold leading-6 text-[#7c8491]">
                База клиентов с быстрым поиском, сегментацией и аналитикой по визитам из журнала.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenTools}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-semibold text-ink"
              >
                <MoreVertical className="h-4 w-4 text-[#8892a2]" />
                Инструменты
              </button>
              <button
                type="button"
                onClick={onReload}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)]"
              >
                <RefreshCcw className="h-4 w-4" />
                Обновить базу
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_220px_220px]">
            <label className="flex items-center gap-3 rounded-2xl border border-[#dce2ea] bg-white px-4 py-3 text-muted">
              <Search className="h-5 w-5 text-[#97a0ad]" />
              <input
                type="text"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Поиск по имени, телефону или email"
                className="w-full bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:text-[#9aa2af]"
              />
            </label>
            <SelectField
              value={activityFilter}
              onChange={(next) => setActivityFilter(next as ActivityFilter)}
              options={[
                { value: 'all', label: 'Все клиенты' },
                { value: 'visited', label: 'Только с визитами' },
                { value: 'without-visits', label: 'Без визитов' },
              ]}
            />
            <SelectField
              value={sortMode}
              onChange={(next) => setSortMode(next as SortMode)}
              options={[
                { value: 'recent', label: 'По последнему визиту' },
                { value: 'visits', label: 'По числу визитов' },
                { value: 'revenue', label: 'По выручке' },
              ]}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {(Object.keys(SEGMENT_LABELS) as ClientSegment[]).map((key) => (
              <SegmentChip
                key={key}
                active={segment === key}
                label={SEGMENT_LABELS[key]}
                count={segmentCounts[key]}
                onClick={() => setSegment(key)}
              />
            ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-4">
            <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Всего клиентов</p>
              <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{filteredSummaries.length}</p>
            </div>
            <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">С визитами</p>
              <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{visitedClientsCount}</p>
            </div>
            <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Выручка</p>
              <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{formatGroupedRub(totalRevenue)}</p>
            </div>
            <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Повторные</p>
              <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{repeatClientsCount}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#eef2f6] px-6 py-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8d95a1]">Список клиентов</p>
              <p className="mt-2 text-[28px] font-extrabold leading-none text-ink">{filteredSummaries.length}</p>
            </div>
            {loading ? (
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загружаю клиентов...
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="px-6 py-4">
              <div className="animate-pulse overflow-hidden rounded-[26px] border border-[#edf1f5]">
                <div className="grid grid-cols-[2fr_1.4fr_1.5fr_1fr_0.8fr_0.9fr_1.1fr_1.1fr] gap-4 bg-[#f7f9fc] px-5 py-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-4 rounded-full bg-[#e4e9f0]" />
                  ))}
                </div>
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="grid grid-cols-[2fr_1.4fr_1.5fr_1fr_0.8fr_0.9fr_1.1fr_1.1fr] gap-4 border-t border-[#eef2f6] px-5 py-5">
                    {Array.from({ length: 8 }).map((__, cellIndex) => (
                      <div key={cellIndex} className="h-4 rounded-full bg-[#eff3f7]" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!loading && filteredSummaries.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-[28px] font-extrabold text-ink">Ничего не найдено</p>
              <p className="mt-3 text-base font-semibold text-[#7d8693]">
                Измените поиск или фильтры, чтобы увидеть клиентов.
              </p>
            </div>
          ) : null}

          {!loading && filteredSummaries.length > 0 ? (
            <>
              <div className="overflow-x-auto px-4 py-4">
                <table className="min-w-full overflow-hidden rounded-[26px] border border-[#edf1f5]">
                  <thead className="bg-[#f7f9fc]">
                    <tr className="text-left text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">
                      <th className="px-5 py-4">Имя</th>
                      <th className="px-5 py-4">Телефон</th>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Продано</th>
                      <th className="px-5 py-4">Визиты</th>
                      <th className="px-5 py-4">Скидка</th>
                      <th className="px-5 py-4">Последний визит</th>
                      <th className="px-5 py-4">Первый визит</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((summary) => {
                      const clientSegment = getClientSegment(summary, nowMs);
                      return (
                        <tr
                          key={summary.client.id}
                          className="cursor-pointer border-t border-[#eef2f6] text-sm font-semibold text-[#4e5867] transition hover:bg-[#f8fafc]"
                          onClick={() => handleOpenClient(summary.client)}
                        >
                          <td className="px-5 py-5">
                            <div className="flex items-center gap-4">
                              {summary.client.avatarUrl ? (
                                <img
                                  src={summary.client.avatarUrl}
                                  alt={summary.client.name}
                                  className="h-12 w-12 shrink-0 rounded-2xl object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eff3f7] text-sm font-extrabold text-[#5f6978]">
                                  {getClientInitials(summary.client.name)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-[17px] font-extrabold text-ink">{summary.client.name}</p>
                                <span
                                  className={clsx(
                                    'mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em]',
                                    clientSegment === 'repeat'
                                      ? 'bg-[#e8f0ff] text-[#2d5fd6]'
                                      : clientSegment === 'lost'
                                        ? 'bg-[#f2f4f7] text-[#7f8897]'
                                        : 'bg-[#fff3cc] text-[#9b7322]',
                                  )}
                                >
                                  {SEGMENT_LABELS[clientSegment]}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-5">{summary.client.phone || '—'}</td>
                          <td className="px-5 py-5">{summary.client.email || '—'}</td>
                          <td className="px-5 py-5 text-ink">{formatGroupedRub(summary.totalRevenue)}</td>
                          <td className="px-5 py-5">{summary.totalVisits}</td>
                          <td className="px-5 py-5">{Math.round(summary.averageDiscount)}%</td>
                          <td className="px-5 py-5">{formatDateTime(summary.lastVisit)}</td>
                          <td className="px-5 py-5">{formatDateTime(summary.firstVisit)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-[#eef2f6] px-6 py-5">
                <div className="text-sm font-semibold text-[#7d8693]">
                  Показаны {filteredSummaries.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
                  {'–'}
                  {Math.min(currentPage * PAGE_SIZE, filteredSummaries.length)} из {filteredSummaries.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Назад
                  </button>
                  <div className="flex items-center gap-2">
                    {pageButtons.map((pageNumber, index) => {
                      const previous = pageButtons[index - 1];
                      const showGap = previous && pageNumber - previous > 1;
                      return (
                        <div key={pageNumber} className="flex items-center gap-2">
                          {showGap ? <span className="px-1 text-sm font-bold text-[#95a0ae]">…</span> : null}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(pageNumber)}
                            className={clsx(
                              'flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-extrabold transition',
                              currentPage === pageNumber
                                ? 'border-[#f4c900] bg-[#f4c900] text-[#222b33]'
                                : 'border-[#dde3eb] bg-white text-[#7b8592] hover:text-ink',
                            )}
                          >
                            {pageNumber}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Вперед
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>

      {!isDesktop && activeClient ? (
        <PageSheet
          open={!isDesktop && Boolean(activeClient)}
          onDismiss={handleCloseDesktopClient}
          snapPoints={({ maxHeight }) => [Math.max(560, maxHeight - 8)]}
          defaultSnap={({ snapPoints }) => snapPoints[snapPoints.length - 1] ?? 0}
        >
          <div className="bg-white px-4 pb-6 pt-2">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Клиент</p>
                <h2 className="mt-2 truncate text-[28px] font-extrabold leading-none text-ink">
                  {activeClient.name}
                </h2>
                <p className="mt-2 text-[14px] font-semibold text-[#748091]">
                  {activeClient.phone || 'Телефон не указан'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseDesktopClient}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dde3eb] bg-white text-[#6e7784]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#f4f6f9] p-1">
              {[
                { key: 'card', label: 'Карточка' },
                { key: 'history', label: 'История' },
                { key: 'stats', label: 'Статистика' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setDesktopTab(item.key as ClientModalTab)}
                  className={clsx(
                    'rounded-2xl px-3 py-2 text-[13px] font-extrabold transition',
                    desktopTab === item.key
                      ? 'bg-white text-ink shadow-[0_8px_18px_rgba(42,49,56,0.08)]'
                      : 'text-[#7d8693]',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {desktopTab === 'card' ? (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={handleCallClient}
                    disabled={!activeClient.phone}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-3 text-sm font-semibold text-ink disabled:opacity-40"
                  >
                    <Phone className="h-4 w-4" />
                    Звонок
                  </button>
                  <button
                    type="button"
                    onClick={handleSmsClient}
                    disabled={!activeClient.phone}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-3 text-sm font-semibold text-ink disabled:opacity-40"
                  >
                    <MessageSquare className="h-4 w-4" />
                    SMS
                  </button>
                  <button
                    type="button"
                    onClick={handleTelegramClient}
                    disabled={!activeClient.phone}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#222b33] px-3 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    <MessageCircle className="h-4 w-4" />
                    TG
                  </button>
                </div>

                <section className="rounded-[28px] border border-[#e3e8ef] bg-white p-4 shadow-[0_10px_24px_rgba(42,49,56,0.05)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Карточка клиента</p>
                      <p className="mt-2 text-[14px] font-semibold text-[#7d8693]">
                        Основные данные, скидка, аватар и комментарий.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {editMode ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditMode(false);
                              setDiscountDirty(false);
                              setDraft(mapClientToDraft(activeClient));
                              setDraftError('');
                            }}
                            className="inline-flex h-10 items-center rounded-2xl border border-[#dde3eb] bg-[#f7f9fc] px-3 text-sm font-semibold text-ink"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleSaveClient();
                            }}
                            disabled={draftSaving}
                            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#f4c900] px-3 text-sm font-extrabold text-[#222b33] disabled:opacity-60"
                          >
                            {draftSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Сохранить
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditMode(true)}
                          disabled={!canEdit}
                          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f7f9fc] px-3 text-sm font-semibold text-ink disabled:opacity-40"
                        >
                          <PencilLine className="h-4 w-4" />
                          Редактировать
                        </button>
                      )}
                    </div>
                  </div>

                  {draftError ? (
                    <div className="mt-4 rounded-2xl border border-[#f1d0c8] bg-[#fff4f0] px-4 py-3 text-sm font-semibold text-[#bc5941]">
                      {draftError}
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-4">
                    <div className="rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Аватар клиента</p>
                      <div className="mt-4 flex items-center gap-4">
                        {draft?.avatarUrl ? (
                          <img
                            src={draft.avatarUrl}
                            alt={activeClient.name}
                            className="h-20 w-20 rounded-[24px] border border-[#dde3eb] object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-[#dde3eb] bg-white text-xl font-extrabold text-[#737d8b]">
                            {getClientInitials(activeClient.name)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-6 text-[#7d8693]">
                            Фото клиента отображается в карточке и в связанных сценариях.
                          </p>
                          {avatarBusy ? (
                            <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#7d8693]">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Обновляю аватарку...
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <input
                        ref={clientAvatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          if (!file) {
                            return;
                          }
                          void handleUploadAvatar(file);
                        }}
                      />
                      {editMode ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={handleOpenAvatarPicker}
                            disabled={draftLoading || avatarBusy || !canManageAvatars}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-4 text-sm font-semibold text-ink disabled:opacity-50"
                          >
                            <ImagePlus className="h-4 w-4" />
                            {draft?.avatarUrl ? 'Изменить фото' : 'Добавить фото'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDeleteAvatar();
                            }}
                            disabled={draftLoading || avatarBusy || !canManageAvatars || !draft?.avatarUrl}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#f1d0c8] bg-[#fff4f0] px-4 text-sm font-semibold text-[#bc5941] disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Удалить фото
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Имя</span>
                      <input
                        type="text"
                        value={draft?.name || ''}
                        onChange={(event) => handleDraftChange('name', event.target.value)}
                        disabled={!editMode || draftLoading}
                        className="h-12 w-full rounded-2xl border border-[#dce2ea] bg-[#f9fbfd] px-4 text-base font-semibold text-ink outline-none disabled:opacity-80"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Телефон</span>
                      <input
                        type="text"
                        value={draft?.phone || ''}
                        onChange={(event) => handleDraftChange('phone', event.target.value)}
                        disabled={!editMode || draftLoading}
                        className="h-12 w-full rounded-2xl border border-[#dce2ea] bg-[#f9fbfd] px-4 text-base font-semibold text-ink outline-none disabled:opacity-80"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Email</span>
                      <input
                        type="email"
                        value={draft?.email || ''}
                        onChange={(event) => handleDraftChange('email', event.target.value)}
                        disabled={!editMode || draftLoading}
                        className="h-12 w-full rounded-2xl border border-[#dce2ea] bg-[#f9fbfd] px-4 text-base font-semibold text-ink outline-none disabled:opacity-80"
                      />
                    </label>

                    <div className="rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff5cf] text-[#9b7322]">
                          <BadgePercent className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Постоянная скидка</p>
                          <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                            Процент скидки для постоянного клиента.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={draft?.permanentDiscountPercent || ''}
                          onChange={(event) => handlePermanentDiscountChange(event.target.value)}
                          disabled={!editMode || draftLoading || !canManageDiscounts}
                          placeholder="Например, 10"
                          className="h-12 w-full rounded-2xl border border-[#dce2ea] bg-white px-4 text-base font-semibold text-ink outline-none disabled:opacity-70"
                        />
                        <span className="text-sm font-extrabold text-[#738094]">%</span>
                      </div>
                      <p className="mt-3 text-xs font-semibold text-[#98a1ae]">
                        Очистите поле, чтобы убрать постоянную скидку.
                      </p>
                    </div>

                    <div className="rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Комментарий</p>
                      <textarea
                        value={draft?.comment || ''}
                        onChange={(event) => handleDraftChange('comment', event.target.value)}
                        disabled={!editMode || draftLoading}
                        className="mt-4 h-32 w-full resize-none rounded-[24px] border border-[#dce2ea] bg-white px-4 py-4 text-base font-medium leading-7 text-ink outline-none disabled:opacity-80"
                        placeholder="Комментарий по клиенту"
                      />
                    </div>

                    {canManagePromocodes ? (
                      <div className="rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#2d5fd6]">
                            <Mail className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Отправить промокод</p>
                            <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                              Одноразовый промокод в процентах на email клиента.
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3">
                          <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">Скидка</p>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min="1"
                                max="100"
                                step="1"
                                value={promoDiscountPercent}
                                onChange={(event) => setPromoDiscountPercent(event.target.value)}
                                disabled={promoSending || !canManagePromocodes}
                                placeholder="15"
                                className="h-12 w-full rounded-2xl border border-[#dce2ea] bg-white px-4 text-base font-semibold text-ink outline-none disabled:opacity-70"
                              />
                              <span className="text-sm font-extrabold text-[#738094]">%</span>
                            </div>
                          </div>
                          <label className="block">
                            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">Действует до</span>
                            <input
                              type="date"
                              value={promoExpiresOn}
                              onChange={(event) => setPromoExpiresOn(event.target.value)}
                              disabled={promoSending || !canManagePromocodes}
                              className="h-12 w-full rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-ink outline-none disabled:opacity-70"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void handleSendPromocode();
                          }}
                          disabled={promoSending || !canManagePromocodes}
                          className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#f4c900] px-4 text-sm font-extrabold text-[#222b33] disabled:opacity-60"
                        >
                          {promoSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                          Отправить
                        </button>
                        <p className="mt-3 text-xs font-semibold text-[#98a1ae]">
                          Email отправки: {draft?.email.trim() || activeClient.email || 'не указан'}
                        </p>
                        {promoError ? (
                          <div className="mt-3 rounded-2xl border border-[#f1d0c8] bg-[#fff4f0] px-4 py-3 text-sm font-semibold text-[#bc5941]">
                            {promoError}
                          </div>
                        ) : null}
                        {promoResult ? (
                          <div className="mt-3 rounded-2xl border border-[#d7eadf] bg-[#eef8f2] px-4 py-3 text-sm font-semibold text-[#2e7a4a]">
                            Промокод <span className="font-extrabold">{promoResult.code}</span> отправлен на {promoResult.email}
                            {promoResult.expiresAt
                              ? `, действует до ${formatHistoryDate(new Date(promoResult.expiresAt))}`
                              : ', без ограничения по дате'}
                            .
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-[#e5e9f0] bg-[#f8fafc] px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Визитов</p>
                        <p className="mt-2 text-[24px] font-extrabold leading-none text-ink">{activeSummary?.totalVisits ?? 0}</p>
                      </div>
                      <div className="rounded-2xl border border-[#e5e9f0] bg-[#f8fafc] px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Средний чек</p>
                        <p className="mt-2 text-[24px] font-extrabold leading-none text-ink">
                          {activeSummary ? formatGroupedRub(activeSummary.averageCheck) : '—'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#e5e9f0] bg-[#f8fafc] px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Первый визит</p>
                        <p className="mt-2 text-sm font-extrabold text-ink">{formatDateTime(activeSummary?.firstVisit || null)}</p>
                      </div>
                      <div className="rounded-2xl border border-[#e5e9f0] bg-[#f8fafc] px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Последний визит</p>
                        <p className="mt-2 text-sm font-extrabold text-ink">{formatDateTime(activeSummary?.lastVisit || null)}</p>
                      </div>
                    </div>

                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleDeleteActiveClient();
                        }}
                        disabled={draftSaving || loading}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#f1d0c8] bg-[#fff4f0] px-4 text-sm font-semibold text-[#bc5941] disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Удалить клиента
                      </button>
                    ) : null}
                  </div>
                </section>
              </div>
            ) : null}

            {desktopTab === 'history' ? (
              <div className="space-y-4 pt-4">
                <section className="rounded-[28px] border border-[#e3e8ef] bg-white p-4 shadow-[0_10px_24px_rgba(42,49,56,0.05)]">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">История посещений</p>
                  <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                    Все записи клиента, найденные по ID и телефону в журнале.
                  </p>
                  <div className="mt-4">
                    <SelectField
                      value={historyFilter}
                      onChange={(next) => setHistoryFilter(next as HistoryFilter)}
                      options={[
                        { value: 'all', label: 'Показать все записи' },
                        { value: 'upcoming', label: 'Только ожидание' },
                        { value: 'confirmed', label: 'Только подтвержденные' },
                        { value: 'arrived', label: 'Только завершенные' },
                        { value: 'no-show', label: 'Только неявки' },
                      ]}
                    />
                  </div>
                </section>

                <div className="space-y-3">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((item) => {
                      const status = getStatusMeta(item.status);
                      return (
                        <div
                          key={item.id}
                          className="w-full rounded-[24px] border border-[#e3e8ef] bg-white px-4 py-4 text-left shadow-[0_10px_24px_rgba(42,49,56,0.05)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[16px] font-extrabold text-ink">{item.serviceName || '—'}</p>
                              <p className="mt-1 text-sm font-semibold text-[#7d8693]">
                                {formatHistoryDate(item.startAt)} · {formatTime(item.startAt)}-{formatTime(item.endAt)}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#7d8693]">{item.staffName || '—'}</p>
                            </div>
                            <span className={clsx('inline-flex rounded-full px-3 py-1 text-xs font-extrabold', status.badgeClass)}>
                              {status.label}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#f4f6f9] px-3 py-1 text-[12px] font-bold text-[#5f6978]">
                              Стоимость: {formatGroupedRub(getAppointmentAmount(item))}
                            </span>
                            <span className="rounded-full bg-[#f4f6f9] px-3 py-1 text-[12px] font-bold text-[#5f6978]">
                              Оплачено: {formatGroupedRub(item.paidAmount ?? 0)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <section className="rounded-[24px] border border-[#e3e8ef] bg-white px-4 py-5 text-center shadow-[0_10px_24px_rgba(42,49,56,0.05)]">
                      <p className="text-lg font-extrabold text-ink">Нет записей</p>
                      <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                        Для выбранного фильтра история посещений пуста.
                      </p>
                    </section>
                  )}
                </div>
              </div>
            ) : null}

            {desktopTab === 'stats' ? (
              <div className="space-y-4 pt-4">
                <section className="rounded-[28px] border border-[#e3e8ef] bg-white p-4 shadow-[0_10px_24px_rgba(42,49,56,0.05)]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Статистика</p>
                      <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                        Аналитика клиента по данным журнала записей.
                      </p>
                    </div>
                    <div className="grid w-full gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">С</span>
                        <input
                          type="date"
                          value={statsFrom}
                          max={statsTo || undefined}
                          onChange={(event) => setStatsFrom(event.target.value)}
                          className="h-12 w-full rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-ink outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">До</span>
                        <input
                          type="date"
                          value={statsTo}
                          min={statsFrom || undefined}
                          onChange={(event) => setStatsTo(event.target.value)}
                          className="h-12 w-full rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-ink outline-none"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#e5e9f0] bg-[#f8fafc] px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Выручка</p>
                      <p className="mt-2 text-[24px] font-extrabold leading-none text-ink">
                        {formatGroupedRub(statsHistory.reduce((sum, item) => sum + getAppointmentAmount(item), 0))}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#e5e9f0] bg-[#f8fafc] px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Оплачено</p>
                      <p className="mt-2 text-[24px] font-extrabold leading-none text-ink">
                        {formatGroupedRub(statsHistory.reduce((sum, item) => sum + Math.max(item.paidAmount ?? 0, 0), 0))}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#e5e9f0] bg-[#f8fafc] px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Визиты</p>
                      <p className="mt-2 text-[24px] font-extrabold leading-none text-ink">{statsHistory.length}</p>
                    </div>
                    <div className="rounded-2xl border border-[#e5e9f0] bg-[#f8fafc] px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Неявки</p>
                      <p className="mt-2 text-[24px] font-extrabold leading-none text-ink">
                        {statsHistory.filter((item) => item.status === 'NO_SHOW').length}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Выручка по месяцам</p>
                        <p className="mt-2 text-sm font-semibold text-[#7d8693]">Динамика по выбранному периоду.</p>
                      </div>
                      <p className="text-sm font-extrabold text-ink">
                        {formatGroupedRub(statsSeries.reduce((sum, item) => sum + item.value, 0))}
                      </p>
                    </div>

                    <div className="mt-4 rounded-[20px] border border-[#e5e9f0] bg-white p-4">
                      {statsSeries.length > 0 ? (
                        <>
                          <svg viewBox="0 0 640 200" className="h-[180px] w-full">
                            <defs>
                              <linearGradient id="clientsStatsAreaMobile" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#f4c900" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#f4c900" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <polyline
                              fill="none"
                              stroke="#f4c900"
                              strokeWidth="4"
                              strokeLinejoin="round"
                              strokeLinecap="round"
                              points={statsPolyline}
                            />
                            <polyline
                              fill="url(#clientsStatsAreaMobile)"
                              stroke="none"
                              points={`${statsPolyline} 640,180 0,180`}
                            />
                          </svg>
                          <div className="mt-2 grid grid-cols-2 gap-3">
                            {statsSeries.map((item) => (
                              <div key={item.label} className="rounded-2xl border border-[#eef2f6] bg-[#f9fbfd] px-3 py-3">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">{item.label}</p>
                                <p className="mt-2 text-sm font-extrabold text-ink">{formatGroupedRub(item.value)}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm font-semibold text-[#7d8693]">Недостаточно данных для графика.</p>
                      )}
                    </div>
                  </div>
                </section>

                <div className="grid gap-4">
                  <DonutCard
                    title="Услуги"
                    items={activeStatsSummary?.topServices || []}
                    valueFormatter={(value) => formatGroupedRub(value)}
                  />
                  <DonutCard
                    title="Сотрудники"
                    items={activeStatsSummary?.topStaff || []}
                  />
                  <DonutCard
                    title="Статусы"
                    items={activeStatsSummary?.statusBreakdown || []}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </PageSheet>
      ) : null}

      {isDesktop && activeClient ? (
        <div
          className="fixed inset-0 z-[80] hidden bg-[rgba(34,43,51,0.18)] px-10 py-8 backdrop-blur-[2px] md:flex"
          onClick={handleCloseDesktopClient}
        >
          <div className="absolute right-14 top-10">
            <button
              type="button"
              onClick={handleCloseDesktopClient}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dde3eb] bg-white text-[#6e7784] shadow-[0_12px_30px_rgba(42,49,56,0.16)] transition hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <section
            className="mx-auto flex h-full w-full max-w-[1460px] overflow-hidden rounded-[36px] border border-[#dde3eb] bg-[#f8fafc] shadow-[0_30px_80px_rgba(32,39,48,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <aside className="flex w-[290px] shrink-0 flex-col border-r border-[#e2e7ef] bg-[#fcfdff] p-6">
              <div className="rounded-[28px] border border-[#e5e9f0] bg-[#f4f7fb] p-5">
                <div className="flex items-center gap-4">
                  {draft?.avatarUrl ? (
                    <img
                      src={draft.avatarUrl}
                      alt={activeClient.name}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl font-extrabold text-[#737d8b]">
                      {getClientInitials(activeClient.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[28px] font-extrabold leading-none text-ink">{activeClient.name}</p>
                    <p className="mt-2 truncate text-sm font-semibold text-[#7c8491]">
                      {activeClient.phone || 'Телефон не указан'}
                    </p>
                    {activeSummary ? (
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">
                        {activeSummary.totalVisits} визитов
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <nav className="mt-6 space-y-2">
                {[
                  { key: 'card', label: 'Карточка клиента', icon: UserRound },
                  { key: 'history', label: 'История посещений', icon: History },
                  { key: 'stats', label: 'Статистика', icon: ChartPie },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = desktopTab === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setDesktopTab(item.key as ClientModalTab)}
                      className={clsx(
                        'flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left transition',
                        active
                          ? 'bg-[#f4c900] text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.24)]'
                          : 'bg-[#f4f6f9] text-[#707a88] hover:bg-[#ebeff4] hover:text-ink',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className={clsx('text-[15px]', active ? 'font-extrabold' : 'font-semibold')}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-6 grid gap-3">
                <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Выручка</p>
                  <p className="mt-3 text-[26px] font-extrabold leading-none text-ink">
                    {activeSummary ? formatGroupedRub(activeSummary.totalRevenue) : '—'}
                  </p>
                </div>
                <div className="rounded-[24px] border border-[#e5e9f0] bg-white px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Последний визит</p>
                  <p className="mt-3 text-[18px] font-extrabold leading-snug text-ink">
                    {activeSummary?.lastVisit ? formatDateTime(activeSummary.lastVisit) : 'Нет визитов'}
                  </p>
                </div>
              </div>
            </aside>

            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex h-full flex-col">
                <div className="border-b border-[#e2e7ef] bg-white px-8 py-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Клиент</p>
                      <h2 className="mt-3 text-[40px] font-extrabold leading-[0.95] tracking-[-0.04em] text-ink">
                        {activeClient.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleCallClient}
                        disabled={!activeClient.phone}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f7f9fc] px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Phone className="h-4 w-4" />
                        Позвонить
                      </button>
                      <button
                        type="button"
                        onClick={handleSmsClient}
                        disabled={!activeClient.phone}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f7f9fc] px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <MessageSquare className="h-4 w-4" />
                        SMS
                      </button>
                      <button
                        type="button"
                        onClick={handleTelegramClient}
                        disabled={!activeClient.phone}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#222b33] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Телеграмм
                      </button>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
                  {desktopTab === 'card' ? (
                    <div className="space-y-6">
                      <section className="rounded-[30px] border border-[#e3e8ef] bg-white p-6">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Карточка клиента</p>
                            <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                              Основные данные клиента и быстрые показатели по журналу.
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {editMode ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditMode(false);
                                    setDiscountDirty(false);
                                    setDraft(mapClientToDraft(activeClient));
                                    setDraftError('');
                                  }}
                                  className="inline-flex h-11 items-center rounded-2xl border border-[#dde3eb] bg-[#f7f9fc] px-4 text-sm font-semibold text-ink"
                                >
                                  Отмена
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleSaveClient();
                                  }}
                                  disabled={draftSaving}
                                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#f4c900] px-4 text-sm font-extrabold text-[#222b33] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {draftSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                  Сохранить
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditMode(true)}
                                disabled={!canEdit}
                                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f7f9fc] px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <PencilLine className="h-4 w-4" />
                                Редактировать
                              </button>
                            )}
                          </div>
                        </div>

                        {draftError ? (
                          <div className="mt-4 rounded-2xl border border-[#f1d0c8] bg-[#fff4f0] px-4 py-3 text-sm font-semibold text-[#bc5941]">
                            {draftError}
                          </div>
                        ) : null}

                        <div className="mt-6 grid gap-5 2xl:grid-cols-[minmax(0,1.28fr)_320px]">
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="block">
                              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Имя</span>
                              <input
                                type="text"
                                value={draft?.name || ''}
                                onChange={(event) => handleDraftChange('name', event.target.value)}
                                disabled={!editMode || draftLoading}
                                className="h-14 w-full rounded-2xl border border-[#dce2ea] bg-[#f9fbfd] px-4 text-base font-semibold text-ink outline-none disabled:cursor-not-allowed disabled:opacity-80"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Телефон</span>
                              <input
                                type="text"
                                value={draft?.phone || ''}
                                onChange={(event) => handleDraftChange('phone', event.target.value)}
                                disabled={!editMode || draftLoading}
                                className="h-14 w-full rounded-2xl border border-[#dce2ea] bg-[#f9fbfd] px-4 text-base font-semibold text-ink outline-none disabled:cursor-not-allowed disabled:opacity-80"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Email</span>
                              <input
                                type="email"
                                value={draft?.email || ''}
                                onChange={(event) => handleDraftChange('email', event.target.value)}
                                disabled={!editMode || draftLoading}
                                className="h-14 w-full rounded-2xl border border-[#dce2ea] bg-[#f9fbfd] px-4 text-base font-semibold text-ink outline-none disabled:cursor-not-allowed disabled:opacity-80"
                              />
                            </label>
                            <div className="rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] px-4 py-4">
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Средний чек</p>
                              <p className="mt-3 text-[28px] font-extrabold leading-none text-ink">
                                {activeSummary ? formatGroupedRub(activeSummary.averageCheck) : '—'}
                              </p>
                            </div>
                            <div className="rounded-[28px] border border-[#e5e9f0] bg-[#f8fafc] p-5 md:col-span-2">
                              <div className="grid gap-4 2xl:grid-cols-2">
                                <div className="min-w-0 rounded-[24px] border border-[#e5e9f0] bg-white p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff5cf] text-[#9b7322]">
                                      <BadgePercent className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Постоянная скидка</p>
                                      <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                                        Процент скидки, который клиент увидит на сайте при оформлении записи.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-4 flex items-center gap-3">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="1"
                                      value={draft?.permanentDiscountPercent || ''}
                                      onChange={(event) => handlePermanentDiscountChange(event.target.value)}
                                      disabled={!editMode || draftLoading || !canManageDiscounts}
                                      placeholder="Например, 10"
                                      className="h-12 w-full rounded-2xl border border-[#dce2ea] bg-[#f9fbfd] px-4 text-base font-semibold text-ink outline-none disabled:cursor-not-allowed disabled:opacity-70"
                                    />
                                    <span className="text-sm font-extrabold text-[#738094]">%</span>
                                  </div>
                                  <p className="mt-3 text-xs font-semibold text-[#98a1ae]">
                                    Очистите поле, чтобы убрать постоянную скидку.
                                  </p>
                                </div>

                                <div className="min-w-0 rounded-[24px] border border-[#e5e9f0] bg-white p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#2d5fd6]">
                                      <Mail className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Отправить промокод</p>
                                      <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                                        Одноразовый промокод в процентах, отправляется клиенту на email.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-4 grid gap-3">
                                    <div>
                                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">Скидка</p>
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="number"
                                          min="1"
                                          max="100"
                                          step="1"
                                          value={promoDiscountPercent}
                                          onChange={(event) => setPromoDiscountPercent(event.target.value)}
                                          disabled={promoSending || !canManagePromocodes}
                                          placeholder="15"
                                          className="h-12 w-full rounded-2xl border border-[#dce2ea] bg-[#f9fbfd] px-4 text-base font-semibold text-ink outline-none disabled:cursor-not-allowed disabled:opacity-70"
                                        />
                                        <span className="text-sm font-extrabold text-[#738094]">%</span>
                                      </div>
                                    </div>
                                    <label className="block">
                                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">Действует до</span>
                                      <input
                                        type="date"
                                        value={promoExpiresOn}
                                        onChange={(event) => setPromoExpiresOn(event.target.value)}
                                        disabled={promoSending || !canManagePromocodes}
                                        className="h-12 w-full rounded-2xl border border-[#dce2ea] bg-[#f9fbfd] px-4 text-sm font-semibold text-ink outline-none disabled:cursor-not-allowed disabled:opacity-70"
                                      />
                                    </label>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleSendPromocode();
                                    }}
                                    disabled={promoSending || !canManagePromocodes}
                                    className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#f4c900] px-4 text-sm font-extrabold text-[#222b33] disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {promoSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                                    Отправить
                                  </button>
                                  <p className="mt-3 text-xs font-semibold text-[#98a1ae]">
                                    Email отправки: {draft?.email.trim() || activeClient.email || 'не указан'}
                                  </p>
                                  {promoError ? (
                                    <div className="mt-3 rounded-2xl border border-[#f1d0c8] bg-[#fff4f0] px-4 py-3 text-sm font-semibold text-[#bc5941]">
                                      {promoError}
                                    </div>
                                  ) : null}
                                  {promoResult ? (
                                    <div className="mt-3 rounded-2xl border border-[#d7eadf] bg-[#eef8f2] px-4 py-3 text-sm font-semibold text-[#2e7a4a]">
                                      Промокод <span className="font-extrabold">{promoResult.code}</span> отправлен на {promoResult.email}
                                      {promoResult.expiresAt
                                        ? `, действует до ${formatHistoryDate(new Date(promoResult.expiresAt))}`
                                        : ', без ограничения по дате'}
                                      .
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4">
                            <div className="rounded-[28px] border border-[#e5e9f0] bg-[#f8fafc] p-5">
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Аватар клиента</p>
                              <div className="mt-4 flex items-center gap-4">
                                {draft?.avatarUrl ? (
                                  <img
                                    src={draft.avatarUrl}
                                    alt={activeClient.name}
                                    className="h-24 w-24 rounded-[28px] border border-[#dde3eb] object-cover"
                                  />
                                ) : (
                                  <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-[#dde3eb] bg-white text-2xl font-extrabold text-[#737d8b]">
                                    {getClientInitials(activeClient.name)}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold leading-6 text-[#7d8693]">
                                    Фото клиента отображается в карточке и в личном кабинете.
                                  </p>
                                  {avatarBusy ? (
                                    <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#7d8693]">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Обновляю аватарку...
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              <input
                                ref={clientAvatarInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  event.target.value = '';
                                  if (!file) {
                                    return;
                                  }
                                  void handleUploadAvatar(file);
                                }}
                              />
                              {editMode ? (
                                <div className="mt-4 flex flex-wrap gap-3">
                                  <button
                                    type="button"
                                    onClick={handleOpenAvatarPicker}
                                    disabled={draftLoading || avatarBusy || !canManageAvatars}
                                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-4 text-sm font-semibold text-ink transition disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <ImagePlus className="h-4 w-4" />
                                    {draft?.avatarUrl ? 'Изменить фото' : 'Добавить фото'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleDeleteAvatar();
                                    }}
                                    disabled={draftLoading || avatarBusy || !canManageAvatars || !draft?.avatarUrl}
                                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#f1d0c8] bg-[#fff4f0] px-4 text-sm font-semibold text-[#bc5941] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Удалить фото
                                  </button>
                                </div>
                              ) : null}
                            </div>

                            <div className="rounded-[28px] border border-[#e5e9f0] bg-[#f8fafc] p-5">
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Комментарий</p>
                              <textarea
                                value={draft?.comment || ''}
                                onChange={(event) => handleDraftChange('comment', event.target.value)}
                                disabled={!editMode || draftLoading}
                                className="mt-4 h-[192px] w-full resize-none rounded-[24px] border border-[#dce2ea] bg-white px-4 py-4 text-base font-medium leading-7 text-ink outline-none disabled:cursor-not-allowed disabled:opacity-80"
                                placeholder="Комментарий по клиенту"
                              />
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="rounded-2xl border border-[#e5e9f0] bg-white px-4 py-3">
                                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Первый визит</p>
                                  <p className="mt-2 text-sm font-extrabold text-ink">{formatDateTime(activeSummary?.firstVisit || null)}</p>
                                </div>
                                <div className="rounded-2xl border border-[#e5e9f0] bg-white px-4 py-3">
                                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Последний визит</p>
                                  <p className="mt-2 text-sm font-extrabold text-ink">{formatDateTime(activeSummary?.lastVisit || null)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="grid gap-4 xl:grid-cols-4">
                        <div className="rounded-[28px] border border-[#e3e8ef] bg-white px-5 py-5">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Визитов</p>
                          <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{activeSummary?.totalVisits ?? 0}</p>
                        </div>
                        <div className="rounded-[28px] border border-[#e3e8ef] bg-white px-5 py-5">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Оплачено</p>
                          <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">
                            {formatGroupedRub(activeSummary?.totalPaid ?? 0)}
                          </p>
                        </div>
                        <div className="rounded-[28px] border border-[#e3e8ef] bg-white px-5 py-5">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Ожидают</p>
                          <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{activeSummary?.upcoming ?? 0}</p>
                        </div>
                        <div className="rounded-[28px] border border-[#e3e8ef] bg-white px-5 py-5">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Неявок</p>
                          <p className="mt-3 text-[34px] font-extrabold leading-none text-ink">{activeSummary?.noShows ?? 0}</p>
                        </div>
                      </section>

                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteActiveClient();
                          }}
                          disabled={draftSaving || loading}
                          className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-2xl border border-[#f1d0c8] bg-[#fff4f0] px-5 text-sm font-semibold text-[#bc5941] disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Удалить клиента
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {desktopTab === 'history' ? (
                    <section className="rounded-[30px] border border-[#e3e8ef] bg-white p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">История посещений</p>
                          <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                            Все записи клиента, найденные по ID и телефону в журнале.
                          </p>
                        </div>
                        <SelectField
                          value={historyFilter}
                          onChange={(next) => setHistoryFilter(next as HistoryFilter)}
                          options={[
                            { value: 'all', label: 'Показать все записи' },
                            { value: 'upcoming', label: 'Только ожидание' },
                            { value: 'confirmed', label: 'Только подтвержденные' },
                            { value: 'arrived', label: 'Только завершенные' },
                            { value: 'no-show', label: 'Только неявки' },
                          ]}
                        />
                      </div>

                      <div className="mt-6 overflow-hidden rounded-[26px] border border-[#edf1f5]">
                        <div className="grid grid-cols-[1.1fr_1fr_1fr_1.4fr_0.8fr_0.8fr] gap-4 bg-[#f7f9fc] px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">
                          <div>Дата</div>
                          <div>Сотрудник</div>
                          <div>Статус</div>
                          <div>Услуга</div>
                          <div>Стоимость</div>
                          <div>Оплачено</div>
                        </div>

                        <div className="max-h-[560px] overflow-y-auto">
                          {filteredHistory.length > 0 ? (
                            filteredHistory.map((item) => {
                              const status = getStatusMeta(item.status);
                              return (
                                <div
                                  key={item.id}
                                  className="grid grid-cols-[1.1fr_1fr_1fr_1.4fr_0.8fr_0.8fr] gap-4 border-t border-[#eef2f6] px-5 py-5 text-sm font-semibold text-[#55606f]"
                                >
                                  <div>
                                    <p className="font-extrabold text-ink">{formatHistoryDate(item.startAt)}</p>
                                    <p className="mt-1 text-[#7f8897]">{formatTime(item.startAt)}–{formatTime(item.endAt)}</p>
                                  </div>
                                  <div>{item.staffName || '—'}</div>
                                  <div>
                                    <span className={clsx('inline-flex rounded-full px-3 py-1 text-xs font-extrabold', status.badgeClass)}>
                                      {status.label}
                                    </span>
                                  </div>
                                  <div>{item.serviceName || '—'}</div>
                                  <div className="text-ink">{formatGroupedRub(getAppointmentAmount(item))}</div>
                                  <div className="text-ink">{formatGroupedRub(item.paidAmount ?? 0)}</div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-5 py-12 text-center">
                              <p className="text-lg font-extrabold text-ink">Нет записей</p>
                              <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                                Для выбранного фильтра история посещений пуста.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  ) : null}

                  {desktopTab === 'stats' ? (
                    <div className="space-y-6">
                      <section className="rounded-[30px] border border-[#e3e8ef] bg-white p-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Статистика</p>
                            <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                              Аналитика по клиенту строится по данным журнала записей.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="block">
                              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">С</span>
                              <input
                                type="date"
                                value={statsFrom}
                                max={statsTo || undefined}
                                onChange={(event) => setStatsFrom(event.target.value)}
                                className="h-12 rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-ink outline-none"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">До</span>
                              <input
                                type="date"
                                value={statsTo}
                                min={statsFrom || undefined}
                                onChange={(event) => setStatsTo(event.target.value)}
                                className="h-12 rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-ink outline-none"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="mt-6 grid gap-4 xl:grid-cols-5">
                          <div className="rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] px-5 py-4">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Выручка</p>
                            <p className="mt-3 text-[30px] font-extrabold leading-none text-ink">
                              {formatGroupedRub(statsHistory.reduce((sum, item) => sum + getAppointmentAmount(item), 0))}
                            </p>
                          </div>
                          <div className="rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] px-5 py-4">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Оплачено</p>
                            <p className="mt-3 text-[30px] font-extrabold leading-none text-ink">
                              {formatGroupedRub(statsHistory.reduce((sum, item) => sum + Math.max(item.paidAmount ?? 0, 0), 0))}
                            </p>
                          </div>
                          <div className="rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] px-5 py-4">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Визиты</p>
                            <p className="mt-3 text-[30px] font-extrabold leading-none text-ink">{statsHistory.length}</p>
                          </div>
                          <div className="rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] px-5 py-4">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Средний чек</p>
                            <p className="mt-3 text-[30px] font-extrabold leading-none text-ink">
                              {formatGroupedRub(
                                statsHistory.length > 0
                                  ? statsHistory.reduce((sum, item) => sum + getAppointmentAmount(item), 0) / statsHistory.length
                                  : 0,
                              )}
                            </p>
                          </div>
                          <div className="rounded-[24px] border border-[#e5e9f0] bg-[#f8fafc] px-5 py-4">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Неявки</p>
                            <p className="mt-3 text-[30px] font-extrabold leading-none text-ink">
                              {statsHistory.filter((item) => item.status === 'NO_SHOW').length}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 rounded-[28px] border border-[#e5e9f0] bg-[#f8fafc] p-5">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#98a1ae]">Выручка по месяцам</p>
                              <p className="mt-2 text-sm font-semibold text-[#7d8693]">
                                Динамика по выбранному периоду.
                              </p>
                            </div>
                            <p className="text-sm font-extrabold text-ink">
                              {formatGroupedRub(statsSeries.reduce((sum, item) => sum + item.value, 0))}
                            </p>
                          </div>

                          <div className="mt-5 rounded-[24px] border border-[#e5e9f0] bg-white p-4">
                            {statsSeries.length > 0 ? (
                              <>
                                <svg viewBox="0 0 640 200" className="h-[220px] w-full">
                                  <defs>
                                    <linearGradient id="clientsStatsArea" x1="0" x2="0" y1="0" y2="1">
                                      <stop offset="0%" stopColor="#f4c900" stopOpacity="0.35" />
                                      <stop offset="100%" stopColor="#f4c900" stopOpacity="0" />
                                    </linearGradient>
                                  </defs>
                                  <polyline
                                    fill="none"
                                    stroke="#f4c900"
                                    strokeWidth="4"
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                    points={statsPolyline}
                                  />
                                  <polyline
                                    fill="url(#clientsStatsArea)"
                                    stroke="none"
                                    points={`${statsPolyline} 640,180 0,180`}
                                  />
                                </svg>
                                <div className="mt-2 grid grid-cols-2 gap-3 xl:grid-cols-6">
                                  {statsSeries.map((item) => (
                                    <div key={item.label} className="rounded-2xl border border-[#eef2f6] bg-[#f9fbfd] px-3 py-3">
                                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#98a1ae]">{item.label}</p>
                                      <p className="mt-2 text-sm font-extrabold text-ink">{formatGroupedRub(item.value)}</p>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="text-sm font-semibold text-[#7d8693]">Недостаточно данных для графика.</p>
                            )}
                          </div>
                        </div>
                      </section>

                      <div className="grid gap-6 xl:grid-cols-3">
                        <DonutCard
                          title="Услуги"
                          items={activeStatsSummary?.topServices || []}
                          valueFormatter={(value) => formatGroupedRub(value)}
                        />
                        <DonutCard
                          title="Сотрудники"
                          items={activeStatsSummary?.topStaff || []}
                        />
                        <DonutCard
                          title="Статусы"
                          items={activeStatsSummary?.statusBreakdown || []}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
