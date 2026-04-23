import clsx from 'clsx';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Settings2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  HOUR_HEIGHT,
  JOURNAL_CARD_COLUMN_WIDTH,
  JOURNAL_GRID_GAP,
  JOURNAL_TIME_COLUMN_WIDTH,
} from '../constants';
import { formatDateLabel, formatRub, formatTime, toISODate } from '../helpers';
import type {
  AppointmentItem,
  JournalCard,
  JournalSettings,
  StaffItem,
  TabItem,
  TabKey,
  WorkingHoursMap,
} from '../types';
import { AppointmentCard } from '../components/shared/AppointmentCard';
import { JournalDatePickerSheet } from '../components/shared/JournalDatePickerSheet';
import { StaffChip } from '../components/shared/StaffChip';

type JournalTabScreenProps = {
  selectedDate: Date;
  staff: StaffItem[];
  mobileStaff: StaffItem[];
  journalHours: string[];
  workingHoursByStaff: WorkingHoursMap;
  cards: JournalCard[];
  listAppointments: AppointmentItem[];
  journalSettings: JournalSettings;
  loading: boolean;
  datePickerOpen: boolean;
  markedDates: string[];
  visibleTabs: TabItem[];
  activeTab: TabKey;
  showOwnerDaySummary: boolean;
  canCreate: boolean;
  canOpenSettings: boolean;
  canSelectPastDates: boolean;
  onSetDate: () => void;
  onCloseDatePicker: () => void;
  onSelectDate: (value: Date) => void;
  onCreate: () => void;
  onCreateAt: (staffId: string, startTime: string) => void;
  onReload: () => void;
  onSettings: () => void;
  onTabChange: (next: TabKey) => void;
  onStaffClick: (item: StaffItem) => void;
  onCardClick: (item: AppointmentItem) => void;
};

const DESKTOP_FILTER_INPUT_CLASS =
  'h-12 w-full rounded-2xl border border-[#dce2ea] bg-white px-4 text-sm font-semibold text-ink outline-none transition placeholder:text-[#a0a7b3] focus:border-[#b7c0cd]';
const JOURNAL_PAGE_SIZE = 25;
const JOURNAL_LIST_SKELETON_ROWS = 8;
const JOURNAL_SLOT_MINUTES = 30;
const JOURNAL_SLOT_HEIGHT = HOUR_HEIGHT / 2;

function timeValueToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}

function minutesToTimeValue(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function resolveDateFilterPreset(selectedDate: Date, preset: JournalSettings['defaultPeriod']) {
  if (preset === 'all') {
    return { dateFrom: '', dateTo: '' };
  }

  const end = new Date(selectedDate);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);

  if (preset === '7d') {
    start.setDate(start.getDate() - 6);
  } else if (preset === '30d') {
    start.setDate(start.getDate() - 29);
  }

  return {
    dateFrom: toISODate(start),
    dateTo: toISODate(end),
  };
}

function formatDurationLabel(startAt: Date, endAt: Date) {
  const minutes = Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (hours > 0 && restMinutes > 0) {
    return `${hours}ч ${restMinutes}м`;
  }
  if (hours > 0) {
    return `${hours}ч`;
  }
  return `${restMinutes}м`;
}

function normalizeJournalStatus(value: string) {
  if (value === 'ARRIVED' || value === 'NO_SHOW' || value === 'CONFIRMED') {
    return value;
  }
  return 'PENDING';
}

function journalStatusLabel(value: string) {
  if (value === 'ARRIVED') {
    return 'Пришел';
  }
  if (value === 'NO_SHOW') {
    return 'Не пришел';
  }
  if (value === 'CONFIRMED') {
    return 'Подтвержден';
  }
  return 'Ожидание';
}

function journalStatusClass(value: string) {
  if (value === 'ARRIVED') {
    return 'bg-[#dff4e5] text-[#1f7a38]';
  }
  if (value === 'NO_SHOW') {
    return 'bg-[#fbe1e1] text-[#b54848]';
  }
  if (value === 'CONFIRMED') {
    return 'bg-[#e3ecff] text-[#365fcb]';
  }
  return 'bg-[#fff3d4] text-[#8d6700]';
}

function JournalListSkeletonRow({ showAmount }: { showAmount: boolean }) {
  return (
    <div
      className={clsx(
        'grid w-full gap-4 px-6 py-5 md:grid-cols-[120px_repeat(2,minmax(0,1fr))]',
        showAmount
          ? 'xl:grid-cols-[110px_1.15fr_1fr_0.9fr_0.85fr_110px]'
          : 'xl:grid-cols-[110px_1.2fr_1fr_0.95fr_0.9fr]',
      )}
    >
      <div className="animate-pulse">
        <div className="h-8 w-16 rounded-full bg-[#e8edf3]" />
        <div className="mt-3 h-4 w-20 rounded-full bg-[#eef2f6]" />
      </div>

      <div className="animate-pulse">
        <div className="h-7 w-40 rounded-full bg-[#e8edf3]" />
        <div className="mt-3 h-4 w-28 rounded-full bg-[#eef2f6]" />
      </div>

      <div className="animate-pulse">
        <div className="h-6 w-44 rounded-full bg-[#e8edf3]" />
        <div className="mt-3 h-4 w-24 rounded-full bg-[#eef2f6]" />
      </div>

      <div className="animate-pulse">
        <div className="h-6 w-28 rounded-full bg-[#e8edf3]" />
        <div className="mt-3 h-4 w-20 rounded-full bg-[#eef2f6]" />
      </div>

      <div className="animate-pulse">
        <div className="h-10 w-28 rounded-full bg-[#eef2f6]" />
      </div>
      {showAmount ? (
        <div className="animate-pulse">
          <div className="h-6 w-16 rounded-full bg-[#e8edf3]" />
        </div>
      ) : null}
    </div>
  );
}

export function JournalTabScreen({
  selectedDate,
  staff,
  mobileStaff,
  journalHours,
  workingHoursByStaff,
  cards,
  listAppointments,
  journalSettings,
  loading,
  datePickerOpen,
  markedDates,
  visibleTabs,
  activeTab,
  showOwnerDaySummary,
  canCreate,
  canOpenSettings,
  canSelectPastDates,
  onSetDate,
  onCloseDatePicker,
  onSelectDate,
  onCreate,
  onCreateAt,
  onReload,
  onSettings,
  onTabChange,
  onStaffClick,
  onCardClick,
}: JournalTabScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');
  const [staffFilterId, setStaffFilterId] = useState('all');
  const [statusFilter, setStatusFilter] = useState<JournalSettings['defaultStatus']>(
    journalSettings.defaultStatus,
  );
  const initialDatePreset = resolveDateFilterPreset(selectedDate, journalSettings.defaultPeriod);
  const [dateFromFilter, setDateFromFilter] = useState(initialDatePreset.dateFrom);
  const [dateToFilter, setDateToFilter] = useState(initialDatePreset.dateTo);
  const [currentPage, setCurrentPage] = useState(1);
  const mobileStaffScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileGridScrollRef = useRef<HTMLDivElement | null>(null);
  const desktopGridClassName = journalSettings.showAmount
    ? 'xl:grid-cols-[110px_1.15fr_1fr_0.9fr_0.85fr_110px]'
    : 'xl:grid-cols-[110px_1.2fr_1fr_0.95fr_0.9fr]';
  const rowSpacingClassName = journalSettings.density === 'compact' ? 'py-4' : 'py-5';
  const timeTextClassName =
    journalSettings.density === 'compact'
      ? 'text-[24px] font-extrabold leading-none text-ink'
      : 'text-[28px] font-extrabold leading-none text-ink';
  const primaryTextClassName =
    journalSettings.density === 'compact'
      ? 'text-[18px] font-extrabold leading-tight text-ink'
      : 'text-[20px] font-extrabold leading-tight text-ink';
  const secondaryTextClassName = 'mt-2 text-sm font-semibold text-[#838b97]';

  const resolvedMobileStaff = useMemo(() => mobileStaff, [mobileStaff]);
  const mobileCards = useMemo(() => {
    const staffById = new Map(resolvedMobileStaff.map((item, index) => [item.id, index]));
    const staffByName = new Map(
      resolvedMobileStaff.map((item, index) => [item.name.trim().toLowerCase(), index]),
    );
    return cards
      .map((item) => {
        let column = staffById.get(item.staffId);
        if (column === undefined && item.staffName.trim()) {
          column = staffByName.get(item.staffName.trim().toLowerCase());
        }
        if (column === undefined) {
          return null;
        }
        return {
          ...item,
          left:
            JOURNAL_TIME_COLUMN_WIDTH +
            JOURNAL_GRID_GAP +
            column * (JOURNAL_CARD_COLUMN_WIDTH + JOURNAL_GRID_GAP),
        };
      })
      .filter(Boolean) as JournalCard[];
  }, [cards, resolvedMobileStaff]);
  const mobileColumnsCount = Math.max(1, resolvedMobileStaff.length);
  const mobileGridTemplateColumns = `${JOURNAL_TIME_COLUMN_WIDTH}px repeat(${mobileColumnsCount}, ${JOURNAL_CARD_COLUMN_WIDTH}px)`;
  const mobileMinWidth =
    JOURNAL_TIME_COLUMN_WIDTH +
    mobileColumnsCount * JOURNAL_CARD_COLUMN_WIDTH +
    (mobileColumnsCount + 1) * JOURNAL_GRID_GAP;
  const mobileTimeSlots = useMemo(() => {
    if (journalHours.length === 0) {
      return [];
    }
    const startMinutes = timeValueToMinutes(journalHours[0]);
    const endMinutes = timeValueToMinutes(journalHours[journalHours.length - 1]) + 60;
    const slots: string[] = [];
    for (let minutes = startMinutes; minutes < endMinutes; minutes += JOURNAL_SLOT_MINUTES) {
      slots.push(minutesToTimeValue(minutes));
    }
    return slots;
  }, [journalHours]);
  const selectedDateIso = toISODate(selectedDate);
  const isStaffWorkingAt = (staffId: string, time: string) => {
    const slotStart = timeValueToMinutes(time);
    const intervals = workingHoursByStaff[staffId]?.[selectedDateIso] ?? [];
    return intervals.some((interval) => {
      const intervalStart = timeValueToMinutes(interval.start);
      const intervalEnd = timeValueToMinutes(interval.end);
      return slotStart >= intervalStart && slotStart < intervalEnd;
    });
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const normalizedServiceQuery = serviceQuery.trim().toLowerCase();
  const filteredCards = useMemo(
    () =>
      [...listAppointments]
        .sort((left, right) => {
          const startDiff = right.startAt.getTime() - left.startAt.getTime();
          if (startDiff !== 0) {
            return startDiff;
          }
          return right.createdAt.getTime() - left.createdAt.getTime();
        })
        .filter((item) => {
          const normalizedStatus = normalizeJournalStatus(item.status);
          const itemDate = toISODate(item.startAt);
          const searchable = [
            item.clientName,
            item.clientPhone,
            item.serviceName,
            item.staffName,
          ]
            .join(' ')
            .toLowerCase();
          const matchesSearch =
            normalizedSearchQuery.length === 0 || searchable.includes(normalizedSearchQuery);
          const matchesService =
            normalizedServiceQuery.length === 0 ||
            (item.serviceName || '').toLowerCase().includes(normalizedServiceQuery);
          const matchesStaff = staffFilterId === 'all' || item.staffId === staffFilterId;
          const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
          const matchesDateFrom = !dateFromFilter || itemDate >= dateFromFilter;
          const matchesDateTo = !dateToFilter || itemDate <= dateToFilter;
          return (
            matchesSearch &&
            matchesService &&
            matchesStaff &&
            matchesStatus &&
            matchesDateFrom &&
            matchesDateTo
          );
        }),
    [
      listAppointments,
      normalizedSearchQuery,
      normalizedServiceQuery,
      staffFilterId,
      statusFilter,
      dateFromFilter,
      dateToFilter,
    ],
  );

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / JOURNAL_PAGE_SIZE));
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * JOURNAL_PAGE_SIZE;
    return filteredCards.slice(start, start + JOURNAL_PAGE_SIZE);
  }, [currentPage, filteredCards]);
  const visiblePaginationPages = useMemo(() => {
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedDate,
    normalizedSearchQuery,
    normalizedServiceQuery,
    staffFilterId,
    statusFilter,
    dateFromFilter,
    dateToFilter,
  ]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setStatusFilter(journalSettings.defaultStatus);
  }, [journalSettings.defaultStatus]);

  useEffect(() => {
    const nextPreset = resolveDateFilterPreset(selectedDate, journalSettings.defaultPeriod);
    setDateFromFilter(nextPreset.dateFrom);
    setDateToFilter(nextPreset.dateTo);
  }, [journalSettings.defaultPeriod, selectedDate]);

  useEffect(() => {
    const staffScroller = mobileStaffScrollRef.current;
    const gridScroller = mobileGridScrollRef.current;
    if (!staffScroller || !gridScroller) {
      return;
    }

    let activeSource: 'staff' | 'grid' | null = null;
    let scrollFrame = 0;

    const syncScroll = (
      source: HTMLDivElement,
      target: HTMLDivElement,
      sourceName: 'staff' | 'grid',
      targetName: 'staff' | 'grid',
    ) => {
      if (activeSource === targetName) {
        return;
      }
      activeSource = sourceName;
      if (scrollFrame) {
        window.cancelAnimationFrame(scrollFrame);
      }
      scrollFrame = window.requestAnimationFrame(() => {
        target.scrollLeft = source.scrollLeft;
        activeSource = null;
        scrollFrame = 0;
      });
    };

    const handleStaffScroll = () => {
      syncScroll(staffScroller, gridScroller, 'staff', 'grid');
    };

    const handleGridScroll = () => {
      syncScroll(gridScroller, staffScroller, 'grid', 'staff');
    };

    staffScroller.addEventListener('scroll', handleStaffScroll, { passive: true });
    gridScroller.addEventListener('scroll', handleGridScroll, { passive: true });
    staffScroller.scrollLeft = gridScroller.scrollLeft;

    return () => {
      if (scrollFrame) {
        window.cancelAnimationFrame(scrollFrame);
      }
      staffScroller.removeEventListener('scroll', handleStaffScroll);
      gridScroller.removeEventListener('scroll', handleGridScroll);
    };
  }, [mobileMinWidth]);

  return (
    <>
      <div className="pb-5 md:hidden">
        <div className="sticky top-0 z-[70] -mx-6 border-b border-line bg-screen/95 px-6 py-3 backdrop-blur">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onSetDate}
              className="flex items-center gap-2 text-[24px] font-bold text-ink"
            >
              {formatDateLabel(selectedDate)}
              <ChevronDown className="h-6 w-6 text-[#ebaf00]" />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onReload}
                className="flex items-center gap-2 rounded-2xl bg-[#e6e9ef] px-3 py-2 text-[14px] font-semibold text-ink"
              >
                <RefreshCcw className="h-4 w-4 text-[#8892a2]" />
                Обновить
              </button>
              <button
                type="button"
                onClick={onSettings}
                disabled={!canOpenSettings}
                className="rounded-xl p-2 text-ink disabled:opacity-40"
              >
                <Settings2 className="h-6 w-6 text-ink" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-line">
          <div
            ref={mobileStaffScrollRef}
            className="scrollbar-hidden momentum-scroll sticky top-[65px] z-[60] overflow-x-auto bg-screen/95 pb-2 backdrop-blur"
          >
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: mobileGridTemplateColumns, minWidth: mobileMinWidth }}
            >
              <div className="sticky left-0 z-30 bg-screen/95">
                <button
                  type="button"
                  onClick={onCreate}
                  disabled={!canCreate}
                  className="w-full text-4xl font-normal leading-none text-accent disabled:opacity-35"
                >
                  +
                </button>
              </div>
              {Array.from({ length: mobileColumnsCount }).map((_, index) => {
                const item = resolvedMobileStaff[index];
                if (!item) {
                  return <div key={`staff-placeholder-${index}`} />;
                }
                return (
                  <div key={item.id} className="flex justify-center">
                    <StaffChip
                      title={item.name}
                      badge={item.name.charAt(0).toUpperCase()}
                      avatarUrl={item.avatarUrl}
                      isUser={index === 0}
                      onClick={() => onStaffClick(item)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div ref={mobileGridScrollRef} className="scrollbar-hidden momentum-scroll overflow-x-auto pb-3">
            <div className="relative pb-3" style={{ minWidth: mobileMinWidth }}>
              <div className="grid gap-2" style={{ gridTemplateColumns: mobileGridTemplateColumns }}>
                <div className="sticky left-0 z-20 space-y-0 bg-screen pr-2">
                  {mobileTimeSlots.map((time) => (
                    <div key={time} className="border-t border-[#dce1e8] pt-1 text-[15px] font-medium text-ink" style={{ height: JOURNAL_SLOT_HEIGHT }}>
                      {time}
                    </div>
                  ))}
                </div>
                {Array.from({ length: mobileColumnsCount }).map((_, colIndex) => (
                  <div key={colIndex} className="space-y-0">
                    {mobileTimeSlots.map((time) => {
                      const item = resolvedMobileStaff[colIndex];
                      const isWorking = item ? isStaffWorkingAt(item.id, time) : false;
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            if (item && canCreate) {
                              onCreateAt(item.id, time);
                            }
                          }}
                          disabled={!item || !canCreate}
                          className={clsx(
                            'block w-full border-t border-[#dce1e8] text-left transition',
                            isWorking
                              ? 'bg-[#eef8f2] hover:bg-[#e0f3e8]'
                              : 'bg-[repeating-linear-gradient(135deg,#f4f6f9_0px,#f4f6f9_7px,#e8edf4_7px,#e8edf4_14px)] opacity-75 hover:opacity-100',
                          )}
                          style={{ height: JOURNAL_SLOT_HEIGHT }}
                          aria-label={`${item?.name || 'Сотрудник'}, ${time}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {mobileCards.map((card) => (
                <AppointmentCard
                  key={card.id}
                  width={JOURNAL_CARD_COLUMN_WIDTH}
                  left={card.left}
                  top={card.top}
                  height={card.height}
                  time={card.timeLabel}
                  topTone={card.topTone}
                  client={card.clientName}
                  phone={card.clientPhone}
                  showPhone={journalSettings.showClientPhone}
                  service={card.serviceName}
                  onClick={() => onCardClick(card)}
                />
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Синхронизация с сервером...
          </div>
        ) : null}
      </div>

      <div className="hidden pb-6 md:block">
        <section className="min-w-0">
          <div className="rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] p-6 shadow-[0_18px_40px_rgba(42,49,56,0.08)] lg:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">
                  Журнал
                </p>
                <h1 className="mt-3 text-[48px] font-extrabold leading-[0.94] tracking-[-0.04em] text-ink">
                  Записи
                </h1>
                <p className="mt-3 text-base font-semibold text-[#717986]">
                  Полный список записей за все дни. Сверху новые, ниже более ранние.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onReload}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-semibold text-ink"
                >
                  <RefreshCcw className="h-4 w-4 text-[#8892a2]" />
                  Обновить
                </button>
                <button
                  type="button"
                  onClick={onSettings}
                  disabled={!canOpenSettings}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-[#f6f8fb] px-4 text-sm font-semibold text-ink disabled:opacity-45"
                >
                  <Settings2 className="h-4 w-4 text-[#8892a2]" />
                  Настройки
                </button>
                <button
                  type="button"
                  onClick={onCreate}
                  disabled={!canCreate}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#f4c900] px-5 text-sm font-extrabold text-[#222b33] shadow-[0_12px_26px_rgba(244,201,0,0.28)] disabled:opacity-45"
                >
                  <Plus className="h-4 w-4" />
                  Новая запись
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.8fr))]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a0ac]" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Имя клиента, телефон, услуга"
                  className={`${DESKTOP_FILTER_INPUT_CLASS} pl-11`}
                />
              </label>

              <select
                value={staffFilterId}
                onChange={(event) => setStaffFilterId(event.target.value)}
                className={DESKTOP_FILTER_INPUT_CLASS}
              >
                <option value="all">Все сотрудники</option>
                {staff.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as JournalSettings['defaultStatus'])
                }
                className={DESKTOP_FILTER_INPUT_CLASS}
              >
                <option value="all">Все статусы</option>
                <option value="PENDING">Ожидание</option>
                <option value="CONFIRMED">Подтверждены</option>
                <option value="ARRIVED">Пришли</option>
                <option value="NO_SHOW">Не пришли</option>
              </select>

              <input
                value={serviceQuery}
                onChange={(event) => setServiceQuery(event.target.value)}
                placeholder="Фильтр по услуге"
                className={DESKTOP_FILTER_INPUT_CLASS}
              />
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">
                  С даты записи
                </span>
                <input
                  type="date"
                  value={dateFromFilter}
                  max={dateToFilter || undefined}
                  onChange={(event) => setDateFromFilter(event.target.value)}
                  className={DESKTOP_FILTER_INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#8d95a1]">
                  По дату записи
                </span>
                <input
                  type="date"
                  value={dateToFilter}
                  min={dateFromFilter || undefined}
                  onChange={(event) => setDateToFilter(event.target.value)}
                  className={DESKTOP_FILTER_INPUT_CLASS}
                />
              </label>
            </div>
          </div>

          <div className="mt-5 rounded-[32px] border border-[#e2e6ed] bg-[#fcfcfd] shadow-[0_18px_40px_rgba(42,49,56,0.08)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#e7ebf0] px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8d95a1]">
                  {`Список записей: ${loading && filteredCards.length === 0 ? '—' : filteredCards.length}`}
                </p>
              </div>
              {!loading && filteredCards.length > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-[#f5f7fa] px-4 py-2 text-sm font-semibold text-[#6f7784]">
                  {`Страница ${currentPage} из ${totalPages}`}
                </div>
              ) : null}
            </div>

            <div
              className={clsx(
                'hidden border-b border-[#eef2f6] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#97a0ad] xl:grid xl:gap-4',
                desktopGridClassName,
              )}
            >
              <span>Время</span>
              <span>Клиент</span>
              <span>Услуга</span>
              <span>Сотрудник</span>
              <span>Статус</span>
              {journalSettings.showAmount ? <span>Сумма</span> : null}
            </div>

            {loading ? (
              <div className="divide-y divide-[#eef2f6]">
                {Array.from({ length: JOURNAL_LIST_SKELETON_ROWS }).map((_, index) => (
                  <JournalListSkeletonRow
                    key={`journal-skeleton-${index}`}
                    showAmount={journalSettings.showAmount}
                  />
                ))}
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-[28px] font-extrabold text-ink">Записей не найдено</p>
                <p className="mt-3 text-base font-semibold text-[#7d8693]">
                  Измените фильтры поиска или дождитесь загрузки списка.
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-[#eef2f6]">
                  {paginatedCards.map((card) => {
                    const normalizedStatus = normalizeJournalStatus(card.status);
                    const amount = card.amountAfterDiscount ?? card.amountBeforeDiscount;
                    const serviceMeta = `${formatTime(card.startAt)}-${formatTime(card.endAt)} • ${formatDurationLabel(
                      card.startAt,
                      card.endAt,
                    )}`;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => onCardClick(card)}
                        className={clsx(
                          'grid w-full gap-4 px-6 text-left transition hover:bg-[#f7f9fc] md:grid-cols-[120px_repeat(2,minmax(0,1fr))] xl:gap-4',
                          rowSpacingClassName,
                          desktopGridClassName,
                        )}
                      >
                        <div>
                          <p className={timeTextClassName}>{formatTime(card.startAt)}</p>
                          <p className={secondaryTextClassName}>
                            {formatDateLabel(card.startAt)}
                          </p>
                        </div>

                        <div>
                          <p className={primaryTextClassName}>
                            {card.clientName || 'Клиент'}
                          </p>
                          {journalSettings.showClientPhone ? (
                            <p className={secondaryTextClassName}>
                              {card.clientPhone || 'Телефон не указан'}
                            </p>
                          ) : null}
                        </div>

                        <div>
                          <p className="text-[18px] font-bold leading-tight text-ink">
                            {card.serviceName || 'Без услуги'}
                          </p>
                          {journalSettings.showServiceTime ? (
                            <p className={secondaryTextClassName}>{serviceMeta}</p>
                          ) : null}
                        </div>

                        <div>
                          <p className="text-[18px] font-bold leading-tight text-ink">{card.staffName}</p>
                          {journalSettings.showCreatedDate ? (
                            <p className={secondaryTextClassName}>
                              {card.createdAt.toLocaleDateString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </p>
                          ) : null}
                        </div>

                        <div>
                          <span
                            className={clsx(
                              'inline-flex rounded-full px-3 py-2 text-sm font-extrabold',
                              journalStatusClass(normalizedStatus),
                            )}
                          >
                            {journalStatusLabel(normalizedStatus)}
                          </span>
                        </div>

                        {journalSettings.showAmount ? (
                          <div>
                            <p className="text-[18px] font-extrabold text-ink">
                              {amount !== null ? formatRub(amount) : '—'}
                            </p>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {totalPages > 1 ? (
                  <div className="flex items-center justify-between gap-4 border-t border-[#eef2f6] px-6 py-4">
                    <p className="text-sm font-semibold text-[#7a8290]">
                      {`Показаны ${paginatedCards.length} из ${filteredCards.length}`}
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-3 text-sm font-semibold text-ink transition hover:border-[#c8d0db] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Назад
                      </button>

                      <div className="flex items-center gap-2">
                        {visiblePaginationPages.map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={clsx(
                              'inline-flex h-10 min-w-10 items-center justify-center rounded-2xl px-3 text-sm font-extrabold transition',
                              page === currentPage
                                ? 'bg-[#222b33] text-white shadow-[0_10px_24px_rgba(34,43,51,0.16)]'
                                : 'border border-[#dde3eb] bg-white text-ink hover:border-[#c8d0db]',
                            )}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dde3eb] bg-white px-3 text-sm font-semibold text-ink transition hover:border-[#c8d0db] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Вперед
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>

      <JournalDatePickerSheet
        open={datePickerOpen}
        selectedDate={selectedDate}
        markedDates={markedDates}
        allowPastDates={canSelectPastDates}
        onClose={onCloseDatePicker}
        onSelectDate={onSelectDate}
      />
    </>
  );
}
